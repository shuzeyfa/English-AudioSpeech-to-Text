"use client"

import { Mic, Square, Upload, AudioLines, RotateCcw } from "lucide-react";
import { useState, useRef } from "react";
import { SiteNav } from "../components/site-nav";

// Languages the user can pick. "auto" lets the server detect from the transcript.
const LANGUAGES = [
  { code: "auto", label: "Auto Detect" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "ur", label: "اردو (Urdu)" },
] as const

type LanguageCode = (typeof LANGUAGES)[number]["code"]

// Shape of a successful /api/transcribe response.
interface TranscribeResult {
  transcript: string   // original-language transcript from Whisper
  language: string     // resolved language code (en | ar | ur)
  english?: string     // English pivot text (only for ar/ur audio)
  amharic: string      // final Amharic translation from Addis AI
}

export default function App() {

  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState<LanguageCode>("auto")
  const [result, setResult] = useState<TranscribeResult | null>(null)
  const [error, setError] = useState<string>("")
  const [loading, setloading] = useState<boolean>(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [isRecording, setIsRecording] = useState(false)


  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f);
  }

  // Reset everything so the user can transcribe another file.
  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError("")
  }


  const startRecording = async () => {
      //the process is like this
      // 1 - get permission
      // 2 - Create a recorder from the microphone
      // 3 - Prepare storage for audio pieces
      // 4 - Collect audio chunks while recording
      // 5 - when stop, Combine all chunks into ONE audio, Turn the Blob into a File and Save it for transcription then Stop the microphone
      try {

        // to get the permission from browser, it will ask user permission when run
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // second step
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          })

          const audioFile = new File([audioBlob], "recording.webm", {
            type: "audio/webm",
          })

          setFile(audioFile);

          await handleTranscribe(audioFile);

          stream.getTracks().forEach((track) => track.stop());
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error("Mic error:", err)
        alert("Microphone permission denied")
      }
    }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false);
  }



  async function handleTranscribe(audioFile?: File) {
    const finalFile = audioFile ?? file;
    if (!finalFile) return

    try {
      setloading(true)
      setError("")
      setResult(null)

      // Send the audio + selected language as multipart form data.
      const formData = new FormData()
      formData.append("audio", finalFile)
      formData.append("language", language)

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.")
        return
      }

      setResult(data)
    } catch (err) {
      console.error(err)
      setError("Something went wrong. Please try again.")
    } finally {
      setloading(false)
    }
  }


  const languageLabel = (code: string) =>
    LANGUAGES.find((l) => l.code === code)?.label ?? code



  return (
    <div className="min-h-screen bg-primary text-text font-sans">

      <SiteNav current="/translate" />

      {/* Header */}
      <header className="border-b border-white/15">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 border border-white/20 rounded-sm flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold tracking-tight leading-none">
              Speech to Amharic
            </h1>
            <p className="font-mono text-[11px] text-white/50 mt-1.5 uppercase tracking-wider">
              en · ar · ur → am
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Input section ─────────────────────────────────────────── */}
        {!file && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                Input
              </h2>

              {/* Language selector — a compact control on the section rail */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="language-select"
                  className="font-mono text-[11px] uppercase tracking-wider text-white/50"
                >
                  Language
                </label>
                <select
                  id="language-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="h-8 px-2 rounded-sm bg-secondary text-sm text-text border border-white/20 hover:border-white/40 hover:cursor-pointer focus:outline-none focus:border-pulse"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload drop target — dashed border reserved for this control only */}
            <label
              htmlFor="audio-upload"
              className="flex flex-col items-center gap-4 py-14 px-6 rounded-md border border-dashed border-white/25 bg-secondary hover:border-white/50 hover:cursor-pointer transition-colors duration-150 group"
            >
              <input onChange={handleUpload} id="audio-upload" accept="audio/mpeg,audio/wav,.mp3,.wav" className="hidden" type="file" />

              <div className="w-12 h-12 rounded-sm border border-white/20 group-hover:border-white/40 flex items-center justify-center transition-colors duration-150">
                <Upload className="w-5 h-5 text-white/80" />
              </div>

              <div className="text-center">
                <div className="font-medium">Upload audio file</div>
                <div className="text-sm text-white/50 mt-1">
                  English, Arabic or Urdu speech — drag &amp; drop or browse
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-white/50 border border-white/15 rounded-sm px-2.5 py-1.5">
                <AudioLines className="w-3.5 h-3.5" /> mp3 · wav
              </div>
            </label>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 border-t border-white/15" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">or</span>
              <div className="flex-1 border-t border-white/15" />
            </div>

            {/* Record control — a button, not a hero */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`
                w-full h-12 px-4
                flex items-center justify-center gap-2.5
                rounded-md border font-medium
                transition-colors duration-150
                ${isRecording
                  ? "border-red-500/60 bg-red-950/40 text-red-200 hover:bg-red-950/60"
                  : "border-white/20 bg-secondary text-text hover:border-white/40"}
              `}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isRecording ? "Stop recording" : "Record from microphone"}</span>
            </button>
          </section>
        )}

        {/* ── Output section ────────────────────────────────────────── */}
        {file && (
          <div className="space-y-8">

            {/* Control bar: file identity + actions */}
            <section>
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-white/50 mb-4">
                Audio
              </h2>

              <div className="flex flex-wrap items-center gap-3 border border-white/15 bg-secondary rounded-md px-4 py-3">
                <AudioLines className="w-4 h-4 text-white/60 shrink-0" />
                <span className="font-mono text-sm text-white/80 truncate flex-1 min-w-0">
                  {file.name}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTranscribe()}
                    disabled={loading}
                    className="h-9 px-4 rounded-sm bg-text text-primary text-sm font-semibold hover:cursor-pointer hover:bg-white disabled:opacity-50 transition-colors duration-150"
                  >
                    {loading ? "Working…" : "Transcribe & Translate"}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="h-9 px-3 rounded-sm border border-white/20 text-sm text-white/80 hover:cursor-pointer hover:border-white/40 disabled:opacity-50 transition-colors duration-150 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Start over
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="mt-3 border border-red-500/40 bg-red-950/30 text-red-200 text-sm rounded-md px-4 py-3">
                  {error}
                </p>
              )}
            </section>

            {/* Primary output: Amharic — the reason the app exists */}
            <section>
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-pulse mb-4">
                Amharic — አማርኛ
              </h2>

              <div className="border-l-2 border-pulse bg-secondary rounded-md px-6 py-6">
                <p className="text-2xl leading-relaxed min-h-24">
                  {result?.amharic || (
                    <span className="text-white/40 text-base">
                      {loading ? "Translating to Amharic…" : "የአማርኛ ትርጉም እዚህ ይታያል…"}
                    </span>
                  )}
                </p>
              </div>
            </section>

            {/* Secondary output: source text */}
            <section>
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-white/50 mb-4">
                Source
              </h2>

              <div className="border border-white/15 rounded-md divide-y divide-white/15">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                      Transcript
                    </span>
                    {result && (
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-sm border border-white/20 text-white/70">
                        {languageLabel(result.language)}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm text-white/80 leading-relaxed"
                    dir={result && (result.language === "ar" || result.language === "ur") ? "rtl" : "ltr"}
                  >
                    {result?.transcript || (
                      <span className="text-white/40">
                        {loading ? "Listening to your audio…" : "Your transcript will appear here…"}
                      </span>
                    )}
                  </p>
                </div>

                {/* English pivot — only present for Arabic/Urdu audio */}
                {result?.english && (
                  <div className="px-4 py-3">
                    <div className="mb-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                        English
                      </span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{result.english}</p>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}

      </main>
    </div>
  );
}
