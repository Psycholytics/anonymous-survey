"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setLoading(false);

    if (!error) {
      setSent(true);
    } else {
      alert(error.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-extrabold">Reset your password</h1>

        {sent ? (
          <p className="mt-4 text-sm text-gray-600">
            Check your email for the reset link.
          </p>
        ) : (
          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none focus:border-gray-300"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}