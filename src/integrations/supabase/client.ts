import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Catch missing env vars early with a clear error message instead of silently
// falling back to placeholder.supabase.co (which causes a cryptic "Failed to fetch").
if (!SUPABASE_URL || SUPABASE_URL.includes("xxxx") || SUPABASE_URL === "https://placeholder.supabase.co") {
  throw new Error(
    "⚠️  VITE_SUPABASE_URL belum diset atau masih placeholder.\n" +
    "Buat file .env di root project dan isi dengan URL Supabase kamu:\n" +
    "  VITE_SUPABASE_URL=https://<project-id>.supabase.co\n" +
    "Lalu restart dev server."
  );
}

if (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.startsWith("eyJ...")) {
  throw new Error(
    "⚠️  VITE_SUPABASE_PUBLISHABLE_KEY belum diset atau masih placeholder.\n" +
    "Buat file .env di root project dan isi dengan anon key Supabase kamu:\n" +
    "  VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...\n" +
    "Lalu restart dev server."
  );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  }
);
