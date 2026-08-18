import Link from "next/link";
import { ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, Compass, GraduationCap, ListChecks, Search, ShoppingBag, Sparkles, Wrench } from "lucide-react";

const types = [
  { label: "All", href: "/marketplace", icon: Compass },
  { label: "Products", href: "/marketplace?type=product", icon: ShoppingBag },
  { label: "Services", href: "/marketplace?type=service", icon: Wrench },
  { label: "Courses", href: "/marketplace?type=course", icon: GraduationCap },
  { label: "Jobs", href: "/marketplace?type=job", icon: BriefcaseBusiness },
  { label: "Tasks", href: "/marketplace?type=task", icon: ListChecks },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight">DRIGHT</Link>
          <nav className="hidden items-center gap-7 text-sm md:flex">
            <Link href="/marketplace" className="hover:opacity-70">Marketplace</Link>
            <Link href="/login" className="hover:opacity-70">Sign in</Link>
            <Link href="/signup" className="rounded-xl bg-[var(--primary)] px-4 py-2 font-medium text-[var(--background)]">Create account</Link>
          </nav>
          <Link href="/signup" className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--background)] md:hidden">Join DRIGHT</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)]"><Sparkles size={16} /> Commerce, community and opportunity</div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">Discover what you need.<br />Build what you want.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">DRIGHT is a worldwide marketplace and social-commerce ecosystem for products, services, courses, jobs and tasks — with creators, communities, affiliates and AI-powered discovery.</p>
        </div>

        <form action="/marketplace" className="mt-9 flex max-w-3xl items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm">
          <Search className="ml-3 shrink-0 text-[var(--muted)]" size={21} />
          <input name="q" placeholder="What are you looking for?" className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none" />
          <button className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--background)]">Search</button>
        </form>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {types.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm hover:shadow-sm"><Icon size={16} />{label}</Link>)}
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <Link href="/marketplace" className="group rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 transition hover:-translate-y-0.5 hover:shadow-md"><ShoppingBag size={23} /><h2 className="mt-7 text-xl font-semibold">Marketplace</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Explore approved products, services, courses, jobs and tasks in one place.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">Explore <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span></Link>
          <Link href="/signup" className="group rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 transition hover:-translate-y-0.5 hover:shadow-md"><BookOpen size={23} /><h2 className="mt-7 text-xl font-semibold">Create & earn</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Join as a buyer and grow into a vendor, affiliate, creator, service provider or educator.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">Get started <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span></Link>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7"><CheckCircle2 size={23} /><h2 className="mt-7 text-xl font-semibold">Built for trust</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Verification, moderation, permissions, secure transactions and accountable platform operations are built into the foundation.</p></div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-sm text-[var(--muted)] sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} DRIGHT</span><span>Worldwide marketplace & social commerce</span></div></footer>
    </main>
  );
}
