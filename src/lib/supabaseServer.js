import { createServerClient } from "@supabase/ssr";

export function supabaseServer(req) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // no-op for this endpoint (we only need to READ the session)
        },
      },
    }
  );
}