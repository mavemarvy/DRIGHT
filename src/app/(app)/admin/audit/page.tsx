"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuditPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login?next=/admin/audit";
        return;
      }

      const { data: ok } = await supabase.rpc("admin_has_permission", {
        p_permission: "audit.view",
        p_user_id: user.id,
      });

      if (!ok) {
        if (!cancelled) setError("You do not have permission to view audit logs.");
        return;
      }

      const { data, error: auditError } = await supabase
        .from("audit_logs")
        .select(
          "id,actor_user_id,action,resource_type,resource_id,target_user_id,metadata,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(250);

      if (cancelled) return;

      if (auditError) {
        setError(auditError.message);
        return;
      }

      setLogs(data || []);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (error)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto" size={40} />
        <h1 className="mt-4 text-2xl font-semibold">Access restricted</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{error}</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
        Governance · Audit
      </p>
      <h1 className="mt-1 text-3xl font-semibold">Audit Log</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Append-oriented operational history for sensitive administrative and financial actions.
      </p>
      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="hidden grid-cols-[180px_1fr_180px_180px] gap-4 border-b border-[var(--border)] p-4 text-xs font-semibold uppercase tracking-widest text-[var(--muted)] md:grid">
          <span>Time</span>
          <span>Action</span>
          <span>Resource</span>
          <span>Actor</span>
        </div>
        {logs.map((l) => (
          <div
            key={l.id}
            className="grid gap-2 border-b border-[var(--border)] p-4 md:grid-cols-[180px_1fr_180px_180px] md:gap-4"
          >
            <span className="text-xs text-[var(--muted)]">
              {new Date(l.created_at).toLocaleString()}
            </span>
            <div>
              <p className="text-sm font-semibold">{l.action}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-[var(--muted)]">
                {l.resource_type || "event"} {l.resource_id || ""}
              </p>
              {l.metadata && Object.keys(l.metadata).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--background)] p-2 text-[10px] text-[var(--muted)]">
                  {JSON.stringify(l.metadata, null, 2)}
                </pre>
              )}
            </div>
            <span className="break-all text-xs text-[var(--muted)]">
              {l.resource_type || "—"}
            </span>
            <span className="break-all text-xs text-[var(--muted)]">
              {l.actor_user_id || "system"}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="p-8 text-sm text-[var(--muted)]">No audit events found.</div>
        )}
      </section>
    </main>
  );
}
