"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setLoading(false);

    if (!error) {
      setSent(true);
    } else {
      setErrorMsg(error.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6 text-gray-900">
      {/* Consistent background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white/80 p-8 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-2xl shadow-sm border border-gray-100">
          🔐
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Reset password</h1>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-green-50 p-5 text-sm font-medium text-green-800 border border-green-100">
            Check your email for the reset link. You can close this window.
          </div>
        ) : (
          <form onSubmit={handleReset} className="mt-6 space-y-5">
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Enter the email associated with your account and we'll send you a link to reset your password.
            </p>

            {/* Clean inline error instead of an alert() */}
            {errorMsg && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {errorMsg}
              </div>
            )}

            <div>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium shadow-sm outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-500/5 transition-all bg-white"
              />
            </div>

            <div className="grid gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3.5 text-sm font-bold text-white shadow-md hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
              
              <a
                href="/login?mode=login"
                className="w-full text-center rounded-2xl px-5 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Back to login
              </a>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}