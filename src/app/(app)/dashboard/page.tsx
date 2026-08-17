import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const username =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username
      : "user";

  return (
    <main className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <p className="text-sm text-[var(--muted)]">DRIGHT Dashboard</p>

          <h1 className="mt-2 text-3xl font-semibold">
            Welcome, @{username}
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
            Your DRIGHT application workspace is being built. Your account
            session is active.
          </p>
        </div>
      </div>
    </main>
  );
}
