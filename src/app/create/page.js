"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([
    "What is your honest opinion about me?",
  ]);
  const [creating, setCreating] = useState(false);
  const [durationHours, setDurationHours] = useState(24); // 24 default, 48 max
  const MAX_QUESTIONS = 5;
  const MIN_TITLE_LEN = 3;
  const MAX_TITLE_LEN = 60;
  const MIN_Q_LEN = 5;
  const MAX_Q_LEN = 120;

  useEffect(() => {
    // only restore draft if explicitly requested
    const params = new URLSearchParams(window.location.search);
    const shouldRestore = params.get("restore") === "1";

    if (!shouldRestore) {
      // ensure clean slate
      try {
        localStorage.removeItem("draft_survey");
      } catch {}
      return;
    }

    let raw = null;
    try {
      raw = localStorage.getItem("draft_survey");
    } catch {}
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      if (typeof draft?.title === "string") setTitle(draft.title);
      if (Array.isArray(draft?.questions) && draft.questions.length) {
        setQuestions(draft.questions);
      }
    } catch {}
  }, []);


  // Prevent any double submit (click + autosubmit race)
  const submitLockRef = useRef(false);

  // Restore draft into the UI (so the user sees what they typed after login)
  useEffect(() => {
    let raw = null;
    try {
      raw = localStorage.getItem("draft_survey");
    } catch {}
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      if (typeof draft?.title === "string") setTitle(draft.title);
      if (Array.isArray(draft?.questions) && draft.questions.length) {
        setQuestions(draft.questions);
      }
    } catch {}
  }, []);

  function addQuestion() {
    if (questions.length >= 5) return;
    setQuestions((prev) => [...prev, ""]);
  }

  function removeQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(index, value) {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  async function handleSubmit(e, overrides) {
  e.preventDefault();

  // Hard lock so it can never double-submit (click + autosubmit race)
  if (submitLockRef.current) return;
  submitLockRef.current = true;

  // If we're already creating, unlock and exit
  if (creating) {
    submitLockRef.current = false;
    return;
  }

  const submitTitle = overrides?.title ?? title;
  const submitQuestions = overrides?.questions ?? questions;

  const cleanedTitle = String(submitTitle ?? "").trim();

  const cleanedQuestions = submitQuestions
    .map((q) => String(q ?? "").trim())
    .filter(Boolean);

  if (cleanedQuestions.length === 0) {
    alert("Add at least one question.");
    submitLockRef.current = false;
    return;
  }

  if (cleanedTitle && cleanedTitle.length < MIN_TITLE_LEN) {
    alert(`Survey title must be at least ${MIN_TITLE_LEN} characters (or leave it blank).`);
    submitLockRef.current = false;
    return;
  }

  if (cleanedTitle.length > MAX_TITLE_LEN) {
    alert(`Survey title must be ${MAX_TITLE_LEN} characters or less.`);
    submitLockRef.current = false;
    return;
  }

  if (cleanedQuestions.length > MAX_QUESTIONS) {
    alert(`Max ${MAX_QUESTIONS} questions.`);
    submitLockRef.current =false;
    return;
  }

  for (const q of cleanedQuestions) {
    if (q.length < MIN_Q_LEN) {
      alert(`Each question must be at least ${MIN_Q_LEN} characters.`);
      submitLockRef.current = false;
      return;
    }
    if (q.length > MAX_Q_LEN) {
      alert(`Each question must be ${MAX_Q_LEN} characters or less.`);
      submitLockRef.current = false;
      return;
    }
  }

  const finalDurationHours = durationHours === 48 ? 48 : 24;
  const expiresAt = new Date(
    Date.now() + finalDurationHours * 60 * 60 * 1000
  ).toISOString();

  setCreating(true);

  try {
    // --- AUTH ---
    let user = null;

    try {
      const res = await supabase.auth.getUser();
      user = res?.data?.user ?? null;
    } catch (err) {
      console.error("AUTH GET USER ERROR:", err);

      // If tokens are corrupted/stale, clear them so user can log in cleanly
      try {
        await supabase.auth.signOut();
      } catch {}

      user = null;
    }

    if (!user) {
      router.push("/login?mode=signup&next=/create?restore=1");
      return;
    }

    // --- INSERT SURVEY ---
    const surveyTitle = cleanedTitle || "Untitled Survey";

    const { data: survey, error: surveyError } = await supabase
      .from("surveys")
      .insert([
        {
          title: surveyTitle,
          owner_id: user.id,
          duration_hours: finalDurationHours,
          expires_at: expiresAt,
        },
      ])
      .select()
      .single();

    if (surveyError) {
      console.error("SURVEY INSERT ERROR:", surveyError);
      alert("Failed to create survey");
      return;
    }

    // --- INSERT QUESTIONS ---
    const questionRows = cleanedQuestions.map((text, index) => ({
      survey_id: survey.id,
      text,
      position: index,
    }));

    const { error: questionsError } = await supabase
      .from("questions")
      .insert(questionRows);

    if (questionsError) {
      console.error("QUESTIONS INSERT ERROR:", questionsError);
      alert("Survey created, but failed to save questions.");
      return;
    }

    try {
      localStorage.removeItem("draft_survey");
    } catch {}

    router.push(`/dashboard?surveyId=${survey.id}&created=1`);
  } finally {
    // ALWAYS release locks even if we return early above
    submitLockRef.current = false;
    setCreating(false);
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

      {/* Header */}
      <header className="relative mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">
              Tell Me What You Really Think
            </div>
            <div className="text-[11px] text-gray-500">Create a new survey</div>
          </div>
        </a>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
        >
          Back
        </button>
      </header>

      <section className="relative mx-auto max-w-4xl px-6 pb-20 pt-4">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: form card */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    Create your survey
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Keep it short. The best surveys feel easy to answer.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="text-sm font-semibold text-gray-800">
                    Survey title{" "}
                    <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Be real with me"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none shadow-sm focus:border-blue-300"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-sm font-semibold text-gray-800">
                    Survey duration
                  </label>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDurationHours(24)}
                      className={`flex-1 rounded-2xl border px-4 px-3 text-sm font-semibold shadow-sm ${
                        durationHours === 24
                          ? "border-blue-300 bg-blue-50 text-gray-900"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      24 hours (default)
                    </button>

                    <button
                      type="button"
                      onClick={() => setDurationHours(48)}
                      className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
                        durationHours === 48
                          ? "border-purple-300 bg-purple-50 text-gray-900"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      48 hours (max)
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Your survey will automatically expire after this time.
                  </p>
                </div>

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-800">
                      Questions
                    </label>
                    <button
                      type="button"
                      onClick={addQuestion}
                      disabled={questions.length >= 5}
                      className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm hover:bg-gray-50
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      + Add question
                    </button>

                    <p className="mt-1 text-xs text-gray-500">
                      {questions.length} / 5 questions
                    </p>
                  </div>

                  <div className="mt-3 space-y-3">
                    {questions.map((q, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-gray-500">
                            Question {index + 1}
                          </p>

                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuestion(index)}
                              className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                              title="Remove question"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Type your question…"
                          value={q}
                          onChange={(e) => updateQuestion(index, e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-purple-300"
                        />
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Tip: 1–3 questions usually gets the most replies.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create Survey"}
                </button>

                <p className="text-center text-xs text-gray-500">
                  You’ll be sent to your dashboard after creating.
                </p>
              </form>
            </div>
          </div>

          {/* Right: helper card */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold">What works best</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>• Simple, direct questions</li>
                <li>• Avoid yes/no — ask “why?”</li>
                <li>• Make it easy to answer fast</li>
              </ul>

              <div className="mt-6 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700">
                  Example questions
                </p>
                <div className="mt-2 space-y-2 text-xs text-gray-600">
                  <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    “What’s one thing I should improve?”
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    “What’s your honest first impression of me?”
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    “What should I do more of?”
                  </div>
                </div>
              </div>

              <div className="mt-6 text-xs text-gray-500">
                After you create it, you’ll get a share link you can post anywhere.
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-gray-200">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-8 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Tell Me What You Really Think</p>
          <p>Create • Share • Collect</p>
        </div>
      </footer>
    </main>
  );
}