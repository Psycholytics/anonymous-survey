"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getExpiryMeta(expiresAt) {
  if (!expiresAt) return { isExpired: false, label: "No expiry", sublabel: "" };
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  const diff = end - now;
  const isExpired = diff <= 0;
  const abs = Math.abs(diff);
  const totalMinutes = Math.floor(abs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const time = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return {
    isExpired,
    label: isExpired ? "Expired" : "Active",
    sublabel: isExpired ? `Expired ${time} ago` : `Expires in ${time}`,
  };
}

function canStillUnlockSurvey(survey) {
  if (!survey) return false;
  if (survey.is_paid) return false;
  const unlockDeadlineMs = survey.unlock_deadline
    ? new Date(survey.unlock_deadline).getTime()
    : survey.expires_at
      ? new Date(survey.expires_at).getTime() + 30 * 24 * 60 * 60 * 1000
      : null;
  if (!unlockDeadlineMs) return true;
  return Date.now() < unlockDeadlineMs;
}

function getDeletionCountdown(expiresAt) {
  if (!expiresAt) return null;
  const deleteAt = new Date(expiresAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  const diff = deleteAt - Date.now();
  if (diff <= 0) return "Deleting soon";
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return `Deletes in ${days} day${days === 1 ? "" : "s"}`;
}

async function waitForPaid(
  surveyId,
  { timeoutMs = 12000, intervalMs = 800 } = {}
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data, error } = await supabase
      .from("surveys")
      .select("is_paid")
      .eq("id", surveyId)
      .maybeSingle();
    if (!error && data?.is_paid) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/** 3-dot menu for each survey card */
function CardMenu({ open, onToggle, onRename, onDelete }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-white shadow-sm transition-all",
          "border-gray-200 text-gray-700 hover:bg-gray-50",
          open && "border-gray-300 bg-gray-50"
        )}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        title="More"
      >
        <span className="text-xl leading-none">⋯</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2"
          role="menu"
        >
          <button
            type="button"
            onClick={onRename}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
            role="menuitem"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            role="menuitem"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** Header menu (top-right ☰) */
