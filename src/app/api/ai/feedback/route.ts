import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  const rating = Number(body?.rating);
  if (!messageId || ![-1, 1].includes(rating)) return NextResponse.json({ error: "invalid_feedback" }, { status: 400 });
  const { data: message } = await supabase.from("ai_messages").select("id").eq("id", messageId).eq("user_id", user.id).maybeSingle();
  if (!message) return NextResponse.json({ error: "message_not_found" }, { status: 404 });
  const { error } = await supabase.from("ai_feedback").insert({ user_id: user.id, message_id: messageId, rating });
  if (error) return NextResponse.json({ error: "feedback_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
