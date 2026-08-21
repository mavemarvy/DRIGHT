"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, ExternalLink, Megaphone, Pause, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Banner = {
  id: string;
  banner_id: string;
  campaign_id: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  badge: string | null;
  desktop_image_url: string | null;
  tablet_image_url: string | null;
  mobile_image_url: string | null;
  background_image_url: string | null;
  video_url: string | null;
  cta_label: string | null;
  destination_url: string | null;
  placement: string;
  priority: number;
  display_order: number;
  audience: Record<string, unknown>;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

type Props = {
  placement?: string;
  className?: string;
  deviceType?: "desktop" | "tablet" | "mobile";
};

function isInternalDestination(destination: string) {
  return destination.startsWith("/") && !destination.startsWith("//");
}

function mediaFor(banner: Banner, deviceType: Props["deviceType"]) {
  if (deviceType === "mobile") return banner.mobile_image_url || banner.background_image_url || banner.desktop_image_url;
  if (deviceType === "tablet") return banner.tablet_image_url || banner.desktop_image_url || banner.background_image_url;
  return banner.desktop_image_url || banner.background_image_url || banner.mobile_image_url;
}

export function PromotionBannerCarousel({ placement = "marketplace_home", className = "", deviceType = "desktop" }: Props) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      setLoading(true);
      const { data } = await supabase.rpc("get_active_promotion_banners", {
        p_placement: placement,
        p_device_type: deviceType,
      });
      if (!cancelled) {
        setBanners((data ?? []) as Banner[]);
        setActive(0);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [placement, deviceType]);

  useEffect(() => {
    if (paused || banners.length < 2) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % banners.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, banners.length]);

  const current = banners[active];
  const media = useMemo(() => current ? mediaFor(current, deviceType) : null, [current, deviceType]);

  function change(index: number) {
    setActive((index + banners.length) % banners.length);
  }

  if (loading || !current) return null;

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] ${className}`}
      aria-label="DRIGHT promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {media && <div className="absolute inset-0 opacity-20"><img src={media} alt="" className="h-full w-full object-cover" /></div>}
      <div className="absolute inset-0 bg-[var(--surface)]/85" />
      <div className="relative grid min-h-[250px] items-center gap-6 p-6 sm:min-h-[290px] sm:p-9 lg:grid-cols-[minmax(0,1fr)_220px] lg:p-11">
        <div className="min-w-0">
          {current.badge && <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]"><Megaphone size={13} />{current.badge}</span>}
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">{current.title || "Explore what is new on DRIGHT."}</h2>
          {current.subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">{current.subtitle}</p>}
          {current.description && <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--muted)]">{current.description}</p>}
          {current.cta_label && current.destination_url && (
            isInternalDestination(current.destination_url) ? (
              <Link href={current.destination_url} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--background)]">
                {current.cta_label}<ArrowRight size={15} />
              </Link>
            ) : (
              <a href={current.destination_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--background)]">
                {current.cta_label}<ExternalLink size={15} />
              </a>
            )
          )}
        </div>
        <div className="hidden justify-end lg:flex">
          {media ? <img src={media} alt="" className="h-36 w-52 rounded-2xl border border-[var(--border)] object-cover shadow-[var(--shadow-sm)]" /> : <div className="flex h-36 w-52 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-xs text-[var(--muted)]">DRIGHT promotion</div>}
        </div>
      </div>
      {banners.length > 1 && (
        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/90 p-1 backdrop-blur">
          <button type="button" onClick={() => change(active - 1)} aria-label="Previous promotion" className="rounded-lg p-2 hover:bg-[var(--background)]"><ChevronUp size={15} /></button>
          <span className="px-1 text-[10px] font-semibold text-[var(--muted)]">{active + 1}/{banners.length}</span>
          <button type="button" onClick={() => change(active + 1)} aria-label="Next promotion" className="rounded-lg p-2 hover:bg-[var(--background)]"><ChevronDown size={15} /></button>
          <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Resume promotions" : "Pause promotions"} className="rounded-lg p-2 hover:bg-[var(--background)]">{paused ? <Play size={15} /> : <Pause size={15} />}</button>
        </div>
      )}
    </section>
  );
}
