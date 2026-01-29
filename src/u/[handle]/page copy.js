"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProfileTopBar from "@/components/ProfileTopBar";

export default function PublicProfilePage() {
  const params = useParams();
  const handle = params?.handle;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [surveys, setSurveys] = useState([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      // 1) Find profile by handle
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, handle")
        .eq("handle", handle)
        .maybeSingle();

      if (pErr || !prof) {
        if (!alive) return;
        setProfile(null);
        setSurveys([]);
        setLoading(false);
        return;
      }

      if (!alive) return;
      setProfile(prof);

      // 2) Fetch surveys for that user
      const { data: sRows, error: sErr } = await supabase
        .from("surveys")
        .select("id, title, created_at")
        .eq("owner_id", prof.user_id)
        .order("created_at", { ascending: false });

      if (sErr) console.error(sErr);

      if (!alive) return;
      setSurveys(sRows || []);
      setLoading(false);
    }

    if (handle) load();

    return () => {
      alive = false;
    };
  }, [handle]);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <ProfileTopBar />
      
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <header className="relative mx-auto max-w-4xl px-6 py-10">
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : !profile ? (
          <h1 className="text-xl font-semibold">Profile not found</h1>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">
              @{profile.handle}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Anonymous surveys • Public profile
            </p>
          </>
        )}
      </header>

      <section className="relative mx-auto max-w-4xl px-6 pb-20">
        {!loading && profile && (
          <>
            {surveys.length === 0 ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-600">No surveys yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {surveys.map((s) => (
                  <a
                    key={s.id}
                    href={`/survey/${s.id}`}
                    className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {s.title || "Untitled survey"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Created {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}