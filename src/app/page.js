export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Soft gradient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
        </div>

        <nav className="flex items-center gap-3">
          <a
            href="/login?mode=login&next=/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 whitespace-nowrap leading-none"
          >
            Log in
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-10 pb-12">
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
              <a
                href="/login?mode=signup&next=/create"
                className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                Create your survey
              </a>

              <a
                href="#how"
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
              >
                See how it works
              </a>
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

          {/* iMessage-style preview */}
          <div className="relative">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Preview</p>
                  <p className="mt-1 text-xs text-gray-500">
                    What responders see (simple + fast)
                  </p>
                </div>
                <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                  Anonymous
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">
                    What is your honest opinion about me?
                  </p>

                  <div className="mt-3 flex flex-col gap-2">
                    <div className="max-w-[85%] rounded-2xl bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
                      Be 100% honest…
                    </div>

                    <div className="ml-auto max-w-[85%] rounded-2xl bg-blue-500 px-4 py-3 text-sm text-white shadow-sm">
                      You’re more capable than you think. Stop second-guessing.
                    </div>

                    <div className="max-w-[85%] rounded-2xl bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
                      Anything else you want me to know?
                    </div>

                    <div className="ml-auto max-w-[85%] rounded-2xl bg-blue-500 px-4 py-3 text-sm text-white shadow-sm">
                      Keep going. Your progress is obvious.
                    </div>
                  </div>

                  <button className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm">
                    Submit response
                  </button>

                  <p className="mt-2 text-center text-xs text-gray-500">
                    Takes ~10 seconds
                  </p>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-blue-500/15 to-purple-500/15 blur-2xl" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-2xl font-bold">How it works</h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Three steps. No friction.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { title: "1) Create", desc: "Write your questions and publish your survey." },
            { title: "2) Share", desc: "Post your link to TikTok, IG, X, or group chats." },
            { title: "3) Collect", desc: "Watch responses come in anonymously." },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <a
            href="/login?mode=signup&next=/create"
            className="inline-flex rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            Create your survey
          </a>
        </div>
      </section>

      {/* Footer (no tech stack callout) */}
      <footer className="relative border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Tell Me What You Really Think</p>
          <p>Privacy-first feedback</p>
        </div>
      </footer>
    </main>
  );
}