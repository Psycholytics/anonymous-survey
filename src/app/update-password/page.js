"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Same logic from Account Page for parity
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

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [linkErr, setLinkErr] = useState("");

  // Toast System
  const [toast, setToast] = useState(null);
  function showToast(type, text) {
    setToast({ type, text });
    if (type !== "loading") {
      setTimeout(() => setToast(null), 3500);
    }
  }

  // Real-time validation
  const pwRules = useMemo(() => passwordChecks(pw1), [pw1]);
  const ok = useMemo(() => {
    return allPasswordRulesPass(pw1) && pw1 === pw2;
  }, [pw1, pw2]);

  useEffect(() => {
    let alive = true;
    async function init() {
      setVerifying(true);
      try {
        const { data: s1 } = await supabase.auth.getSession();
        if (s1?.session) {
          if (!alive) return;
          setSessionOk(true);
          setVerifying(false);
          return;
        }

        const href = window.location.href;
        await supabase.auth.exchangeCodeForSession(href);
        const { data: s2 } = await supabase.auth.getSession();

        if (!alive) return;
        if (s2?.session) {
          setSessionOk(true);
        } else {
          setLinkErr("This reset link is invalid or expired.");
        }
      } catch (err) {
        if (alive) setLinkErr("Something went wrong verifying this link.");
      } finally {
        if (alive) setVerifying(false);
      }
    }
    init();
    return () => { alive = false; };
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!ok || !sessionOk) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) {
        showToast("err", error.message);
        return;
      }

      await supabase.auth.signOut();
      showToast("ok", "Password updated successfully!");
      
      // Delay redirect so they see the success toast
      setTimeout(() => {
        router.push("/login?mode=login&next=/dashboard");
      }, 2000);
    } finally {
      setLoading(false);
    }
  }

  function RuleLine({ ok, children }) {
    return (
      <div className={cx("text-[11px] font-semibold transition-colors", ok ? "text-green-700" : "text-gray-400")}>
        {ok ? "✓ " : "• "}{children}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 flex items-center justify-center px-6">
      {/* Consistent background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[100] -translate-x-1/2 w-[90%] max-w-md pointer-events-none">
          <div className={cx(
            "rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-lg text-center animate-in fade-in slide-in-from-top-4",
            toast.type === "ok" ? "border-green-200 text-green-700" : "border-red-200 text-red-600"
          )}>
            {toast.text}
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white/80 p-8 shadow-xl backdrop-blur-xl animate-in zoom-in-95">
        <div className="mb-6 flex justify-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
        </div>

        <h1 className="text-xl font-extrabold tracking-tight text-center">Set a new password</h1>
        <p className="mt-2 text-sm text-gray-500 text-center">Please choose a strong, unique password.</p>

        {verifying ? (
          <div className="mt-8 flex justify-center py-4">
            <div className="text-sm font-semibold text-gray-400 animate-pulse">Verifying security link...</div>
          </div>
        ) : !sessionOk ? (
          <div className="mt-8">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
              <p className="text-sm font-semibold text-red-600">{linkErr}</p>
            </div>
            <button onClick={() => router.push("/login?mode=login")} className="mt-4 w-full rounded-2xl border border-gray-200 py-3 text-sm font-bold shadow-sm hover:bg-gray-50">
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-end px-1">
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showPassword ? "Hide passwords" : "Show passwords"}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-2xl border border-gray-200 p-3 pr-12 text-sm outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-500/5 transition-all shadow-sm bg-white"
                />
              </div>
              
              <div className="rounded-2xl border border-gray-50 bg-gray-50/50 p-4">
                <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Requirements</div>
                <RuleLine ok={pwRules.len}>8+ characters</RuleLine>
                <RuleLine ok={pwRules.upper}>One uppercase letter</RuleLine>
                <RuleLine ok={pwRules.number}>One number</RuleLine>
                <RuleLine ok={pwRules.special}>One special character</RuleLine>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-2xl border border-gray-200 p-3 pr-12 text-sm outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-500/5 transition-all shadow-sm bg-white"
                />
              </div>
              {pw1 !== pw2 && pw2 && (
                <p className="text-[11px] font-bold text-red-500 px-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!ok || loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 py-3 text-sm font-bold text-white shadow-md hover:opacity-95 disabled:opacity-40 transition-all"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}