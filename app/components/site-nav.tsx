import Link from "next/link"

const links = [
  { href: "/", label: "Home" },
  { href: "/translate", label: "Translate" },
  { href: "/how-it-works", label: "How it works" },
]

export function SiteNav({ current }: { current?: string }) {
  return (
    <header className="border-b border-white/10 bg-primary/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded border border-white/20 text-sm">AM</span>
          Speech to Amharic
        </Link>
        <nav className="flex items-center gap-4 text-sm text-white/60" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={current === link.href ? "text-white" : "transition-colors hover:text-white"}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
