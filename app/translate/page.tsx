"use client"

import {
  AudioLines,
  Check,
  Copy,
  FileAudio,
  LoaderCircle,
  Mic,
  RotateCcw,
  Square,
  Upload,
} from "lucide-react"
import { ChangeEvent, DragEvent, useRef, useState } from "react"
import { SiteNav } from "../components/site-nav"

const LANGUAGES = [
  { code: "auto", label: "Auto detect" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "ur", label: "اردو (Urdu)" },
] as const

const ACCEPTED_AUDIO_TYPES = "audio/mpeg,audio/wav,audio/webm,audio/mp4,.mp3,.wav,.webm,.m4a"
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

type LanguageCode = (typeof LANGUAGES)[number]["code"]

interface TranscribeResult {
  transcript: string
  language: string
  english?: string
  amharic: string
}

function CopyButton({ value, label, copied, onCopy }: { value?: string; label: string; copied: boolean; onCopy: () => void }) {
  if (!value) return null

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-white/15 px-2.5 font-mono text-[11px] uppercase tracking-wide text-white/65 transition-colors hover:border-white/35 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState<LanguageCode>("auto")
  const [result, setResult] = useState<TranscribeResult | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [copiedField, setCopiedField] = useState<"amharic" | "transcript" | "english" | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectFile = (selectedFile?: File) => {
    if (!selectedFile) return

    if (selectedFile.size > MAX_AUDIO_BYTES) {
      setError("Choose an audio file smaller than 25 MB.")
      return
    }

    setFile(selectedFile)
    setResult(null)
    setError("")
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0])
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError("")
    setCopiedField(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const copyText = async (field: "amharic" | "transcript" | "english", value?: string) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(null), 1800)
    } catch {
      setError("Could not copy text. Please select it and copy manually.")
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" })

        selectFile(audioFile)
        await handleTranscribe(audioFile)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setError("")
      setIsRecording(true)
    } catch (recordingError) {
      console.error("Microphone error:", recordingError)
      setError("Microphone access was not granted. Check your browser permissions and try again.")
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  async function handleTranscribe(audioFile?: File) {
    const finalFile = audioFile ?? file
    if (!finalFile) return

    try {
      setLoading(true)
      setError("")
      setResult(null)

      const formData = new FormData()
      formData.append("audio", finalFile)
      formData.append("language", language)

      const response = await fetch("/api/transcribe", { method: "POST", body: formData })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Something went wrong while processing the audio.")
        return
      }

      setResult(data)
    } catch (requestError) {
      console.error(requestError)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const languageLabel = (code: string) => LANGUAGES.find((item) => item.code === code)?.label ?? code

  return (
    <div className="min-h-screen bg-primary font-sans text-text">
      <SiteNav current="/translate" />

      <header className="border-b border-white/15">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5 sm:px-6">
          <div className="grid h-9 w-9 place-items-center rounded-sm border border-white/20 bg-secondary">
            <Mic className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight">Speech to Amharic</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-white/50">English · Arabic · Urdu → Amharic</p>
          </div>
          <span className="hidden rounded-sm border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/45 sm:inline">Audio workspace</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        {!file && (
          <section aria-labelledby="input-heading">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="input-heading" className="font-mono text-[11px] uppercase tracking-wider text-white/50">Input</h2>
                <p className="mt-1 text-sm text-white/55">Choose a recording or capture a new one.</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <label htmlFor="language-select" className="font-mono text-[11px] uppercase tracking-wider text-white/50">Language</label>
                <select
                  id="language-select"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                  className="h-9 rounded-sm border border-white/20 bg-secondary px-2 text-sm text-text transition-colors hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse"
                >
                  {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                </select>
              </div>
            </div>

            <label
              htmlFor="audio-upload"
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center gap-4 rounded-md border border-dashed px-6 py-12 text-center transition-colors duration-150 sm:py-14 ${isDragging ? "border-pulse bg-pulse/10" : "border-white/25 bg-secondary hover:border-white/50"}`}
            >
              <input ref={fileInputRef} onChange={handleUpload} id="audio-upload" accept={ACCEPTED_AUDIO_TYPES} className="sr-only" type="file" />
              <div className="grid h-12 w-12 place-items-center rounded-sm border border-white/20 transition-colors duration-150">
                <Upload className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <p className="font-medium">Upload an audio file</p>
                <p className="mt-1 text-sm text-white/50">Drop it here, or browse from your device.</p>
              </div>
              <span className="flex items-center gap-2 rounded-sm border border-white/15 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50">
                <AudioLines className="h-3.5 w-3.5" /> MP3 · WAV · M4A · WEBM · up to 25 MB
              </span>
            </label>

            <div className="my-6 flex items-center gap-4" aria-hidden="true">
              <div className="flex-1 border-t border-white/15" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">or</span>
              <div className="flex-1 border-t border-white/15" />
            </div>

            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex h-12 w-full items-center justify-center gap-2.5 rounded-md border font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse ${isRecording ? "border-red-400/60 bg-red-950/40 text-red-100 hover:bg-red-950/60" : "border-white/20 bg-secondary text-text hover:border-white/40"}`}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span>{isRecording ? "Stop and translate recording" : "Record from microphone"}</span>
              {isRecording && <span className="h-2 w-2 animate-pulse rounded-full bg-red-300" aria-label="Recording in progress" />}
            </button>
            {isRecording && <p className="mt-3 text-center text-sm text-red-100/75" aria-live="polite">Recording is in progress. Your audio will be translated when you stop.</p>}
            {error && <p className="mt-4 rounded-md border border-red-400/40 bg-red-950/30 px-4 py-3 text-sm text-red-100" role="alert">{error}</p>}
          </section>
        )}

        {file && (
          <div className="space-y-8">
            <section aria-labelledby="audio-heading">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 id="audio-heading" className="font-mono text-[11px] uppercase tracking-wider text-white/50">Audio</h2>
                <span className="font-mono text-[11px] uppercase tracking-wider text-white/45">{language === "auto" ? "Auto detect" : languageLabel(language)}</span>
              </div>
              <div className="rounded-md border border-white/15 bg-secondary p-4 sm:flex sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-white/15"><FileAudio className="h-4 w-4 text-white/65" /></div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-white/85">{file.name}</p>
                    <p className="mt-1 text-xs text-white/45">Ready to transcribe and translate.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTranscribe()}
                    disabled={loading}
                    className="inline-flex h-10 items-center gap-2 rounded-sm bg-text px-4 text-sm font-semibold text-primary transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {loading ? "Processing audio" : "Transcribe & translate"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-white/20 px-3 text-sm text-white/80 transition-colors hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Start over
                  </button>
                </div>
              </div>
              {loading && <p className="mt-3 flex items-center gap-2 text-sm text-white/55" aria-live="polite"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pulse" /> Transcribing speech, then translating it to Amharic.</p>}
              {error && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-400/40 bg-red-950/30 px-4 py-3 text-sm text-red-100" role="alert"><span>{error}</span><button type="button" onClick={() => handleTranscribe()} className="font-medium underline decoration-red-200/60 underline-offset-4 hover:text-white">Try again</button></div>}
            </section>

            <section aria-labelledby="amharic-heading">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 id="amharic-heading" className="font-mono text-[11px] uppercase tracking-wider text-pulse">Amharic · አማርኛ</h2>
                  <p className="mt-1 text-sm text-white/50">Your translated result</p>
                </div>
                <CopyButton value={result?.amharic} label="Amharic translation" copied={copiedField === "amharic"} onCopy={() => copyText("amharic", result?.amharic)} />
              </div>
              <div className="rounded-md border border-white/15 border-l-2 border-l-pulse bg-secondary px-5 py-6 sm:px-6">
                <p className="min-h-24 text-2xl leading-relaxed" lang="am">
                  {result?.amharic ?? <span className="text-base text-white/40">{loading ? "Translating to Amharic…" : "Your Amharic translation will appear here."}</span>}
                </p>
              </div>
            </section>

            <section aria-labelledby="source-heading">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 id="source-heading" className="font-mono text-[11px] uppercase tracking-wider text-white/50">Source text</h2>
                  <p className="mt-1 text-sm text-white/50">Keep the original transcript for context.</p>
                </div>
                <CopyButton value={result?.transcript} label="original transcript" copied={copiedField === "transcript"} onCopy={() => copyText("transcript", result?.transcript)} />
              </div>
              <div className="overflow-hidden rounded-md border border-white/15 bg-secondary">
                <div className="px-4 py-4 sm:px-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">Transcript</span>
                    {result && <span className="rounded-sm border border-white/20 px-1.5 py-0.5 font-mono text-[11px] text-white/70">{languageLabel(result.language)}</span>}
                  </div>
                  <p className="text-sm leading-relaxed text-white/80" dir={result && (result.language === "ar" || result.language === "ur") ? "rtl" : "ltr"}>
                    {result?.transcript ?? <span className="text-white/40">{loading ? "Listening to your audio…" : "Your original transcript will appear here."}</span>}
                  </p>
                </div>
                {result?.english && (
                  <div className="border-t border-white/15 px-4 py-4 sm:px-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">English pivot</span>
                      <CopyButton value={result.english} label="English pivot" copied={copiedField === "english"} onCopy={() => copyText("english", result.english)} />
                    </div>
                    <p className="text-sm leading-relaxed text-white/80">{result.english}</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
