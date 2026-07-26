import { NextResponse } from "next/server"
import AddisAI from "addisai"

// Whisper + up to two translation hops can be slow — allow up to 60s on Vercel.
export const maxDuration = 60

// ---------------------------------------------------------------------------
// Pipeline:
//   1. Whisper STT (free, Hugging Face Inference API) -> original transcript
//   2. Resolve spoken language (user selection, or detect from the script)
//   3. Arabic/Urdu -> English pivot (free Helsinki-NLP models on Hugging Face)
//      — required because Addis AI only translates between en / am / om
//   4. English -> Amharic via Addis AI (addis.translate.create)
//
// Both API keys (HF_TOKEN, ADDIS_API_KEY) are read from server-side env vars
// and never reach the browser.
// ---------------------------------------------------------------------------

const HF_BASE = "https://router.huggingface.co/hf-inference/models"
const WHISPER_MODEL = "openai/whisper-large-v3"

// Free text-translation models used to pivot ar/ur transcripts to English.
const PIVOT_MODELS: Record<string, string> = {
  ar: "Helsinki-NLP/opus-mt-ar-en",
  ur: "Helsinki-NLP/opus-mt-ur-en",
}

const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // 25 MB

type SpokenLanguage = "en" | "ar" | "ur"

// Lazily create the Addis AI client so a missing key fails per-request
// (with a clear message) instead of crashing the module at build time.
let addisClient: AddisAI | null = null
function getAddis(): AddisAI {
  if (!addisClient) {
    addisClient = new AddisAI({ apiKey: process.env.ADDIS_API_KEY })
  }
  return addisClient
}

/**
 * Guess the transcript's language from its script.
 * Urdu is written in Arabic script but uses letters Arabic doesn't have
 * (ٹ ڈ ڑ ں ے پ چ گ ژ ھ), so check for those first.
 */
function detectLanguage(text: string): SpokenLanguage {
  if (/[ٹڈڑںےپچگژھ]/.test(text)) return "ur"
  if (/[؀-ۿ]/.test(text)) return "ar"
  return "en"
}

/** Call a Hugging Face Inference API model, throwing a readable error on failure. */
async function hfFetch(model: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(`${HF_BASE}/${model}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`HF ${model} error ${res.status}:`, body.slice(0, 500))
    if (res.status === 503) {
      throw new Error("The speech model is warming up — please retry in ~30 seconds.")
    }
    throw new Error(`Hugging Face request failed (${res.status}).`)
  }
  return res.json()
}

/** Step 1 — speech-to-text with Whisper (free via Hugging Face). */
async function transcribe(audio: File): Promise<string> {
  const data = (await hfFetch(WHISPER_MODEL, {
    method: "POST",
    headers: { "Content-Type": audio.type || "application/octet-stream" },
    body: Buffer.from(await audio.arrayBuffer()),
  })) as { text?: string }
  return (data.text ?? "").trim()
}

/**
 * Split long text into sentence-based chunks so each request stays inside the
 * opus-mt models' ~512-token input limit. Splits on ., !, ?, ؟ (Arabic) and ۔ (Urdu).
 */
function chunkSentences(text: string, maxLen = 400): string[] {
  const sentences = text.split(/(?<=[.!?؟۔])\s+/)
  const chunks: string[] = []
  let current = ""
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxLen) {
      chunks.push(current)
      current = sentence
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }
  if (current) chunks.push(current)
  return chunks
}

/** Step 3 — pivot Arabic/Urdu text to English with free Helsinki-NLP models. */
async function toEnglish(text: string, language: SpokenLanguage): Promise<string> {
  if (language === "en") return text
  const model = PIVOT_MODELS[language]
  const translated = await Promise.all(
    chunkSentences(text).map(async (chunk) => {
      const data = (await hfFetch(model, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: chunk }),
      })) as Array<{ translation_text?: string }>
      return data?.[0]?.translation_text ?? ""
    })
  )
  return translated.join(" ").trim()
}

export async function POST(req: Request) {
  try {
    // Fail fast with a clear message if the server isn't configured.
    if (!process.env.HF_TOKEN || !process.env.ADDIS_API_KEY) {
      console.error("Missing HF_TOKEN or ADDIS_API_KEY environment variable.")
      return NextResponse.json(
        { error: "Server is not configured for transcription." },
        { status: 500 }
      )
    }

    const form = await req.formData()
    const audio = form.get("audio")
    const requested = form.get("language")

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "No audio file received." }, { status: 400 })
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Audio file is larger than the 25 MB limit." },
        { status: 413 }
      )
    }

    // 1. Speech-to-text (Whisper auto-detects the spoken language).
    const transcript = await transcribe(audio)
    if (!transcript) {
      return NextResponse.json(
        { error: "No speech detected in the audio." },
        { status: 422 }
      )
    }

    // 2. The user's explicit selection wins; otherwise detect from the script.
    const language: SpokenLanguage =
      requested === "en" || requested === "ar" || requested === "ur"
        ? requested
        : detectLanguage(transcript)

    // 3. Pivot to English when needed (Addis AI translates en <-> am only).
    const english = await toEnglish(transcript, language)
    if (!english) {
      return NextResponse.json(
        { error: "Could not translate the transcript to English." },
        { status: 502 }
      )
    }

    // 4. English -> Amharic with Addis AI. The key never leaves the server.
    const translation = await getAddis().translate.create({
      text: english,
      from: "en",
      to: "am",
    })

    return NextResponse.json({
      transcript,                                        // original-language text
      language,                                          // resolved language code
      english: language === "en" ? undefined : english,  // pivot text for ar/ur
      amharic: translation.text,                         // final Amharic output
    })
  } catch (err) {
    console.error("Transcription pipeline error:", err)
    const message =
      err instanceof Error ? err.message : "Transcription failed. Please try again."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
