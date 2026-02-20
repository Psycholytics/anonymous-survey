"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SurveyPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params?.id;

  const [loading, setLoading] = useState(true);
  const [notFoundPage, setNotFoundPage] = useState(false);

  const [surveyTitle, setSurveyTitle] = useState("Anonymous Survey");
  const [expiresAt, setExpiresAt] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // public owner info (for banner/avatar + handle)
  const [ownerProfile, setOwnerProfile] = useState(null); // { handle, avatar_url, banner_url }

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const firstInputRef = useRef(null);

  const hasAtLeastOneAnswer = useMemo(() => {
    return (answers || []).some((a) => (a || "").trim().length > 0);
  }, [answers]);

  useEffect(() => {
    if (!surveyId) return;

    let alive = true;

    async function load() {
      setLoading(true);
      setNotFoundPage(false);

      // 1) Load survey (include owner_id so we can fetch profile)
      const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .select("title, expires_at, owner_id")
        .eq("id", surveyId)
        .single();

      if (!alive) return;

      if (surveyError || !survey) {
        setNotFoundPage(true);
        setLoading(false);
        return;
      }

      setSurveyTitle(survey.title || "Anonymous Survey");
      setExpiresAt(survey.expires_at);

      const expiredNow = survey?.expires_at
        ? new Date(survey.expires_at) < new Date()
        : false;
      setIsExpired(expiredNow);

      // 2) Load owner profile (public info)
      if (survey.owner_id) {
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("handle, avatar_url, banner_url")
          .eq("user_id", survey.owner_id)
          .maybeSingle();

        if (profErr) console.error("OWNER PROFILE LOAD ERROR:", profErr);
        if (!alive) return;
        setOwnerProfile(prof || null);
      } else {
        setOwnerProfile(null);
      }

      // 3) Load questions
      const { data: qs, error: qError } = await supabase
        .from("questions")
        .select("id, text, position")
        .eq("survey_id", surveyId)
        .order("position", { ascending: true });

      if (!alive) return;

      if (qError) {
        console.error("Questions error:", qError);
        alert("Failed to load questions.");
        setLoading(false);
        return;
      }

      setQuestions(qs || []);
      setAnswers((qs || []).map(() => ""));
      setLoading(false);

      // A) auto-focus first input (tiny delay so it exists in DOM)
      setTimeout(() => {
        if (!alive) return;
        firstInputRef.current?.focus();
      }, 50);
    }

    load();

    return () => {
      alive = false;
    };
  }, [surveyId]);

  function updateAnswer(index, value) {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (isExpired) {
      alert("This survey link has expired.");
      return;
    }

    if (!hasAtLeastOneAnswer) {
      alert("Answer at least one question before submitting.");
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const responseRows = answers
        .map((text, index) => ({
          text: (text || "").trim().slice(0, 500),
          question_id: questions[index]?.id,
        }))
        .filter((x) => x.text && x.question_id)
        .map((x) => ({
          survey_id: surveyId,
          question_id: x.question_id,
          answer: x.text,
        }));

      if (responseRows.length === 0) {
        alert("Write at least one answer before submitting.");
        return;
      }

      const { error } = await supabase.from("responses").insert(responseRows);

      if (error) {
        console.error("INSERT RESPONSES ERROR:", error);
        alert("Failed to submit responses.");
        return;
      }

      router.push("/thank-you");
    } finally {
      setSubmitting(false);
    }
  }

  if (notFoundPage) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        {/* background glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
          <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
          <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
        </div>

        <section className="relative mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight">Survey not found</h1>
            <p className="mt-2 text-sm text-gray-600">
              This survey may have been deleted or the link is incorrect.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 inline-flex rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
            >
              Go home
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!surveyId) return <main className="p-10">Loading...</main>;
  if (loading) return <main className="p-10">Loading survey...</main>;

  const handle = ownerProfile?.handle || "user";
  const initial = (handle || "?").slice(0, 1).toUpperCase();

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-2xl px-6 pb-16 pt-10">
        {/* Profile header */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {/* Banner */}
          <div
            className={cx(
              "relative h-[200px] w-full",
              !ownerProfile?.banner_url && "bg-gradient-to-r from-blue-500/15 to-purple-600/15"
            )}
          >
            {ownerProfile?.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ownerProfile.banner_url}
                alt="Banner"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0" />
            )}
          </div>

          {/* Avatar + meta */}
          <div className="relative px-6 pb-6">
            <div className="absolute -top-10 left-6">
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-sm">
                {ownerProfile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ownerProfile.avatar_url}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-600/25 text-lg font-extrabold text-gray-700">
                    {initial}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-14 pb-8 px-8">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Survey Creator</span>
                <p className="text-sm font-bold text-gray-900">@{handle}</p>
              </div>

              {isExpired && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  This survey link has expired.
                  {expiresAt ? (
                    <div className="mt-1 text-xs text-gray-500">
                      Expired on {new Date(expiresAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NEW Standalone Title block */}
        <div className="mt-12 mb-10 text-center px-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 leading-[1.1]">
            {surveyTitle}
          </h1>
        </div>

        {/* Questions card */}
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          {questions.length === 0 ? (
            <p className="text-sm text-gray-600">This survey has no questions.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {questions.map((q, index) => (
                <div 
                  key={q.id}
                  className="group rounded-[32px] border border-gray-100 bg-white p-6 sm:p-8 shadow-lg shadow-gray-200/20 transition-all focus-within:border-blue-200 focus-within:ring-8 focus-within:ring-blue-500/5"
                >
                  <label className="mb-4 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    Question {index + 1}
                  </label>
  
                  <p className="mb-6 text-lg font-black leading-tight text-gray-900">
                    {q.text}
                  </p>

                  <textarea
                    ref={index === 0 ? firstInputRef : undefined}
                    placeholder="Type your honest thoughts..."
                    className="w-full min-h-[140px] resize-none rounded-2xl bg-gray-50/50 p-5 text-sm font-medium outline-none transition-all focus:bg-white focus:ring-1 focus:ring-gray-100"
                    value={answers[index] || ""}
                    onChange={(e) => updateAnswer(index, e.target.value)}
                    maxLength={500}
                    disabled={submitting || isExpired}
                  />
                </div>
              ))}

              {/* C) hint if nothing typed yet */}
              {!hasAtLeastOneAnswer && !isExpired && (
                <p className="text-center text-xs text-gray-500">
                  Answer at least one question to submit.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || isExpired || !hasAtLeastOneAnswer}
                className={cx(
                  "w-full overflow-hidden rounded-[26px] py-6 text-xs font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all active:scale-[0.97]",
                  isExpired || !hasAtLeastOneAnswer
                    ? "cursor-not-allowed bg-gray-200 text-gray-400 shadow-none"
                    : "bg-gray-900 hover:bg-black"
                )}
              >
                {submitting ? "Sending..." : "Send Anonymously 🔒"}
              </button>

              <p className="text-center text-[11px] text-gray-500">
                No name. No email. No account. No trace.
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}