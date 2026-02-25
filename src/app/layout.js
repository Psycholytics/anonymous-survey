import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link"; // Added for the header

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Psychelytics | Anonymous Feedback",
  description: "Create short surveys and collect honest, anonymous feedback.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}>
        
        {/* 1. GLOBAL BACKGROUND GLOWS */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
          <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
          <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
        </div>

        {/* 2. GLOBAL STICKY HEADER */}
        <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/90 backdrop-blur-md">
          <div className="relative mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />
            </Link>

            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Psychelytics
              </div>
            </div>

            <nav>
              <Link
                href="/login?mode=login&next=/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
              >
                Log in
              </Link>
            </nav>
          </div>
        </header>

        {/* 3. PAGE CONTENT */}
        <div className="relative z-10">
          {children}
        </div>

      </body>
    </html>
  );
}