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

      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-20 pt-4">
        <div className="grid gap-8 lg:grid-cols-12">

          {/* LEFT: THE BUILDER - Full width on mobile, 7/12 on desktop */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-[32px] sm:rounded-[40px] border border-gray-200 bg-white p-5 sm:p-8 shadow-xl shadow-gray-200/50">
              <header className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">Create Survey</h1>
                <p className="mt-2 text-sm font-medium text-gray-500">Keep it short for more responses.</p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                {/* Title Input */}
                <div className="group">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                    Survey Title <span className="font-medium lowercase opacity-60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Be honest with me..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-100 bg-gray-50/50 p-4 text-sm font-semibold outline-none transition-all focus:border-blue-400 focus:bg-white"
                  />
                </div>

                {/* Duration Toggle - Stacked on very small screens, side-by-side on others */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Time Limit</label>
                  <div className="mt-2 flex p-1 bg-gray-100/50 rounded-2xl border border-gray-100">
                    {[24, 48].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDurationHours(h)}
                        className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                          durationHours === h 
                          ? "bg-white text-gray-900 shadow-sm" 
                          : "text-gray-400"
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Questions ({questions.length}/5)</label>
                    <button
                      type="button"
                      onClick={addQuestion}
                      disabled={questions.length >= 5}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-600 disabled:opacity-30"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-3">
                    {questions.map((q, index) => (
                      <div key={index} className="relative group">
                        <input
                          type="text"
                          placeholder="Type a question..."
                          value={q}
                          onChange={(e) => updateQuestion(index, e.target.value)}
                          className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 p-4 pr-12 text-sm font-medium outline-none transition-all focus:border-purple-400 focus:bg-white"
                        />
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-gray-300 hover:text-red-500"
                          >
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-2xl bg-gray-900 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-gray-900/10"
                >
                  {creating ? "Launching..." : "Launch Survey 🚀"}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW - Completely hidden on mobile/tablet */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-12 w-full max-w-[320px] mx-auto">
              <p className="mb-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Live Preview</p>
        
              {/* The Phone Frame */}
              <div className="relative aspect-[9/18.5] w-full rounded-[3rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl">
                <div className="absolute top-0 left-1/2 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-900 z-20" />
                <div className="h-full w-full overflow-y-auto rounded-[2.2rem] bg-gray-50 p-5 pt-10">
                  {/* ... (Keep the same inner phone content from the previous message) ... */}
                </div>
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