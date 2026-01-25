// src/app/unlock/[surveyId]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function canStillUnlockSurveyRow(s) {
    if (!s) return false;
    if (s.is_paid) return false;

    const unlockDeadlineMs = s.unlock_deadline
      ? new Date(s.unlock_deadline).getTime()
      : s.expires_at
      ? new Date(s.expires_at).getTime() + 30 * 24 * 60 * 60 * 1000
      : null;

    if (!unlockDeadlineMs) return true;
    return Date.now() < unlockDeadlineMs;
}

export default function UnlockSurveyPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params?.surveyId;

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setErrorMsg("");

      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;

      if (!u) {
        router.push(`/login?mode=login&next=/unlock/${surveyId}`);
        return;
      }

      const { data: sRow, error } = await supabase
        .from("surveys")
        .select("id, title, owner_id, is_paid, unlock_deadline, expires_at")
        .eq("id", surveyId)
        .single();

      if (!alive) return;

      if (error) {
        console.error("UNLOCK PAGE SURVEY LOAD ERROR:", error);
        setErrorMsg("Couldn’t load this survey.");
        setLoading(false);
        return;
      }

      if (sRow?.owner_id !== u.id) {
        router.push("/dashboard");
        return;
      }

      // 🛑 block unlock if window ended (unless already paid)
      if (!sRow.is_paid && !canStillUnlockSurveyRow(sRow)) {
        setSurvey(sRow);
        setIsPaid(false);
        setErrorMsg("Unlock window ended. This survey can no longer be unlocked.");
        setLoading(false);
        return;
      }

      setSurvey(sRow);
      setIsPaid(!!sRow?.is_paid);
      setLoading(false);
    }

    if (surveyId) boot();

    return () => {
      alive = false;
    };
  }, [router, surveyId]);

  async function startCheckout() {
    if (!surveyId) return;
    setErrorMsg("");

    try {
      setStartingCheckout(true);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId,
          successUrl: `${origin}/dashboard?surveyId=${surveyId}&unlocked=1`,
          cancelUrl: `${origin}/dashboard?surveyId=${surveyId}`,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = json?.error || "Checkout failed.";
        throw new Error(msg);
      }

      const url = json?.url;
      if (!url) throw new Error("Checkout session URL missing.");

      window.location.href = url;
    } catch (err) {
      console.error("CHECKOUT START ERROR:", err);
      setErrorMsg(err?.message || "Checkout failed.");
    } finally {
      setStartingCheckout(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <button
          onClick={() =>
            router.push(surveyId ? `/dashboard?surveyId=${surveyId}` : "/dashboard")
          }
          className="mb-8 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>

        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          {/* LEFT: Emotional copy */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Unlock responses
            </p>

            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900">
              Your "friends" didn’t hold back. 👀
            </h1>

            <p className="mt-5 max-w-prose text-base leading-relaxed text-gray-700">
              You asked people to be honest for a reason.
              <br />
              <br />
              They answered <span className="font-semibold">anonymously</span> — no pressure, no
              politeness, no worrying about your reaction.
              <br />
              <br />
              Right now, you’re still guessing what they{" "}
              <span className="font-semibold">really</span> think. Unlocking means you don’t have
              to guess anymore.
            </p>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm">
              Some might surprise you 😳
              <br />
              Some might sting.
              <br />
              But they’re real.
            </div>
          </div>

          {/* RIGHT: Checkout card */}
          <div className="md:sticky md:top-8">
            <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              {loading ? (
                <p className="text-sm text-gray-600">Loading…</p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500">Survey</p>
                      <p className="mt-1 truncate text-lg font-extrabold text-gray-900">
                        {survey?.title || "Survey"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                      One-time unlock
                    </span>
                  </div>

                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-600">What you get</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-700">
                      <li>• Full access to all responses</li>
                      <li>• Survey saved forever ⏳🔒</li>
                      <li>• And most importantly, what your friends really think!</li>
                    </ul>
                  </div>

                  {isPaid ? (
                    <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                      <p className="text-sm font-semibold text-green-800">Already unlocked ✅</p>
                      <button
                        onClick={() => router.push(`/dashboard?surveyId=${surveyId}`)}
                        className="mt-3 inline-flex w-full justify-center rounded-2xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                      >
                        View responses
                      </button>
                    </div>
                  ) : (
                    <>
                      {errorMsg && (
                        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {errorMsg}
                        </div>
                      )}

                      <button
                        onClick={startCheckout}
                        disabled={startingCheckout}
                        className={cx(
                          "mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:opacity-95",
                          startingCheckout && "cursor-not-allowed opacity-70"
                        )}
                      >
                        {startingCheckout ? "Starting checkout…" : "See what they really said"}
                      </button>

                      <p className="mt-3 text-center text-xs text-gray-500">
                        Anonymous. One-time unlock. Yours forever. 🔒
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}