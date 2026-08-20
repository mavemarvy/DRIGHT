import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("ai_conversations").select("id,public_id,title,conversation_type,status,summary,language_code,created_at,updated_at").eq("user_id", user.id).neq("status", "deleted").order("updated_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "conversation_history_failed" }, { status: 500 });
  return NextResponse.json({ conversations: data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status === "archived" ? "archived" : body?.status === "active" ? "active" : null;
  if (!id || !status) return NextResponse.json({ error: "invalid_conversation_update" }, { status: 400 });
  const { error } = await supabase.from("ai_conversations").update({ status }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "conversation_update_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "conversation_id_required" }, { status: 400 });
  const { error } = await supabase.from("ai_conversations").update({ status: "deleted" }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "conversation_delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
