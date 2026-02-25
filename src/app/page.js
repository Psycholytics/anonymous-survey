import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative pt-8 pb-12"> 
      {/* We removed the Background and Header from here because they are now in layout.js */}
      
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          
          {/* Hero Content */}
          <div className="z-10">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl leading-[1.1]">
              Tell Me What You Really Think.
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Anonymous feedback in seconds.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600">
              Create a short survey, post it to your socials, and collect anonymous
              responses from anyone. 
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login?mode=signup&next=/create"
                className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-4 text-center text-sm font-semibold text-white shadow-sm hover:scale-[1.02] transition-transform"
              >
                Create your survey
              </Link>

              <Link
                href="#how"
                className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-center text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
              >
                See how it works
              </Link>
            </div>
          </div>

          {/* Preview Card - Optimized for mobile spacing */}
          <div className="relative mt-8 lg:mt-0">
            <div className="rounded-[2.5rem] border border-gray-200 bg-white p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">Responses</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">8</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-gray-100 bg-gray-50/50 p-5">
                  <p className="text-sm font-bold text-gray-800 leading-tight mb-4">
                    What is your honest opinion about me?
                  </p>
                  
                  <div className="space-y-2">
                    {/* Updated to match your specific screenshot responses */}
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                      You really smart
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                      Yessirski
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-400 italic">
                      Anything else...
                    </div>
                    <div className="w-fit rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-bold text-gray-600">
                      Show all (8)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}