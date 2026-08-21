import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const url = new URL(request.url);
  const rawDays = Number(url.searchParams.get("days") || 30);
  const days = Math.max(1, Math.min(Number.isFinite(rawDays) ? rawDays : 30, 365));
  const { data, error } = await supabase.rpc("get_analytics_snapshot", { p_days: days });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
}
