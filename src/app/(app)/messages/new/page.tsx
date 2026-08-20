"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NewMessagePage() {
  const params = useSearchParams();
  const orderId = params.get("order") || "";
  const targetUserId = params.get("user") || "";
  const supabase = createClient();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }

      if (!orderId && !targetUserId) { setError("Provide an Order ID or user ID to start a conversation."); return; }

      if (orderId) {
        const { data: order, error: orderError } = await supabase.from("orders").select("id,order_id,buyer_user_id").eq("order_id", orderId).maybeSingle();
        if (orderError || !order) { setError("Order not found."); return; }
        const { data: itemRows } = await supabase.from("order_items").select("seller_user_id").eq("order_id", order.id);
        const sellers = [...new Set((itemRows || []).map((x: { seller_user_id: string | null }) => x.seller_user_id).filter((x): x is string => Boolean(x)))];
        if (user.id !== order.buyer_user_id && !sellers.includes(user.id)) { setError("You are not a participant in this order."); return; }
        const { data: existing } = await supabase.from("chat_conversations").select("id").eq("order_id", order.id).eq("conversation_type", "order").limit(1).maybeSingle();
        if (existing) { window.location.replace(`/messages/${existing.id}`); return; }
        const { data: conversation, error: createError } = await supabase.from("chat_conversations").insert({ order_id: order.id, created_by: user.id, conversation_type: "order" }).select("id").single();
        if (createError || !conversation) { setError(createError?.message || "Unable to start conversation."); return; }
        const participants = [order.buyer_user_id, ...sellers].filter((v, i, a): v is string => Boolean(v) && a.indexOf(v) === i).map((user_id) => ({ conversation_id: conversation.id, user_id }));
        const { error: participantError } = await supabase.from("chat_participants").insert(participants);
        if (participantError) { setError(participantError.message); return; }
        if (active) window.location.replace(`/messages/${conversation.id}`);
        return;
      }

      if (targetUserId === user.id) { setError("You cannot start a conversation with yourself."); return; }
      const { data: target, error: targetError } = await supabase.from("profiles").select("id,username,full_name").eq("id", targetUserId).maybeSingle();
      if (targetError || !target) { setError("User not found."); return; }
      const { data: privacy } = await supabase.from("profile_privacy_settings").select("allow_messages_from").eq("user_id", targetUserId).maybeSingle();
      const { data: follows } = await supabase.from("follows").select("follower_user_id").eq("follower_user_id", user.id).eq("following_user_id", targetUserId).eq("status", "active").maybeSingle();
      if (privacy?.allow_messages_from === "none" || (privacy?.allow_messages_from === "followers" && !follows)) { setError("This user does not currently accept messages from you."); return; }
      const { data: blocked } = await supabase.from("user_blocks").select("blocker_user_id").or(`and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${targetUserId}),and(blocker_user_id.eq.${targetUserId},blocked_user_id.eq.${user.id})`).limit(1).maybeSingle();
      if (blocked) { setError("Messaging is unavailable between these users."); return; }
      const { data: existingParticipants } = await supabase.from("chat_participants").select("conversation_id,chat_conversations!inner(id,conversation_type)").eq("user_id", user.id);
      const existingDirect = (existingParticipants || []).find((row: any) => {
        const c = Array.isArray(row.chat_conversations) ? row.chat_conversations[0] : row.chat_conversations;
        return c?.conversation_type === "direct";
      });
      if (existingDirect) {
        const conversationId = existingDirect.conversation_id;
        const { data: other } = await supabase.from("chat_participants").select("user_id").eq("conversation_id", conversationId).eq("user_id", targetUserId).maybeSingle();
        if (other) { window.location.replace(`/messages/${conversationId}`); return; }
      }
      const { data: conversation, error: createError } = await supabase.from("chat_conversations").insert({ created_by: user.id, conversation_type: "direct" }).select("id").single();
      if (createError || !conversation) { setError(createError?.message || "Unable to start conversation."); return; }
      const { error: participantError } = await supabase.from("chat_participants").insert([{ conversation_id: conversation.id, user_id: user.id }, { conversation_id: conversation.id, user_id: targetUserId }]);
      if (participantError) { setError(participantError.message); return; }
      if (active) window.location.replace(`/messages/${conversation.id}`);
    })();
    return () => { active = false; };
  }, [orderId, targetUserId]);

  return <div className="mx-auto max-w-xl px-4 py-16 text-center"><MessageSquare size={34} className="mx-auto"/><h1 className="mt-5 text-2xl font-semibold">Starting conversation…</h1>{error && <p className="mt-3 text-sm text-red-600">{error}</p>} {!error && <p className="mt-2 text-sm text-[var(--muted)]">Checking permissions and connecting the right DRIGHT participants.</p>}</div>;
}
