"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function IconButton({ title, onClick, children, danger = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-white shadow-sm",
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-gray-200 text-gray-700 hover:bg-gray-50"
      )}
    >
      <span className="text-lg leading-none">{children}</span>
    </button>
  );
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

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");
  const unlocked = searchParams.get("unlocked");

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // profile (handle)
  const [profile, setProfile] = useState(null);

  // List state
  const [surveys, setSurveys] = useState([]);

  // Detail state
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const PREVIEW_LIMIT = 5;
  const [expanded, setExpanded] = useState({});
  const [showCreatedToast, setShowCreatedToast] = useState(false);

  useEffect(() => {
    const created = searchParams.get("created");
    if (created === "1") {
      setShowCreatedToast(true);
      const t = setTimeout(() => setShowCreatedToast(false), 2500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const detailExpiry = useMemo(() => {
    if (!survey?.expires_at) return { isExpired: false, label: "", sublabel: "" };
    return getExpiryMeta(survey.expires_at);
  }, [survey?.expires_at]);

  // ✅ locked only when not paid
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
        router.push(
          `/login?mode=login&next=/dashboard${surveyId ? `?surveyId=${surveyId}` : ""}`
        );
        return;
      }

      if (!alive) return;
      setUser(u);

      // Load profile handle once
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("handle")
        .eq("user_id", u.id)
        .maybeSingle();

      if (profErr) {
        console.error(profErr);
      } else {
        setProfile(prof);

        if (!prof?.handle) {
          router.push(
            `/claim-handle?next=/dashboard${surveyId ? `?surveyId=${surveyId}` : ""}`
          );
          return;
        }
      }

      if (surveyId) {
        await loadDetail(u.id, surveyId);

        // If returning from Stripe, wait for webhook to flip is_paid, then reload
        if (unlocked === "1") {
          const ok = await waitForPaid(surveyId);
          if (ok) await loadDetail(u.id, surveyId);
        }
      } else {
        await loadList();
      }

      if (!alive) return;
      setLoading(false);
    }

    boot();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, unlocked]);

  async function loadList() {
    setSurveys([]);
    const { data, error } = await supabase.rpc("dashboard_survey_summaries");
    if (error) {
      console.error("DASHBOARD LIST RPC ERROR:", error);
      return;
    }
    setSurveys(data || []);
  }

  async function loadDetail(userId, sId) {
    setSurvey(null);
    setQuestions([]);
    setResponses([]);

    const { data: surveyRow, error: sErr } = await supabase
      .from("surveys")
      .select(
        "id, title, owner_id, is_paid, unlock_deadline, created_at, expires_at, duration_hours"
      )
      .eq("id", sId)
      .single();

    if (sErr) {
      console.error("SURVEY LOAD ERROR:", sErr);
      return;
    }

    if (surveyRow.owner_id !== userId) {
      router.push("/dashboard");
      return;
    }

    setSurvey(surveyRow);

    const { data: qRows, error: qErr } = await supabase
      .from("questions")
      .select("id, text, position")
      .eq("survey_id", sId)
      .order("position", { ascending: true });

    if (qErr) {
      console.error("QUESTIONS LOAD ERROR:", qErr);
      return;
    }
    setQuestions(qRows || []);

    const { data: rRows, error: rErr } = await supabase
      .from("responses")
      .select("id, question_id, answer, created_at")
      .eq("survey_id", sId)
      .order("created_at", { ascending: false });

    if (rErr) {
      console.error("RESPONSES LOAD ERROR:", rErr);
      return;
    }
    setResponses(rRows || []);

    const { error: viewedErr } = await supabase
      .from("surveys")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", sId)
      .eq("owner_id", userId);

    if (viewedErr) console.error("LAST_VIEWED UPDATE ERROR:", viewedErr);
  }

  function goToSurveyDetail(id) {
    router.push(`/dashboard?surveyId=${id}`);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch {
      alert("Copy failed");
    }
  }

  async function renameSurvey(id, currentTitle) {
    const next = prompt("Rename survey:", currentTitle || "");
    if (next === null) return;

    const newTitle = next.trim();
    if (!newTitle) {
      alert("Title can't be empty.");
      return;
    }

    const { error } = await supabase
      .from("surveys")
      .update({ title: newTitle })
      .eq("id", id)
      .eq("owner_id", user?.id);

    if (error) {
      console.error("RENAME ERROR:", error);
      alert(error.message || "Rename failed.");
      return;
    }

    if (user?.id) await loadList();
  }

  async function deleteSurvey(id, title) {
    if (!user?.id) return;

    const ok = confirm(
      `Delete this survey?\n\n"${title || "Untitled survey"}"\n\nThis will delete all its questions and responses.`
    );
    if (!ok) return;

    const { error } = await supabase
      .from("surveys")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id);

    if (error) {
      console.error("DELETE ERROR:", error);
      alert(error.message || "Delete failed.");
      return;
    }

    if (surveyId === id) {
      router.push("/dashboard");
      return;
    }

    await loadList();
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {showCreatedToast && (
        <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm">
            🎉 your survey is created - ready to share.
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">Dashboard</div>
            <div className="text-[11px] text-gray-500">
              {surveyId ? "Survey detail" : "My surveys"}
            </div>
          </div>
        </a>

        <div className="flex items-center gap-3">
          {profile?.handle && (
            <a
              href={`/u/${profile.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
            >
              View public profile
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("nav_from_dashboard", "1");
              router.push("/create");
            }}

            className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            New survey
          </button>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Loading…</p>
          </div>
        ) : !surveyId ? (
          // LIST VIEW
          <div className="grid gap-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight">My Surveys</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Click a survey to view responses + share link.
                  </p>
                </div>
              </div>
            </div>

            {surveys.length === 0 ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-600">No surveys yet.</p>
                <a
                  href="/create"
                  className="mt-4 inline-flex rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                >
                  Create your first survey
                </a>
              </div>
            ) : (
              <div className="grid gap-3">
                {surveys.map((s) => {
                  const url = `${origin}/survey/${s.id}`;
                  const responseCount = Number(s.response_count ?? 0);
                  const newCount = Number(s.new_count ?? 0);
                  const expiry = getExpiryMeta(s.expires_at);
                  const linkDisabled = expiry.isExpired;
                  const deleteLabel =
                    expiry.isExpired && !s.is_paid ? getDeletionCountdown(s.expires_at) : null;

                  return (
                    <div
                      key={s.id}
                      className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="truncate text-base font-extrabold text-gray-900">
                            {s.title || "Untitled survey"}
                          </p>

                          <span
                            className={cx(
                              "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              expiry.isExpired
                                ? "border-gray-200 bg-gray-50 text-gray-600"
                                : "border-green-200 bg-green-50 text-green-700"
                            )}
                          >
                            {expiry.label}
                          </span>

                          <p className="mt-1 text-xs text-gray-500">
                            {responseCount} response{responseCount === 1 ? "" : "s"}
                            {newCount > 0 ? ` . ${newCount} new` : ""}
                            {s.is_paid ? (
                              <span className="ml-1 text-green-600 font-semibold">Unlocked</span>
                            ) : (
                              <span className="ml-1 text-gray-500 font-semibold">Locked</span>
                            )}
                          </p>

                          {!s.is_paid && !canStillUnlockSurvey(s) && (
                            <p className="mt-1 text-[11px] text-gray-400">
                              Auto-deleted after unlock window
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {newCount > 0 && (
                            <span className="rounded-full bg-blue-600 px-3 py-2 text-sm font-extrabold text-white">
                              +{newCount} new
                            </span>
                          )}
                          <button
                            onClick={() => goToSurveyDetail(s.id)}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
                          >
                            Open
                          </button>

                          <button
                            onClick={() => {
                              if (linkDisabled) return;
                              copy(url);
                            }}
                            disabled={linkDisabled}
                            className={cx(
                              "rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm",
                              linkDisabled
                                ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                                : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-95"
                            )}
                          >
                            {linkDisabled ? "Expired" : "Copy link"}
                          </button>

                          <IconButton title="Rename" onClick={() => renameSurvey(s.id, s.title)}>
                            ✏️
                          </IconButton>

                          <IconButton
                            title="Delete"
                            danger
                            onClick={() => deleteSurvey(s.id, s.title)}
                          >
                            ✕
                          </IconButton>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // DETAIL VIEW
          <div className="grid gap-4">
            {/* back button OUTSIDE the title card */}
            <div className="-mt-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                ← My Surveys
              </button>
            </div>

            {/* Title + status */}
            <div className="px-1 pt-2 pb-2">
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-extrabold tracking-tight text-gray-900">
                  {survey?.title || "Survey"}
                </h1>

                <p className="mt-2 text-xs text-gray-500">Survey results</p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                  {survey?.is_paid ? (
                    <div className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700 shadow-sm">
                      🔓 Unlocked
                    </div>
                  ) : (
                    <div className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 shadow-sm">
                      🔒 Locked
                    </div>
                  )}

                  {!survey?.is_paid && (
                    canStillUnlockSurvey(survey) ? (
                      <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                        Unlock available (30 days)
                      </div>
                    ) : (
                      <div className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                        Unlock window ended
                      </div>
                    )
                  )}

                  {detailExpiry.isExpired && !survey?.is_paid && (
                    <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm">
                      {getDeletionCountdown(survey.expires_at)}
                    </div>
                  )}

                  {survey?.expires_at && (
                    <div
                      className={cx(
                        "rounded-full border bg-white px-3 py-1 shadow-sm",
                        new Date(survey.expires_at) < new Date()
                          ? "border-gray-200 text-gray-600"
                          : "border-green-200 text-green-700"
                      )}
                    >
                      {getExpiryMeta(survey.expires_at).isExpired ? "Link expired" : "link active"} .{" "}
                      {getExpiryMeta(survey.expires_at).sublabel}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Responses */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Responses</h2>
                  <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                    {responses.length}
                  </span>
                </div>

                <p className="text-[11px] text-gray-500">grouped by question</p>
              </div>

              {responses.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6">
                  <p className="text-sm text-gray-600">
                    No responses yet. Share your link to start collecting.
                  </p>
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

                              <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                                {list.length}
                              </span>
                            </div>


                            <div className="mt-3 space-y-3">
                              {list.length === 0 ? (
                                <p className="text-sm text-gray-500">No answers yet.</p>
                              ) : (
                                shown.map((r) => (
                                  <div
                                    key={r.id}
                                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm"
                                  >
                                    <div className="whitespace-pre-wrap max-w-prose">
                                      {r.answer}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {list.length > PREVIEW_LIMIT && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpanded((prev) => {
                                    if (prev[q.id]) return {};
                                    return { [q.id]: true };
                                  })
                                }
                                className="mt-3 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                              >
                                {expanded[q.id] ? "Show less" : `Show all (${list.length})`}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isLocked && canStillUnlockSurvey(survey) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                      <p className="text-xs font-semibold text-gray-700">
                        {responses.length} response{responses.length === 1 ? "" : "s"} collected - unlock to read them
                      </p>

                      <button
                        onClick={() => router.push(`/unlock/${surveyId}`)}
                        className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                      >
                        Unlock survey responses
                      </button>
                    </div>
                  )}

                  {isLocked && !canStillUnlockSurvey(survey) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                        Locked — unlock window expired
                      </div>
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