"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, PackageCheck, Store } from "lucide-react";

export default function VendorCenterPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-9">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--background)]"><Store size={22} /></div>
          <div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Vendor Center</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Manage your store, promotions and customer orders</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Orders remain controlled by the commerce/payment engine. Promotions use the new server-controlled advertising workflow.</p></div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/vendor/orders" className="group rounded-2xl border border-[var(--border)] p-5 transition hover:-translate-y-0.5 hover:shadow-md"><PackageCheck size={21} /><h2 className="mt-5 font-semibold">Orders & fulfillment</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">View your customer orders, update fulfillment, submit delivery information and track completion.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Open orders <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span></Link>
          <Link href="/vendor/promotions" className="group rounded-2xl border border-[var(--border)] p-5 transition hover:-translate-y-0.5 hover:shadow-md"><Megaphone size={21} /><h2 className="mt-5 font-semibold">Promotions & advertising</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Promote eligible listings, submit campaigns for review and monitor approved campaign budgets.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Open promotions <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span></Link>
          <div className="rounded-2xl border border-[var(--border)] p-5 sm:col-span-2"><h2 className="font-semibold">Vendor rules</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">You cannot mark payments as successful, alter transaction amounts, issue refunds, or override fraud/payment holds. Promotion charges and approvals remain controlled by DRIGHT&apos;s authoritative payment, moderation and advertising systems.</p></div>
        </div>
      </div>
    </div>
  );
}
