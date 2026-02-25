import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Soft gradient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Sticky Brand Bar */}
      <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/90 backdrop-blur-md">
        <div className="relative mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          
          {/* Left: Emblem (replace with real logo later) */}
          <div className="flex items-center">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
          </div>

          {/* Center: Psychelytics */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Psychelytics
            </div>
          </div>

          {/* Right: Login */}
          <nav>
            <Link
              href="/login?mode=login&next=/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 whitespace-nowrap"
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
              <Link
                href="/login?mode=signup&next=/create"
                className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                Create your survey
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <div className="rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                ✅ No app needed to respond
              </div>
              <div className="rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                ✅ Works great on mobile
              </div>
              <div className="rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                ✅ Share anywhere
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="relative">
            {/* Glow */}
            <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-blue-500/15 to-purple-500/15 blur-2xl" />
            
            {/* Main Card */}
            <div className="relative rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              
              {/* Mock Header (Simplified from screenshot) */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">The Main Character Check-In</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Survey results</p>
                </div>
                <div className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-bold text-green-700 shadow-sm flex items-center gap-1.5">
                  <span className="text-base leading-none">🔓</span> Unlocked
                </div>
              </div>

              {/* The Results Area */}
              <div className="mt-5 rounded-3xl border border-gray-100 bg-gray-50/50 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-bold text-gray-900 leading-snug">
                    Am I actually the main character, or just an eccentric NPC?
                  </p>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-bold text-gray-600 shadow-sm">
                    4
                  </span>
                </div>

                {/* The Mock Answers */}
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-700 shadow-sm">
                    Main character energy. You wore a cape to the grocery store.
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-700 shadow-sm">
                    NPC for sure. You've been pacing the same hallway for 3 hours.
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-700 shadow-sm">
                    Look within. The protagonist was the friends we made along the way.
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-700 shadow-sm">
                    I just want my lawnmower back.
                  </div>
                </div>

                <div className="mt-4 flex">
                  <button type="button" disabled className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm cursor-default">
                    Show all (4)
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Psychelytics</p>
          <p>Privacy-first feedback</p>
        </div>
      </footer>
    </main>
  );
}