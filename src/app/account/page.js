"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  // 3-20 chars, letters/numbers/underscore, cannot start with underscore
  return /^[a-z0-9][a-z0-9_]{2,19}$/.test(handle);
}

export default function AccountPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // form state
  const [handleInput, setHandleInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const [savingHandle, setSavingHandle] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const cleanHandle = useMemo(() => normalizeHandle(handleInput), [handleInput]);
  const handleOk = useMemo(
    () => (cleanHandle ? isValidHandle(cleanHandle) : false),
    [cleanHandle]
  );

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;

      if (!u) {
        router.push("/login?mode=login&next=/account");
        return;
      }

      if (!alive) return;
      setUser(u);
      setEmailInput(u.email || "");

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("handle")
        .eq("user_id", u.id)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error("PROFILE LOAD ERROR:", error);
      }

      setProfile(prof || null);
      setHandleInput(prof?.handle || "");
      setLoading(false);
    }

    boot();

    return () => {
      alive = false;
    };
  }, [router]);

  async function saveHandle() {
    if (!user?.id) return;

    const next = cleanHandle;

    if (!isValidHandle(next)) {
      alert("Username must be 3–20 chars, letters/numbers/underscore, start with letter/number.");
      return;
    }

    if (next === profile?.handle) {
      alert("That’s already your username.");
      return;
    }

    try {
      setSavingHandle(true);

      // quick pre-check (nice UX) — still rely on unique index for real enforcement
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("handle", next)
        .maybeSingle();

      if (existing?.user_id && existing.user_id !== user.id) {
        alert("That username is taken.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ handle: next, handle_updated_at: new Date().toISOString(), })
        .eq("user_id", user.id);

      if (error) {
        // If unique index triggers, you'll usually see a duplicate key style error
        console.error("HANDLE UPDATE ERROR:", error);
        alert(error.message || "Could not update username.");
        return;
      }

      setProfile((p) => ({ ...(p || {}), handle: next }));
      alert("Username updated.");
    } finally {
      setSavingHandle(false);
    }
  }

  async function saveEmail() {
    const next = String(emailInput || "").trim();

    if (!next || !next.includes("@")) {
      alert("Enter a valid email.");
      return;
    }

    if (!user?.email) return;
    if (next.toLowerCase() === user.email.toLowerCase()) {
      alert("That’s already your email.");
      return;
    }

    try {
      setSavingEmail(true);

      const { data, error } = await supabase.auth.updateUser({ email: next });

      if (error) {
        console.error("EMAIL UPDATE ERROR:", error);
        alert(
          error.message ||
            "Could not update email. You may need to log in again (recent login required)."
        );
        return;
      }

      // Supabase usually sends a confirmation email depending on your auth settings.
      // The session email may not change immediately until confirmed.
      alert("Email update requested. Check your inbox to confirm.");
      // refresh user in state (optional)
      const { data: fresh } = await supabase.auth.getUser();
      setUser(fresh?.data?.user || data?.user || user);
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePassword() {
    if (!pw1 || pw1.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      alert("Passwords don’t match.");
      return;
    }

    try {
      setSavingPw(true);

      const { error } = await supabase.auth.updateUser({ password: pw1 });

      if (error) {
        console.error("PASSWORD UPDATE ERROR:", error);
        alert(
          error.message ||
            "Could not update password. You may need to log in again (recent login required)."
        );
        return;
      }

      setPw1("");
      setPw2("");
      alert("Password updated.");
    } finally {
      setSavingPw(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Loading…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-3xl px-6 pb-16 pt-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Account
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
              Settings
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Update your username, email, and password.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={logout}
              className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Username */}
        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-gray-900">Username</h2>
          <p className="mt-1 text-sm text-gray-600">
            This is your public @handle.
          </p>

          <div className="mt-4 grid gap-3">
            <label className="text-xs font-semibold text-gray-700">Handle</label>
            <input
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              placeholder="e.g. albert_23"
              className={cx(
                "h-11 w-full rounded-2xl border bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none",
                handleInput.length > 0 && !handleOk
                  ? "border-red-300 focus:border-red-400"
                  : "border-gray-200 focus:border-gray-300"
              )}
            />
            <div className="text-[12px] text-gray-500">
              Preview: <span className="font-semibold text-gray-900">@{cleanHandle || "..."}</span>
              {!handleOk && handleInput.length > 0 && (
                <span className="ml-2 font-semibold text-red-600">
                  invalid
                </span>
              )}
            </div>

            <button
              onClick={saveHandle}
              disabled={!handleOk || savingHandle}
              className={cx(
                "mt-2 inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold shadow-sm",
                !handleOk || savingHandle
                  ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-95"
              )}
            >
              {savingHandle ? "Saving…" : "Save username"}
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-gray-900">Email</h2>
          <p className="mt-1 text-sm text-gray-600">
            Changing email may require confirmation.
          </p>

          <div className="mt-4 grid gap-3">
            <label className="text-xs font-semibold text-gray-700">Email</label>
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none focus:border-gray-300"
            />

            <button
              onClick={saveEmail}
              disabled={savingEmail}
              className={cx(
                "mt-2 inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold shadow-sm",
                savingEmail
                  ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-95"
              )}
            >
              {savingEmail ? "Saving…" : "Save email"}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-gray-900">Password</h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose a strong password (8+ characters).
          </p>

          <div className="mt-4 grid gap-3">
            <label className="text-xs font-semibold text-gray-700">New password</label>
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none focus:border-gray-300"
            />

            <label className="text-xs font-semibold text-gray-700">Confirm new password</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none focus:border-gray-300"
            />

            <button
              onClick={savePassword}
              disabled={savingPw}
              className={cx(
                "mt-2 inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold shadow-sm",
                savingPw
                  ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-95"
              )}
            >
              {savingPw ? "Saving…" : "Update password"}
            </button>
          </div>
        </div>

        {/* Current */}
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-gray-900">Current info</h2>
          <div className="mt-3 text-sm text-gray-700">
            <div>
              <span className="text-gray-500">Email:</span>{" "}
              <span className="font-semibold">{user?.email || "—"}</span>
            </div>
            <div className="mt-1">
              <span className="text-gray-500">Username:</span>{" "}
              <span className="font-semibold">@{profile?.handle || "—"}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}