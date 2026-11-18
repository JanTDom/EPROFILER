// Centralized resilient configuration for Supabase & Cloud Services
// Guards against Vercel CLI masked "[SENSITIVE]" values in prebuilt environments

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_URL: string =
  rawUrl && rawUrl !== "[SENSITIVE]" && rawUrl.startsWith("http")
    ? rawUrl
    : "https://zrkyyopftellntxxwgmo.supabase.co";

const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_ANON_KEY: string =
  rawAnonKey && rawAnonKey !== "[SENSITIVE]"
    ? rawAnonKey
    : "";

const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const SUPABASE_SERVICE_ROLE: string =
  rawServiceKey && rawServiceKey !== "[SENSITIVE]"
    ? rawServiceKey
    : (SUPABASE_ANON_KEY || "");
