"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function normalizeHandle(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 20);
}

function isValidHandle(handle) {
  // 3-20 chars, letters/numbers/underscore, cannot start with underscore
  return /^[a-z0-9][a-z0-9_]{2,19}$/.test(handle);
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/") ? n : "/create";
  }, [searchParams]);

  const initialMode = useMemo(() => {
    const m = searchParams.get("mode");
    return m === "login" ? "login" : "signup";
  }, [searchParams]);

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // "Username" (stored in profiles.handle)
  const [handle, setHandle] = useState("");

  const [handleError, setHandleError] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!handle) {
        setHandleError("");
        return;
    }

    if (!/^[a-zA-Z0-9_]*$/.test(handle)) {
        setHandleError("Only letters, numbers, and underscores allowed.");
        return;
    }

    setHandleError("");
  }, [handle]);

  async function ensureProfileForUser(userId, desiredHandleIfAny) {
    // Do we already have a profile + handle?
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, handle")
      .eq("user_id", userId)
      .maybeSingle();

    if (pErr) {
      console.error("PROFILE CHECK ERROR:", pErr);
      return { ok: false, reason: "profile_check_failed" };
    }

    if (prof?.handle) return { ok: true };

    // If missing, try to create it using desired handle (or pending handle)
    const pending = (() => {
      try {
        return localStorage.getItem("pending_handle");
      } catch {
        return null;
      }
    })();

    const finalHandle = normalizeHandle(desiredHandleIfAny || pending || "");
    if (!finalHandle) {
      return { ok: false, reason: "missing_handle" };
    }

    // Validate
    if (!isValidHandle(finalHandle)) {
      return { ok: false, reason: "invalid_handle" };
    }

    // Ensure uniqueness
    const { data: taken } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("handle", finalHandle)
      .maybeSingle();

    if (taken?.user_id && taken.user_id !== userId) {
      return { ok: false, reason: "handle_taken" };
    }

    // Insert profile row
    const { error: insErr } = await supabase
      .from("profiles")
      .insert([{ user_id: userId, handle: finalHandle }]);

    if (insErr) {
      console.error("PROFILE INSERT ERROR:", insErr);
      return { ok: false, reason: "profile_insert_failed", message: insErr.message };
    }

    // clear pending handle once saved
    try {
      localStorage.removeItem("pending_handle");
    } catch {}

    return { ok: true };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;

    if (mode === "signup" && handleError) {
        return;
    }

    const desiredHandle = normalizeHandle(handle);

    if (mode === "signup") {
      if (!desiredHandle) {
        alert("Username is required (ex: albert_23).");
        return;
      }
      if (!isValidHandle(desiredHandle)) {
        alert(
          "Username must be 3–20 chars, letters/numbers/underscore, and start with a letter/number."
        );
        return;
      }

      // ✅ PRE-CHECK: username availability BEFORE creating auth user
      const { data: taken, error: takenErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("handle", desiredHandle)
        .maybeSingle();

      if (takenErr) {
        console.error("HANDLE CHECK ERROR:", takenErr);
        alert("Could not check username availability. Try again.");
        return;
      }
      if (taken?.user_id) {
        alert("That username is taken. Try a different one.");
        return;
      }

      // store in case email confirmation prevents immediate profile insert
      try {
        localStorage.setItem("pending_handle", desiredHandle);
      } catch {}
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          alert(error.message);
          return;
        }

        // If user is immediately available, create profile now
        let userId = data?.user?.id || null;

        if (!userId) {
          const res2 = await supabase.auth.getUser();
          userId = res2?.data?.user?.id || null;
        }

        if (userId) {
          const ensured = await ensureProfileForUser(userId, desiredHandle);
          if (!ensured.ok) {
            if (ensured.reason === "handle_taken") {
              alert("That username was just taken. Pick another one.");
              return;
            }
            alert(ensured.message || "Failed to save username. Try again.");
            return;
          }
        } else {
          // email-confirm setups can land here
          alert("Account created. Check your email to confirm, then log in.");
          router.push(`/login?mode=login&next=${encodeURIComponent(nextUrl)}`);
          return;
        }

      } else {
        // LOGIN
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          alert(error.message);
          return;
        }

        const { data: uRes } = await supabase.auth.getUser();
        const u = uRes?.user;

        if (u?.id) {
          const ensured = await ensureProfileForUser(u.id, null);
          if (!ensured.ok) {
            // Safety fallback (should basically never happen if signup requires username)
            router.push(`/claim-handle?next=${encodeURIComponent(nextUrl)}`);
            return;
          }
        }
      }

      router.push(nextUrl);
      router.refresh?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Soft gradient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <header className="relative mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">
              Tell Me What You Really Think
            </div>
            <div className="text-[11px] text-gray-500">
              {mode === "signup" ? "Create your account" : "Log in"}
            </div>
          </div>
        </a>

        <a
          href={nextUrl}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
        >
          Back
        </a>
      </header>

      <section className="relative mx-auto max-w-md px-6 pt-6 pb-20">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold tracking-tight">
              {mode === "signup" ? "Create account" : "Log in"}
            </h1>

            <button
              type="button"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "I already have an account" : "Create account"}
            </button>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            {mode === "signup"
              ? "Create your account and claim your public username."
              : "Log in to access your dashboard."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-sm font-semibold text-gray-800">Username</label>
                <div className={`mt-2 flex items-center rounded-2xl border bg-white p-3 shadow-sm focus-within:border-purple-300 ${
                    handleError ? "border-red-400" : "border-gray-200"
                }`}
                >
                  <span className="text-sm text-gray-500">@</span>
                  <input
                    className="ml-2 w-full text-sm outline-none"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="your_username"
                    autoComplete="off"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  3–20 chars. Letters/numbers/underscore.
                </p>

                {handleError && (
                    <p className="mt-1 text-xs text-red-500">
                        {handleError}
                    </p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-800">Email</label>
              <input
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none shadow-sm focus:border-blue-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800">Password</label>
              <input
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none shadow-sm focus:border-purple-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
              type="submit"
            >
              {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
            </button>

            <p className="text-center text-xs text-gray-500">
              By continuing, you agree to basic fair use. (We’ll add real Terms later.)
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}