"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Image as ImageIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Media = { id: string; storage_path: string; media_type: "image"; alt_text: string | null; sort_order: number };

export function ListingMediaGallery({ itemId, title }: { itemId: string; title: string }) {
  const supabase = createClient();
  const [media, setMedia] = useState<Media[]>([]);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("marketplace_item_media")
        .select("id,storage_path,media_type,alt_text,sort_order")
        .eq("item_id", itemId)
        .eq("media_type", "image")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (active) {
        setMedia((data as Media[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [itemId]);

  const urls = useMemo(() => media.map((m) => supabase.storage.from("marketplace-media").getPublicUrl(m.storage_path).data.publicUrl), [media, supabase]);

  function previous() { setSelected((v) => (v - 1 + urls.length) % urls.length); }
  function next() { setSelected((v) => (v + 1) % urls.length); }

  if (loading) return <div className="min-h-[330px] animate-pulse rounded-[2rem] bg-[var(--background)] sm:min-h-[480px]" />;
  if (!urls.length) {
    return <div className="relative flex min-h-[330px] items-center justify-center bg-[var(--background)] sm:min-h-[480px]"><div className="text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"><ImageIcon size={36} className="text-[var(--muted)]" /></div><p className="mt-4 text-sm font-medium">No product media yet</p><p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted)]">The seller has not attached marketplace media to this listing.</p></div></div>;
  }

  return <>
    <div className="bg-[var(--background)] p-3 sm:p-5">
      <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in" aria-label="Open product image viewer">
          <img src={urls[selected]} alt={media[selected]?.alt_text || title} className="h-[330px] w-full object-contain sm:h-[480px]" />
        </button>
        {urls.length > 1 && <><button type="button" onClick={previous} aria-label="Previous image" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 p-2 shadow-[var(--shadow-sm)]"><ChevronLeft size={18}/></button><button type="button" onClick={next} aria-label="Next image" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 p-2 shadow-[var(--shadow-sm)]"><ChevronRight size={18}/></button></>}
        <button type="button" onClick={() => setOpen(true)} aria-label="Expand image" className="absolute right-3 top-3 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 p-2 shadow-[var(--shadow-sm)]"><Expand size={16}/></button>
        <span className="absolute bottom-3 left-3 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-1.5 text-xs font-medium backdrop-blur">{selected + 1} / {urls.length}</span>
      </div>
      {urls.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Product image thumbnails">{urls.map((url, index) => <button type="button" key={media[index].id} onClick={() => setSelected(index)} aria-label={`View image ${index + 1}`} className={`shrink-0 overflow-hidden rounded-xl border-2 ${selected === index ? "border-[var(--primary)]" : "border-[var(--border)]"}`}><img src={url} alt="" className="h-16 w-16 object-cover sm:h-20 sm:w-20" /></button>)}</div>}
    </div>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Product image viewer">
      <button type="button" onClick={() => setOpen(false)} aria-label="Close image viewer" className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white backdrop-blur"><X size={20}/></button>
      {urls.length > 1 && <button type="button" onClick={previous} aria-label="Previous image" className="absolute left-3 rounded-full bg-white/10 p-3 text-white backdrop-blur sm:left-6"><ChevronLeft size={24}/></button>}
      <img src={urls[selected]} alt={media[selected]?.alt_text || title} className="max-h-[90vh] max-w-[92vw] object-contain" />
      {urls.length > 1 && <button type="button" onClick={next} aria-label="Next image" className="absolute right-3 rounded-full bg-white/10 p-3 text-white backdrop-blur sm:right-6"><ChevronRight size={24}/></button>}
    </div>}
  </>;
}
