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

// Password Validation Logic
function passwordChecks(pw) {
  const s = String(pw || "");
  return {
    len: s.length >= 8,
    upper: /[A-Z]/.test(s),
    lower: /[a-z]/.test(s),
    number: /[0-9]/.test(s),
    special: /[^A-Za-z0-9]/.test(s),
  };
}

function allPasswordRulesPass(pw) {
  const c = passwordChecks(pw);
  return c.len && c.upper && c.lower && c.number && c.special;
}

function RuleLine({ ok, children }) {
  return (
    <div className={cx("text-[11px] font-semibold transition-colors", ok ? "text-green-700" : "text-gray-400")}>
      {ok ? "✓ " : "• "}{children}
    </div>
  );
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/") ? n : "/dashboard";
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

  // Real-time password validation
  const pwRules = useMemo(() => passwordChecks(password), [password]);
  const isPasswordOk = useMemo(() => allPasswordRulesPass(password), [password]);

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

  /**
   * GOOGLE OAUTH LOGIN
   */
  async function loginWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    });
    if (error) {
      showToast("err", error.message);
      setLoading(false);
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

      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
      </div>

      {/* CENTRALIZED HEADER */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-full sm:max-w-6xl px-4 py-4 sm:px-6">
          <div className="grid grid-cols-3 items-center">
            
            {/* Left Column: Back Button */}
            <div className="flex justify-start">
              <button 
                onClick={() => router.back()}
                className="group flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
              >
                <span className="text-base transition-transform group-hover:-translate-x-0.5">←</span>
                <span className="hidden sm:inline">Back</span>
              </button>
            </div>

            {/* Center Column: Spectrum Branding */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className="font-spectrum text-2xl font-bold tracking-tighter text-gray-900 sm:text-3xl">
                Psychelytics
              </span>
              <div className="hidden sm:block text-[9px] font-black uppercase tracking-[0.35em] text-gray-400 mt-0.5">
                Tell Me What You Really Think
              </div>
            </div>

            {/* Right Column: Empty to balance grid */}
            <div className="flex justify-end"></div>
          </div>
        </div>
      </header>

      {/* AUTH FORM */}
      <section className="relative mx-auto max-w-md px-6 pt-10 pb-20">
        <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              {mode === "signup" ? "Create account" : "Welcome back"}
            </h1>
            <button
              type="button"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Log in instead" : "Create account"}
            </button>
          </div>

          {/* SOCIAL LOGIN */}
          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
              <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
              <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
              <path d="M12.0004 24C15.2404 24 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24 12.0004 24Z" fill="#34A853" />
            </svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-100"></div>
            <span className="px-3 text-[10px] font-black uppercase tracking-widest text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-100"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="handle" className="text-sm font-semibold text-gray-800">Username</label>
                <div className={cx(
                  "mt-2 flex items-center rounded-2xl border bg-white p-3 shadow-sm transition-colors",
                  handleError ? "border-red-400" : "border-gray-200 focus-within:border-purple-300"
                )}>
                  <span className="text-sm font-bold text-gray-400">@</span>
                  <input id="handle" className="ml-2 w-full text-sm font-semibold outline-none placeholder:font-normal" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="username" autoComplete="username" />
                </div>
                {handleError && <p className="mt-1.5 text-xs font-medium text-red-500">{handleError}</p>}
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-sm font-semibold text-gray-800">Email</label>
              <input id="email" className="mt-2 w-full rounded-2xl border border-gray-200 p-3 text-sm font-semibold outline-none focus:border-blue-300 shadow-sm placeholder:font-normal" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-semibold text-gray-800">Password</label>
                {mode === "login" && (
                  <button type="button" onClick={sendReset} disabled={resetSending} className="text-[11px] font-bold text-blue-600 hover:underline disabled:opacity-50">
                    {resetSending ? "Sending..." : "Forgot password?"}
                  </button>
                )}
              </div>
              <div className="relative mt-2">
                <input 
                  id="password" 
                  className="w-full rounded-2xl border border-gray-200 p-3 pr-12 text-sm font-semibold outline-none focus:border-purple-300 shadow-sm placeholder:font-normal" 
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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Real-Time Checklist */}
              {mode === "signup" && (
                <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Requirements</div>
                  <RuleLine ok={pwRules.len}>8+ characters</RuleLine>
                  <RuleLine ok={pwRules.upper}>One uppercase letter</RuleLine>
                  <RuleLine ok={pwRules.lower}>One lowercase letter</RuleLine>
                  <RuleLine ok={pwRules.number}>One number</RuleLine>
                  <RuleLine ok={pwRules.special}>One special character</RuleLine>
                </div>
              )}
            </div>

            <button 
              disabled={loading || (mode === "signup" && (!!handleError || !isPasswordOk))} 
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md hover:opacity-95 disabled:opacity-50 transition-all active:scale-[0.98]" 
              type="submit"
            >
              {loading ? "Processing..." : mode === "signup" ? "Create Account" : "Sign In"}
            </button>

            <p className="text-center text-[10px] font-medium text-gray-400 leading-relaxed px-4 mt-4">
              By continuing, you’re agreeing to our community guidelines and fair use.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}