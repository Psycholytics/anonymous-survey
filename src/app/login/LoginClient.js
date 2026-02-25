"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeHandle(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 20);
}

function isValidHandle(handle) {
  return /^[a-z0-9][a-z0-9_]{2,19}$/.test(handle);
}

export default function LoginClient() {
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
  const [showPassword, setShowPassword] = useState(false);
  const [handle, setHandle] = useState("");
  const [handleError, setHandleError] = useState("");
  const [loading, setLoading] = useState(false);

  // Toast System
  const [toast, setToast] = useState(null);
  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  const [resetSending, setResetSending] = useState(false);

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
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, handle")
      .eq("user_id", userId)
      .maybeSingle();

    if (pErr) return { ok: false, reason: "profile_check_failed" };
    if (prof?.handle) return { ok: true };

    const pending = (() => {
      try { return localStorage.getItem("pending_handle"); } catch { return null; }
    })();

    const finalHandle = normalizeHandle(desiredHandleIfAny || pending || "");
    if (!finalHandle) return { ok: false, reason: "missing_handle" };
    if (!isValidHandle(finalHandle)) return { ok: false, reason: "invalid_handle" };

    const { data: taken } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("handle", finalHandle)
      .maybeSingle();

    if (taken?.user_id && taken.user_id !== userId) return { ok: false, reason: "handle_taken" };

    const { error: insErr } = await supabase
      .from("profiles")
      .insert([{ user_id: userId, handle: finalHandle }]);

    if (insErr) return { ok: false, reason: "profile_insert_failed", message: insErr.message };

    try { localStorage.removeItem("pending_handle"); } catch {}
    return { ok: true };
  }

  async function sendReset() {
    const cleanEmail = String(email || "").trim();
    if (!cleanEmail) {
      showToast("err", "Please enter your email address first.");
      return;
    }

    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        showToast("err", error.message || "Could not send reset email.");
        return;
      }
      showToast("ok", "Check your email for the reset link.");
    } finally {
      setResetSending(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === "signup" && handleError) return;

    const desiredHandle = normalizeHandle(handle);

    if (mode === "signup") {
      if (!desiredHandle) {
        showToast("err", "Username is required (ex: albert_23).");
        return;
      }
      if (!isValidHandle(desiredHandle)) {
        showToast("err", "Username must be 3–20 chars and start with a letter/number.");
        return;
      }

      const { data: taken, error: takenErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("handle", desiredHandle)
        .maybeSingle();

      if (takenErr) {
        showToast("err", "Could not check username. Please try again.");
        return;
      }
      if (taken?.user_id) {
        showToast("err", "That username is taken. Try another.");
        return;
      }

      try { localStorage.setItem("pending_handle", desiredHandle); } catch {}
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          showToast("err", error.message);
          return;
        }

        let userId = data?.user?.id || (await supabase.auth.getUser())?.data?.user?.id;

        if (userId) {
          const ensured = await ensureProfileForUser(userId, desiredHandle);
          if (!ensured.ok) {
            showToast("err", ensured.message || "Failed to save username.");
            return;
          }
        } else {
          showToast("ok", "Account created! Please check your email to confirm.");
          setTimeout(() => {
            router.push(`/login?mode=login&next=${encodeURIComponent(nextUrl)}`);
          }, 2000);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          showToast("err", error.message);
          return;
        }

        const u = (await supabase.auth.getUser())?.data?.user;
        if (u?.id) {
          const ensured = await ensureProfileForUser(u.id, null);
          if (!ensured.ok) {
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
      {/* Toast Overlay */}
      {toast && (
        <div className="fixed left-1/2 top-5 z-[100] -translate-x-1/2 w-[90%] max-w-md">
          <div className={cx(
            "rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-lg text-center animate-in fade-in slide-in-from-top-4",
            toast.type === "ok" ? "border-green-200 text-green-700" : "border-red-200 text-red-600"
          )}>
            {toast.text}
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
      </div>

      <header className="relative mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">Tell Me What You Really Think</div>
            <div className="text-[11px] text-gray-500">{mode === "signup" ? "Create account" : "Welcome back"}</div>
          </div>
        </div>
        <button onClick={() => router.back()} className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50">
          Back
        </button>
      </header>

      <section className="relative mx-auto max-w-md px-6 pt-6 pb-20">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold tracking-tight">{mode === "signup" ? "Create account" : "Log in"}</h1>
            <button
              type="button"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Login instead" : "Create account"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="handle" className="text-sm font-semibold text-gray-800">Username</label>
                <div className={cx(
                  "mt-2 flex items-center rounded-2xl border bg-white p-3 shadow-sm transition-colors",
                  handleError ? "border-red-400" : "border-gray-200 focus-within:border-purple-300"
                )}>
                  <span className="text-sm text-gray-500">@</span>
                  <input id="handle" className="ml-2 w-full text-sm outline-none" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="username" autoComplete="username" />
                </div>
                {handleError && <p className="mt-1 text-xs font-medium text-red-500">{handleError}</p>}
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-sm font-semibold text-gray-800">Email</label>
              <input id="email" className="mt-2 w-full rounded-2xl border border-gray-200 p-3 text-sm outline-none focus:border-blue-300 shadow-sm" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-semibold text-gray-800">Password</label>
                {mode === "login" && (
                  <button type="button" onClick={sendReset} disabled={resetSending} className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-50">
                    {resetSending ? "Sending..." : "Forgot?"}
                  </button>
                )}
              </div>
              <div className="relative mt-2">
                <input 
                  id="password" 
                  className="w-full rounded-2xl border border-gray-200 p-3 pr-12 text-sm outline-none focus:border-purple-300 shadow-sm" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"} 
                  autoComplete={mode === "signup" ? "new-password" : "current-password"} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:opacity-95 disabled:opacity-60 transition-opacity" type="submit">
              {loading ? "Processing..." : mode === "signup" ? "Get Started" : "Sign In"}
            </button>

            <p className="text-center text-[11px] text-gray-400 leading-relaxed px-4">
              By continuing, you’re agreeing to our community guidelines and fair use.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}