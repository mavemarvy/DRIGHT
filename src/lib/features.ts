import { createClient } from "@/lib/supabase/client";

export type FeatureStatus = "enabled" | "disabled" | "coming_soon" | "hidden";
export type Feature = {
  feature_id: string;
  feature_key: string;
  display_name: string;
  status: FeatureStatus;
  searchable: boolean;
  discoverable: boolean;
  config: Record<string, unknown>;
};

export const FEATURE_KEYS = {
  terms: "terms",
  privacy: "privacy",
  cookies: "cookies",
  help: "help",
  announcements: "announcements",
  messages: "messages",
  referrals: "referrals",
  affiliate: "affiliate_center",
  vendor: "vendor_center",
  wallet: "wallet",
  orders: "orders",
  followers: "followers",
  communities: "communities_social",
  promotions: "promotions",
  courses: "courses",
  jobs: "jobs",
  paystack: "payment_paystack",
  flutterwave: "payment_flutterwave",
  wise: "payment_wise",
  crypto: "payment_crypto",
} as const;

export async function getFeatureMap() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feature_registry")
    .select("feature_id,feature_key,display_name,status,searchable,discoverable,config");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((feature) => [feature.feature_key, feature as Feature]));
}

export function featureUsable(feature?: Feature) {
  return feature?.status === "enabled";
}

export function featureVisible(feature?: Feature) {
  return feature?.status === "enabled" || feature?.status === "coming_soon";
}