function HeaderMenu({ open, onToggle, onClose, onProfile, onSettings, onLogout }) {
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
          className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2"
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
              avatar, banner, public page
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose?.();
              onSettings?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
            role="menuitem"
          >
            Account settings
            <div className="mt-0.5 text-[11px] font-medium text-gray-500">
              email, password, username
            </div>
          </button>

          <div className="h-px bg-gray-100" />

          <button
            type="button"
            onClick={async () => {
              onClose?.();
              await onLogout?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            role="menuitem"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");
  const unlocked = searchParams.get("unlocked");

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);

  const PREVIEW_LIMIT = 5;
  const [expanded, setExpanded] = useState({});
  
  // TOAST STATE
  const [toast, setToast] = useState(null);
  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }

  // RENAME MODAL STATE
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [openMenuId, setOpenMenuId] = useState(null);
  const [openHeaderMenu, setOpenHeaderMenu] = useState(false);

  useEffect(() => {
    const created = searchParams.get("created");
    if (created === "1") {
      showToast("ok", "🎉 your survey is created - ready to share.");
    }
  }, [searchParams]);

  useEffect(() => {
    function closeAll() {
      setOpenMenuId(null);
      setOpenHeaderMenu(false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        closeAll();
        setRenamingId(null);
      }
    }
    window.addEventListener("click", closeAll);
    window.addEventListener("scroll", closeAll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", closeAll);
      window.removeEventListener("scroll", closeAll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const detailExpiry = useMemo(() => {
    if (!survey?.expires_at) return { isExpired: false, label: "", sublabel: "" };
    return getExpiryMeta(survey.expires_at);
  }, [survey?.expires_at]);

  const isLocked = useMemo(() => {
    if (!survey) return false;
    return !survey.is_paid;
  }, [survey]);

  const groupedByQuestion = useMemo(() => {
    const map = new Map();
    for (const q of questions) map.set(q.id, []);
    for (const r of responses) {
      if (!map.has(r.question_id)) map.set(r.question_id, []);
      map.get(r.question_id).push(r);
    }
    return map;
  }, [questions, responses]);

  useEffect(() => {
    let alive = true;
    async function boot() {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;
      if (!u) {
        router.push(`/login?mode=login&next=/dashboard${surveyId ? `?surveyId=${surveyId}` : ""}`);
        return;
      }
      if (!alive) return;
      setUser(u);

      const { data: prof } = await supabase.from("profiles").select("handle").eq("user_id", u.id).maybeSingle();
      if (!prof?.handle) {
        router.push(`/claim-handle?next=/dashboard${surveyId ? `?surveyId=${surveyId}` : ""}`);
        return;
      }
      setProfile(prof);

      if (surveyId) {
        await loadDetail(u.id, surveyId);
        if (unlocked === "1") {
          const ok = await waitForPaid(surveyId);
          if (ok) await loadDetail(u.id, surveyId);
        }
      } else {
        await loadList();
      }
      if (alive) setLoading(false);
    }
    boot();
    return () => { alive = false; };
  }, [surveyId, unlocked]);

  async function loadList() {
    const { data, error } = await supabase.rpc("dashboard_survey_summaries");
    if (!error) setSurveys(data || []);
  }

  async function loadDetail(userId, sId) {
    const { data: surveyRow } = await supabase.from("surveys").select("*").eq("id", sId).single();
    if (surveyRow?.owner_id !== userId) {
      router.push("/dashboard");
      return;
    }
    setSurvey(surveyRow);

    const { data: qRows } = await supabase.from("questions").select("*").eq("survey_id", sId).order("position", { ascending: true });
    setQuestions(qRows || []);

    const { data: rRows } = await supabase.from("responses").select("*").eq("survey_id", sId).order("created_at", { ascending: false });
    setResponses(rRows || []);

    await supabase.from("surveys").update({ last_viewed_at: new Date().toISOString() }).eq("id", sId);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("ok", "Copied to clipboard!");
    } catch {
      showToast("err", "Copy failed");
    }
  }

  async function handleRename() {
    const newTitle = renameValue.trim();
    if (!newTitle) {
      showToast("err", "Title can't be empty.");
      return;
    }
    const { error } = await supabase.from("surveys").update({ title: newTitle }).eq("id", renamingId).eq("owner_id", user?.id);
    if (error) {
      showToast("err", error.message);
    } else {
      showToast("ok", "Survey renamed");
      setRenamingId(null);
      await loadList();
    }
  }

  async function deleteSurvey(id, title) {
    if (!confirm(`Delete "${title}"? This will remove all responses.`)) return;
    const { error } = await supabase.from("surveys").delete().eq("id", id).eq("owner_id", user.id);
    if (error) {
      showToast("err", error.message);
    } else {
      showToast("ok", "Survey deleted");
      if (surveyId === id) router.push("/dashboard");
      else await loadList();
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* BACKGROUND GLOWS */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed left-1/2 top-5 z-[100] -translate-x-1/2 w-[90%] max-w-md pointer-events-none">
          <div className={cx(
            "rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-xl text-center animate-in fade-in slide-in-from-top-4",
            toast.type === "ok" ? "border-green-200 text-green-700" : "border-red-200 text-red-600"
          )}>
            {toast.text}
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renamingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/20 backdrop-blur-sm px-6" onClick={() => setRenamingId(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold tracking-tight">Rename Survey</h3>
            <input 
              autoFocus
              className="mt-4 w-full rounded-2xl border border-gray-200 p-3 text-sm outline-none focus:border-blue-300 shadow-sm"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="mt-6 flex gap-3">
              <button onClick={() => setRenamingId(null)} className="flex-1 rounded-2xl border border-gray-200 py-2.5 text-sm font-bold hover:bg-gray-50">Cancel</button>
              <button onClick={handleRename} className="flex-1 rounded-2xl bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-gray-800 shadow-md">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="relative mx-auto max-w-full sm:max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight">Dashboard</div>
              <div className="text-[11px] text-gray-500">{surveyId ? "Survey detail" : "My surveys"}</div>
            </div>
          </div>
          <HeaderMenu
            open={openHeaderMenu}
            onToggle={() => setOpenHeaderMenu((v) => !v)}
            onClose={() => setOpenHeaderMenu(false)}
            onProfile={() => profile?.handle && router.push(`/u/${profile.handle}`)}
            onSettings={() => router.push("/account")}
            onLogout={logout}
          />
        </div>
        <div className="mt-4">
          <button
            onClick={() => router.push("/create")}
            className="w-full inline-flex items-center justify-center h-12 rounded-3xl px-5 text-sm font-extrabold text-white shadow-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-95 active:scale-[0.99] transition"
          >
            New survey
          </button>
        </div>
      </header>

      <section className="relative mx-auto max-w-full sm:max-w-6xl px-4 pb-20 sm:px-6">
        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
          </div>
        ) : !surveyId ? (
          /* LIST VIEW */
          <div className="grid gap-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h1 className="text-xl font-extrabold tracking-tight">My Surveys</h1>
              <p className="mt-1 text-sm text-gray-600">Click a survey to view responses + share link.</p>
            </div>

            {surveys.length === 0 ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-600">No surveys yet.</p>
                <button onClick={() => router.push("/create")} className="mt-4 inline-flex rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                  Create your first survey
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {surveys.map((s) => {
                  const url = `${origin}/survey/${s.id}`;
                  const expiry = getExpiryMeta(s.expires_at);
                  const linkDisabled = expiry.isExpired;
                  return (
                    <div key={s.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="truncate text-base font-extrabold text-gray-900">{s.title || "Untitled survey"}</p>
                            <span className={cx("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold", expiry.isExpired ? "border-gray-200 bg-gray-50 text-gray-600" : "border-green-200 bg-green-50 text-green-700")}>
                              {expiry.label}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                            <span>{s.response_count ?? 0} response{(s.response_count === 1) ? "" : "s"}</span>
                            {s.new_count > 0 && <span className="rounded-full bg-blue-600 px-2 py-1 text-[11px] font-extrabold text-white">+{s.new_count} new</span>}
                            <span className={cx("font-semibold", s.is_paid ? "text-green-600" : "text-gray-500")}>{s.is_paid ? "Unlocked" : "Locked"}</span>
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <CardMenu
                            open={openMenuId === s.id}
                            onToggle={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}
                            onRename={() => { setRenamingId(s.id); setRenameValue(s.title || ""); }}
                            onDelete={() => deleteSurvey(s.id, s.title)}
                          />
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                        <button onClick={() => router.push(`/dashboard?surveyId=${s.id}`)} className="col-span-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50">Open</button>
                        <button 
                          onClick={() => !linkDisabled && copy(url)} 
                          disabled={linkDisabled} 
                          className={cx("col-span-1 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all", linkDisabled ? "border border-gray-200 bg-gray-100 text-gray-400" : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-95")}
                        >
                          {linkDisabled ? "Expired" : "Copy link"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* DETAIL VIEW */
          <div className="grid gap-4">
            <div className="-mt-2">
              <button onClick={() => router.push("/dashboard")} className="text-xs font-semibold text-gray-600 hover:text-gray-900">← My Surveys</button>
            </div>
            <div className="px-1 pt-2 pb-2">
              <h1 className="truncate text-3xl font-extrabold tracking-tight text-gray-900">{survey?.title || "Survey"}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className={cx("rounded-full border px-3 py-1 text-sm font-semibold shadow-sm", survey?.is_paid ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-100 text-gray-700")}>
                  {survey?.is_paid ? "🔓 Unlocked" : "🔒 Locked"}
                </div>
                {survey?.expires_at && (
                   <div className={cx("rounded-full border bg-white px-3 py-1 text-xs shadow-sm", detailExpiry.isExpired ? "border-gray-200 text-gray-600" : "border-green-200 text-green-700")}>
                      {detailExpiry.isExpired ? "Link expired" : "Link active"} • {detailExpiry.sublabel}
                   </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Responses</h2>
                  <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{responses.length}</span>
                </div>
              </div>

              {responses.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 text-center">
                  <p className="text-sm text-gray-600">No responses yet. Share your link to start collecting.</p>
                </div>
              ) : (
                <div className="relative mt-6">
                  <div className={cx(isLocked && "blur-md select-none pointer-events-none")}>
                    <div className="grid gap-5">
                      {questions.map((q) => {
                        const list = groupedByQuestion.get(q.id) || [];
                        const isOpen = !!expanded[q.id];
                        const shown = isOpen ? list : list.slice(0, PREVIEW_LIMIT);
                        return (
                          <div key={q.id} className="rounded-3xl border border-gray-200 p-5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-900">{q.text}</p>
                              <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{list.length}</span>
                            </div>
                            <div className="mt-3 space-y-3">
                              {shown.map((r) => (
                                <div key={r.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm">
                                  <div className="whitespace-pre-wrap">{r.answer}</div>
                                </div>
                              ))}
                            </div>
                            {list.length > PREVIEW_LIMIT && (
                              <button onClick={() => setExpanded(prev => ({...prev, [q.id]: !prev[q.id]}))} className="mt-3 text-xs font-bold text-blue-600">
                                {expanded[q.id] ? "Show less" : `Show all (${list.length})`}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
                      <p className="text-sm font-bold text-gray-900">{responses.length} responses hidden</p>
                      <button onClick={() => router.push(`/unlock/${surveyId}`)} className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-xl">
                        Unlock to Read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}