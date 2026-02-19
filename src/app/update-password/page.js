"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [linkErr, setLinkErr] = useState("");

  const ok = useMemo(() => pw1.length >= 8 && pw1 === pw2, [pw1, pw2]);

  // ✅ Ensure the recovery link creates a session
  useEffect(() => {
    let alive = true;

    async function init() {
      setVerifying(true);
      setLinkErr("");

      try {
        // 1) Try existing session
        const { data: s1, error: e1 } = await supabase.auth.getSession();
        if (e1) console.error("getSession error:", e1);

        if (s1?.session) {
          if (!alive) return;
          setSessionOk(true);
          setVerifying(false);
          return;
        }

        // 2) If link is a "code" link, exchange it for a session
        // (safe to call; if not applicable it just errors)
        const href = window.location.href;

        const { data: ex, error: exErr } =
          await supabase.auth.exchangeCodeForSession(href);

        if (exErr) {
          console.error("exchangeCodeForSession error:", exErr);
        }

        // 3) Re-check session after exchange attempt
        const { data: s2 } = await supabase.auth.getSession();

        if (!alive) return;

        if (s2?.session) {
          setSessionOk(true);
          setVerifying(false);
          return;
        }

        // If we still don't have a session, the link is invalid/expired
        setSessionOk(false);
        setVerifying(false);
        setLinkErr(
          "This reset link is invalid or expired. Please request a new one."
        );
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setSessionOk(false);
        setVerifying(false);
        setLinkErr("Something went wrong verifying this reset link.");
      }
    }

    init();

    return () => {
      alive = false;
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!ok || !sessionOk) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) {
        alert(error.message);
        return;
      }

      // optional but clean: end recovery session
      await supabase.auth.signOut();

      alert("Password updated. Log in now.");
      router.push("/login?mode=login&next=/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight">
          Set a new password
        </h1>
        <p className="mt-2 text-sm text-gray-600">Minimum 8 characters.</p>

        {verifying ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            Verifying reset link…
          </div>
        ) : !sessionOk ? (
          <div className="mt-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {linkErr || "Reset link not valid."}
            </div>

            <a
              href="/reset-password"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
            >
              Request a new reset link
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="New password"
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none shadow-sm focus:border-purple-300"
            />
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none shadow-sm focus:border-purple-300"
            />

            {!ok && (pw1 || pw2) ? (
              <div className="text-xs font-semibold text-red-600">
                Passwords must match and be at least 8 characters.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!ok || loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}