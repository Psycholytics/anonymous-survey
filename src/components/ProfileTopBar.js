"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfileTopBar({ profileUserId }) {
  const router = useRouter();
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    async function check() {
      const fromDash =
        typeof window !== "undefined" &&
        sessionStorage.getItem("nav_from_dashboard") === "1";

      const { data } = await supabase.auth.getUser();
      const me = data?.user;

      if (fromDash || (me && me.id === profileUserId)) {
        setShowBack(true);
      }
    }

    check();
  }, [profileUserId]);

  if (!showBack) return null;

  return (
    <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem("nav_from_dashboard");
            } catch {}
            router.push("/dashboard");
          }}
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
        >
          ← Back to dashboard
        </button>
      </div>
    </div>
  );
}