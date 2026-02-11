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

function isValidEmail(email) {
  // basic + safe check; Supabase will also validate
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// ✅ password rules (adjust if your Create page uses different ones)
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

/** Header menu (top-right ☰) */
function HeaderMenu({
  open,
  onToggle,
  onClose,
  onDashboard,
  onProfile,
  onAccount,
  onLogout,
}) {
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-white shadow-sm",
          "border-gray-200 text-gray-900 hover:bg-gray-50"
        )}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        title="Menu"
      >
        <span className="text-xl leading-none">☰</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
          role="menu"
        >
          <button
            type="button"
            onClick={() => {
              onClose?.();
              onProfile?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
            role="menuitem"
          >
            Profile
            <div className="mt-0.5 text-[11px] font-medium text-gray-500">
              view my public page
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose?.();
              onAccount?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
            role="menuitem"
          >
            Account settings
            <div className="mt-0.5 text-[11px] font-medium text-gray-500">
              username, email, password
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose?.();
              onDashboard?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
            role="menuitem"
          >
            Dashboard
            <div className="mt-0.5 text-[11px] font-medium text-gray-500">
              back to my surveys
            </div>
          </button>

          <div className="h-px bg-gray-200" />

          <button
            type="button"
            onClick={() => {
              onClose?.();
              onLogout?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 focus:bg-red-50"
            role="menuitem"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function PencilButton({ onClick, title = "Edit" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
    >
      <span className="text-lg leading-none">✎</span>
    </button>
  );
}

export default function AccountPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // header menu
  const [openHeaderMenu, setOpenHeaderMenu] = useState(false);

  // edit modes
  const [editHandle, setEditHandle] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [editPassword, setEditPassword] = useState(false);

  // form values (NEW inputs)
  const [handleInput, setHandleInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  // saving states
  const [savingHandle, setSavingHandle] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // live username availability state
  // "idle" | "checking" | "available" | "taken" | "invalid" | "same" | "error"
  const [handleAvail, setHandleAvail] = useState("idle");

  // messages
  const [toast, setToast] = useState(null); // {type:"ok"|"err", text:""}

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
  }

  async function doLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // close menu on outside click / escape
  useEffect(() => {
    function closeAll() {
      setOpenHeaderMenu(false);
    }
    function onKey(e) {
      if (e.key === "Escape") closeAll();
    }
    window.addEventListener("click", closeAll);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", closeAll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

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

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("handle")
        .eq("user_id", u.id)
        .maybeSingle();

      if (error) console.error("ACCOUNT LOAD PROFILE ERROR:", error);

      if (!alive) return;
      setProfile(prof || null);

      // keep NEW inputs empty by default
      setHandleInput("");
      setEmailInput("");

      setLoading(false);
    }

    boot();
    return () => {
      alive = false;
    };
  }, [router]);

  // ===== validity =====
  const normalizedHandle = useMemo(
    () => normalizeHandle(handleInput),
    [handleInput]
  );

  // live availability check (debounced)
  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!editHandle) {
        setHandleAvail("idle");
        return;
      }

      const current = profile?.handle || "";
      const next = normalizedHandle;

      if (!next) {
        setHandleAvail("idle");
        return;
      }

      if (!isValidHandle(next)) {
        setHandleAvail("invalid");
        return;
      }

      if (next === current) {
        setHandleAvail("same");
        return;
      }

      setHandleAvail("checking");

      const { data: existing, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("handle", next)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("HANDLE AVAIL ERROR:", error);
        setHandleAvail("error");
        return;
      }

      if (!existing) {
        setHandleAvail("available");
        return;
      }

      if (existing?.user_id && existing.user_id === user?.id) {
        setHandleAvail("same");
        return;
      }

      setHandleAvail("taken");
    }

    const t = setTimeout(check, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [editHandle, normalizedHandle, profile?.handle, user?.id]);

  const handleIsValid = useMemo(() => {
    if (!editHandle) return false;
    if (!normalizedHandle) return false;
    if (!isValidHandle(normalizedHandle)) return false;
    if ((profile?.handle || "") === normalizedHandle) return false;
    if (handleAvail !== "available") return false;
    return true;
  }, [editHandle, normalizedHandle, profile?.handle, handleAvail]);

  const emailIsValid = useMemo(() => {
    if (!editEmail) return false;
    const next = String(emailInput || "").trim().toLowerCase();
    if (!next) return false;
    if (!isValidEmail(next)) return false;
    if ((user?.email || "").toLowerCase() === next) return false;
    return true;
  }, [editEmail, emailInput, user?.email]);

  const pwRules = useMemo(() => passwordChecks(pw1), [pw1]);

  const passwordIsValid = useMemo(() => {
    if (!editPassword) return false;
    const a = String(pw1 || "");
    const b = String(pw2 || "");
    if (!allPasswordRulesPass(a)) return false; // ✅ rules
    if (a !== b) return false; // ✅ match
    return true;
  }, [editPassword, pw1, pw2]);

  // ===== actions =====
  async function saveHandle() {
    if (!user?.id) return;
    if (!handleIsValid) return;

    setSavingHandle(true);
    try {
      const next = normalizedHandle;

      const { data: existing, error: checkErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("handle", next)
        .maybeSingle();

      if (checkErr) {
        console.error(checkErr);
        showToast("err", "Could not check username.");
        return;
      }

      if (existing?.user_id && existing.user_id !== user.id) {
        showToast("err", "That username is taken.");
        return;
      }

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          handle: next,
          handle_updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (upErr) {
        console.error(upErr);
        showToast("err", upErr.message || "Failed to update username.");
        return;
      }

      setProfile((p) => ({ ...(p || {}), handle: next }));
      setEditHandle(false);
      setHandleInput("");
      setHandleAvail("idle");
      showToast("ok", "Username updated.");
    } finally {
      setSavingHandle(false);
    }
  }

  async function saveEmail() {
    if (!emailIsValid) return;

    setSavingEmail(true);
    try {
      const next = String(emailInput || "").trim();

      const { error } = await supabase.auth.updateUser({ email: next });

      if (error) {
        console.error(error);
        showToast("err", error.message || "Email update failed.");
        return;
      }

      setEditEmail(false);
      setEmailInput("");
      showToast("ok", "Check your email to confirm the change.");
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePassword() {
    if (!passwordIsValid) return;

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });

      if (error) {
        console.error(error);
        showToast("err", error.message || "Password update failed.");
        return;
      }

      setPw1("");
      setPw2("");
      setEditPassword(false);
      showToast("ok", "Password updated.");
    } finally {
      setSavingPassword(false);
    }
  }

  function cancelHandle() {
    setHandleInput("");
    setHandleAvail("idle");
    setEditHandle(false);
  }

  function cancelEmail() {
    setEmailInput("");
    setEditEmail(false);
  }

  function cancelPassword() {
    setPw1("");
    setPw2("");
    setEditPassword(false);
  }

  function RuleLine({ ok, children }) {
    return (
      <div
        className={cx(
          "text-[11px] font-semibold",
          ok ? "text-green-700" : "text-gray-500"
        )}
      >
        {ok ? "✓ " : "• "}
        {children}
      </div>
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

      {toast && (
        <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2">
          <div
            className={cx(
              "rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm",
              toast.type === "ok"
                ? "border-green-200 text-green-700"
                : "border-red-200 text-red-600"
            )}
          >
            {toast.text}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="relative mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <a href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">Account</div>
            <div className="text-[11px] text-gray-500">
              username, email, password
            </div>
          </div>
        </a>

        <div className="flex w-full flex-row items-center justify-end gap-2 sm:w-auto sm:gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="p-1 text-gray-900 hover:opacity-60"
            title="Back"
            aria-label="Back"
          >
            <span className="text-3xl font-semibold leading-none">←</span>
          </button>

          <HeaderMenu
            open={openHeaderMenu}
            onToggle={() => setOpenHeaderMenu((v) => !v)}
            onClose={() => setOpenHeaderMenu(false)}
            onDashboard={() => router.push("/dashboard")}
            onAccount={() => router.refresh()}
            onProfile={() => router.push(`/u/${profile?.handle || ""}`)}
            onLogout={() => doLogout()}
          />
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Loading…</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {/* Username */}
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold tracking-tight text-gray-900">
                    Username
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Your public handle (letters, numbers, underscore).
                  </p>
                </div>

                {!editHandle && (
                  <PencilButton
                    onClick={() => {
                      setHandleInput("");
                      setHandleAvail("idle");
                      setEditHandle(true);
                    }}
                  />
                )}
              </div>

              {!editHandle ? (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                  @{profile?.handle || "—"}
                </div>
              ) : (
                <div className="mt-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                    Current: @{profile?.handle || "—"}
                  </div>

                  <label className="mt-4 block text-xs font-semibold text-gray-700">
                    New username
                  </label>
                  <input
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    placeholder="new_username"
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm outline-none focus:border-gray-300"
                  />

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-[11px] font-medium text-gray-500">
                      Preview:{" "}
                      <span className="font-semibold">
                        @{normalizedHandle || "—"}
                      </span>
                    </div>

                    {handleAvail === "checking" && (
                      <div className="text-[11px] font-semibold text-gray-500">
                        Checking…
                      </div>
                    )}
                    {handleAvail === "available" && (
                      <div className="text-[11px] font-semibold text-green-700">
                        Available ✅
                      </div>
                    )}
                    {handleAvail === "taken" && (
                      <div className="text-[11px] font-semibold text-red-600">
                        Not available ❌
                      </div>
                    )}
                    {handleAvail === "same" && (
                      <div className="text-[11px] font-semibold text-gray-500">
                        Same as current
                      </div>
                    )}
                    {handleAvail === "error" && (
                      <div className="text-[11px] font-semibold text-red-600">
                        Couldn’t check
                      </div>
                    )}
                  </div>

                  {!normalizedHandle || !isValidHandle(normalizedHandle) ? (
                    <div className="mt-2 text-[11px] font-semibold text-red-600">
                      Must be 3–20 chars. Letters/numbers/underscore. Can’t start
                      with “_”.
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveHandle}
                      disabled={!handleIsValid || savingHandle}
                      className={cx(
                        "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm",
                        !handleIsValid || savingHandle
                          ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                          : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-95"
                      )}
                    >
                      {savingHandle ? "Saving…" : "Save username"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelHandle}
                      className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold tracking-tight text-gray-900">
                    Email
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Changing email may require confirmation.
                  </p>
                </div>

                {!editEmail && (
                  <PencilButton
                    onClick={() => {
                      setEmailInput("");
                      setEditEmail(true);
                    }}
                  />
                )}
              </div>

              {!editEmail ? (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                  {user?.email || "—"}
                </div>
              ) : (
                <div className="mt-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                    Current: {user?.email || "—"}
                  </div>

                  <label className="mt-4 block text-xs font-semibold text-gray-700">
                    New email
                  </label>
                  <input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    inputMode="email"
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm outline-none focus:border-gray-300"
                  />

                  {emailInput && !isValidEmail(emailInput) ? (
                    <div className="mt-2 text-[11px] font-semibold text-red-600">
                      Enter a valid email address.
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveEmail}
                      disabled={!emailIsValid || savingEmail}
                      className={cx(
                        "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm",
                        !emailIsValid || savingEmail
                          ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                          : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-95"
                      )}
                    >
                      {savingEmail ? "Saving…" : "Save email"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEmail}
                      className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold tracking-tight text-gray-900">
                    Password
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Use a strong password.
                  </p>
                </div>

                {!editPassword && (
                  <PencilButton onClick={() => setEditPassword(true)} />
                )}
              </div>

              {!editPassword ? (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-500">
                  ••••••••
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                    Current: ••••••••
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      New password
                    </label>
                    <input
                      type="password"
                      value={pw1}
                      onChange={(e) => setPw1(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm outline-none focus:border-gray-300"
                      placeholder="********"
                    />

                    {/* ✅ inline password rules */}
                    <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="mb-2 text-[11px] font-extrabold text-gray-700">
                        Password must include:
                      </div>
                      <div className="grid gap-1">
                        <RuleLine ok={pwRules.len}>At least 8 characters</RuleLine>
                        <RuleLine ok={pwRules.upper}>An uppercase letter</RuleLine>
                        <RuleLine ok={pwRules.lower}>A lowercase letter</RuleLine>
                        <RuleLine ok={pwRules.number}>A number</RuleLine>
                        <RuleLine ok={pwRules.special}>A special character</RuleLine>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm outline-none focus:border-gray-300"
                      placeholder="********"
                    />
                  </div>

                  {editPassword && pw1 && pw2 && pw1 !== pw2 ? (
                    <div className="text-[11px] font-semibold text-red-600">
                      Passwords do not match.
                    </div>
                  ) : null}

                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={savePassword}
                      disabled={!passwordIsValid || savingPassword}
                      className={cx(
                        "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm",
                        !passwordIsValid || savingPassword
                          ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                          : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-95"
                      )}
                    >
                      {savingPassword ? "Saving…" : "Save password"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelPassword}
                      className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}