// src/lib/supabaseServer.js
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          // IMPORTANT: use the 3-arg signature (NOT an object)
          try {
            cookieStore.set(name, value, options);
          } catch {}
        },
        remove(name, options) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {}
        },
      },
    }
  );
}