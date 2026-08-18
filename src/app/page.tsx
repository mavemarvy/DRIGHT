import Link from "next/link";
import { ArrowRight, Globe2, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";

const features = [
  { icon: Globe2, title: "Worldwide by design", text: "International language and currency architecture from day one." },
  { icon: ShieldCheck, title: "Built for trust", text: "Verification, moderation, permissions and auditability are foundational." },
  { icon: Sparkles, title: "AI-ready", text: "AI capabilities can be added through a provider-independent architecture." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)]"><Sparkles size={16} /> DRIGHT foundation</div>
        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">The worldwide marketplace is being built.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">DRIGHT is a marketplace and social-commerce platform for products, services, courses and jobs, with communities, creators, affiliates, administration and AI capabilities.</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 font-medium text-[var(--background)]"><UserPlus size={18} /> Create account <ArrowRight size={18} /></Link>
          <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 font-medium"><LogIn size={18} /> Sign in</Link>
        </div>

        <div id="foundation" className="mt-20 grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><Icon size={22} /><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-2 leading-7 text-[var(--muted)]">{text}</p></article>
          ))}
        </div>
      </section>
    </main>
  );
}
