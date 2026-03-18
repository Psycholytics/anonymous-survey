import localFont from "next/font/local"; // 1. Import local font loader
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 2. Load Spectrum BC
const spectrumBC = localFont({
  src: "../../public/fonts/spectrum-bc.woff2", 
  variable: "--font-spectrum",
  weight: "100 900", // did it
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  title: "Psychelytics",
  description: "Tell Me What You Really Think",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* 1. We add 'overflow-hidden' here so the browser itself physically cannot bounce */}
      <body className={`${geistSans.variable} ${geistMono.variable} ${spectrumBC.variable} antialiased bg-white overflow-hidden`}>
        
        {/* 2. We wrap your app in a custom scrolling box that respects our rules */}
        <div className="h-[100dvh] w-full overflow-y-auto overscroll-none">
          {children}
        </div>

      </body>
    </html>
  );
}