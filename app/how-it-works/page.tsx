import Link from "next/link"
import { ArrowRight, AudioLines, Languages, MessageSquareText } from "lucide-react"
import { SiteNav } from "../components/site-nav"

const steps = [
  { icon: AudioLines, title: "1. Provide audio", text: "Upload an MP3 or WAV file, or record a message from your microphone." },
  { icon: MessageSquareText, title: "2. Transcribe speech", text: "The app creates a source-language transcript and detects the language when needed." },
  { icon: Languages, title: "3. Translate to Amharic", text: "Arabic and Urdu first pass through English, then the final Amharic translation is displayed." },
]

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-primary text-text">
      <SiteNav current="/how-it-works" />
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-widest text-pulse">How it works</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">From spoken audio to readable Amharic.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/65">The translation flow is intentionally straightforward, while preserving the original transcript for context.</p>
        <div className="mt-14 space-y-4">
          {steps.map(({ icon: Icon, title, text }) => (
            <article key={title} className="flex gap-5 rounded-lg border border-white/15 bg-secondary p-6">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded border border-white/15 text-pulse"><Icon className="h-5 w-5" /></div>
              <div><h2 className="font-medium">{title}</h2><p className="mt-2 leading-relaxed text-white/60">{text}</p></div>
            </article>
          ))}
        </div>
        <Link href="/translate" className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-pulse">
          Open the translator <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
