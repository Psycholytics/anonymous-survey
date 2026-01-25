"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ThankYouPage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    // countdown only
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    // redirect separately (no setState callback)
    const timeout = setTimeout(() => {
      router.replace("/");
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <section className="relative mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-2xl text-white shadow-sm">
            ✓
          </div>

          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
            Submitted.
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Your response was sent successfully.
          </p>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            Redirecting home in {seconds}s…
          </div>

          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            Go now
          </button>
        </div>
      </section>
    </main>
  );
}