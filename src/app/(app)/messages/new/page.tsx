"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NewMessagePage() {
  const params = useSearchParams();
  const orderId = params.get("order") || "";
  const supabase = createClient();
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!orderId) { setError("An Order ID is required to start an order conversation."); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = `/login?next=${encodeURIComponent(`/messages/new?order=${orderId}`)}`; return; }
      const { data: order, error: orderError } = await supabase.from("orders").select("id,order_id,buyer_user_id").eq("order_id", orderId).maybeSingle();
      if (orderError || !order) { setError("Order not found."); return; }
      const { data: itemRows } = await supabase.from("order_items").select("seller_user_id").eq("order_id", order.id);
      const sellers = [...new Set((itemRows || []).map((x: any) => x.seller_user_id).filter(Boolean))];
      const allowed = user.id === order.buyer_user_id || sellers.includes(user.id);
      if (!allowed) { setError("You are not a participant in this order."); return; }
      const { data: existing } = await supabase.from("chat_conversations").select("id").eq("order_id", order.id).eq("conversation_type", "order").limit(1).maybeSingle();
      if (existing) { window.location.replace(`/messages/${existing.id}`); return; }
      const { data: conversation, error: createError } = await supabase.from("chat_conversations").insert({ order_id: order.id, created_by: user.id, conversation_type: "order" }).select("id").single();
      if (createError || !conversation) { setError(createError?.message || "Unable to start conversation."); return; }
      const participants = [order.buyer_user_id, ...sellers].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((user_id) => ({ conversation_id: conversation.id, user_id }));
      const { error: participantError } = await supabase.from("chat_participants").insert(participants);
      if (participantError) { setError(participantError.message); return; }
      window.location.replace(`/messages/${conversation.id}`);
    })();
  }, [orderId]);

  return <div className="mx-auto max-w-xl px-4 py-16 text-center"><MessageSquare size={34} className="mx-auto"/><h1 className="mt-5 text-2xl font-semibold">Starting conversation…</h1>{error && <p className="mt-3 text-sm text-red-600">{error}</p>} {!error && <p className="mt-2 text-sm text-[var(--muted)]">Connecting the buyer and relevant vendor(s) for this order.</p>}</div>;
}
