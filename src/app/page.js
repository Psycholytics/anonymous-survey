import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Soft gradient background - (Keeping your original code here) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Sticky Brand Bar */}
      <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/90 backdrop-blur-md">
        <div className="relative mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
          </div>

          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Psychelytics
            </div>
          </div>

          <nav>
            {/* CHANGE: Swapped <a> for <Link> */}
            <Link
              href="/login?mode=login&next=/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 hover:scale-[1.02] transition-transform whitespace-nowrap"
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Tell Me What You Really Think.
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Anonymous feedback in seconds.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
              Create a short survey, post it to your socials, and collect anonymous
              responses from anyone. Perfect for “be real with me” questions, Q&A,
              and honest feedback.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {/* CHANGE: Swapped <a> for <Link> */}
              <Link
                href="/login?mode=signup&next=/create"
                className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:scale-[1.02] transition-transform"
              >
                Create your survey
              </Link>

              <Link
                href="#how"
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
              >
                See how it works
              </Link>
            </div>

            {/* Badges - (Keeping your original code) */}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <div className="rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">✅ No app needed</div>
              <div className="rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">✅ Mobile optimized</div>
              <div className="rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">✅ 100% Anonymous</div>
            </div>
          </div>

          {/* NEW PREVIEW CARD: Matching your Screenshot */}
          <div className="relative">
            <div className="rounded-[2.5rem] border border-gray-200 bg-white p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">Responses</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">3</span>
                </div>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Grouped by question</span>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-100 bg-gray-50/50 p-5">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-bold text-gray-800 leading-tight max-w-[80%]">
                      What’s one thing you’ve been too afraid to tell me?
                    </p>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">3</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {/* The "Pill" Responses from screenshot */}
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                      I’ve always admired how you handle pressure. It’s inspiring.
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                      Sometimes I feel like you're holding back your true potential.
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm text-gray-400 italic">
                      You’re more capable than you think...
                    </div>
                    <div className="w-fit rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-bold text-gray-600 shadow-sm">
                      Show all (3)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div className="pointer-events-none absolute -inset-4 rounded-[3rem] bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Footer - (Keeping your original code) */}
      <footer className="relative border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Psychelytics</p>
          <p>Privacy-first feedback</p>
        </div>
      </footer>
    </main>
  );
}