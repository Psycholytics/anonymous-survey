import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png", // <--- Add this line
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white overflow-hidden`}>
        
        {/* The custom scroll box to kill the Safari bounce */}
        <div className="h-[100dvh] w-full overflow-y-auto overscroll-none">
          {children}
        </div>

      </body>
    </html>
  );
}