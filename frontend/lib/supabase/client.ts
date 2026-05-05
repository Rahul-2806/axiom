export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "undefined" || key === "undefined") return null;
  
  try {
    const { createBrowserClient } = require("@supabase/ssr");
    return createBrowserClient(url, key);
  } catch (e) {
    return null;
  }
}