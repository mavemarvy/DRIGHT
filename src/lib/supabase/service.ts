import { createClient } from "@supabase/supabase-js";

let serviceClient: ReturnType<typeof createClient> | null = null;

/** Server-only Supabase client. Never import this module into client components. */
export function createServiceClient() {
  if (typeof window !== "undefined") throw new Error("service_client_server_only");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("supabase_service_role_key_missing");
  serviceClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return serviceClient;
}
