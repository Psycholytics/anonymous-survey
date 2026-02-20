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

      <section className="relative mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        {/* The "Bounce" Success Icon */}
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-white shadow-2xl shadow-gray-200/50">
          <span className="text-4xl animate-bounce">✅</span>
        </div>

        <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
          Sent safely.
        </h1>
        
        <p className="mt-6 text-lg font-medium text-gray-500 leading-relaxed">
          Your responses were delivered anonymously. <br /> No trace was left behind.
        </p>

        {/* CONVERSION CARD */}
        <div className="mt-12 w-full rounded-[40px] border border-gray-100 bg-white p-8 shadow-2xl shadow-gray-200/40">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Now it's your turn.</h2>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Create your own survey and see what people <br className="hidden sm:block" /> really think about you.
          </p>
          
          <button
            onClick={() => router.push("/create")}
            className="mt-8 w-full rounded-[22px] bg-gray-900 py-5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95 hover:bg-black"
          >
            Create My Survey 🚀
          </button>
          
          <button
            onClick={() => router.push("/")}
            className="mt-4 w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
          >
            Or go back home
          </button>
        </div>

        <footer className="mt-16 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
          100% Private • Secured by Privacy Shield
        </footer>
      </section>
    </main>
  );
}