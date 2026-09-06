import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "E-PROFILER — Forensic Video & Speech Intelligence System",
  description: "Zaawansowana analiza wideo, intencji, mikroekspresji FACS, mowy ciała i perswazji osób publicznych w prostym języku.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className="dark">
      <body className="min-h-screen bg-[#080a0f] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
        {/* Pasek nawigacji HUD - automatycznie ukrywany na ekranie logowania */}
        <AppHeader />

        {/* Główna przestrzeń robocza */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
          {children}
        </main>

        {/* Stopka - automatycznie ukrywana na ekranie logowania */}
        <AppFooter />
      </body>
    </html>
  );
}
