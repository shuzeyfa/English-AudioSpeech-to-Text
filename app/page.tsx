import Link from "next/link"
import { ArrowRight, Globe2, Mic, ShieldCheck, Sparkles } from "lucide-react"
import { SiteNav } from "./components/site-nav"

const highlights = [
  { icon: Mic, title: "Speak or upload", text: "Record straight from your microphone or bring an audio file." },
  { icon: Globe2, title: "Three source languages", text: "Start with English, Arabic, or Urdu speech." },
  { icon: ShieldCheck, title: "Simple and private", text: "Your API credentials remain securely on the server." },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-primary text-text">
      <SiteNav current="/" />

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-secondary px-3 py-1.5 font-mono text-xs text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-pulse" /> Speech translation, made focused
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Bring spoken words <span className="text-pulse">to Amharic.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
            Turn English, Arabic, and Urdu audio into clear Amharic text. Upload a recording or speak directly in your browser.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/translate" className="inline-flex h-12 items-center gap-2 rounded-md bg-text px-5 font-medium text-primary transition-colors hover:bg-white">
              Start translating <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/how-it-works" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
              See how it works
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-white/15 bg-secondary p-6 shadow-2xl shadow-black/10 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-widest text-white/45">A focused workflow</p>
          <div className="mt-8 space-y-5">
            {["Choose your audio", "Transcribe the speech", "Read the Amharic result"].map((item, index) => (
              <div key={item} className="flex items-center gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded border border-white/15 font-mono text-sm text-pulse">0{index + 1}</span>
                <span className="text-white/85">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3 sm:px-6">
          {highlights.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-md border border-white/10 bg-secondary p-5">
              <Icon className="h-5 w-5 text-pulse" />
              <h2 className="mt-5 font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
