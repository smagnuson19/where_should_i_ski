import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Where Should I Ski? Snowpack & ENSO in the US (SNOTEL) and Japan (JMA)",
  description:
    "See how El Niño, La Niña and Neutral winters shift mountain snowpack: a US map of 954 USDA NRCS SNOTEL sites (water years 1930–2026) with a year-range filter, plus the Japan JMA regional snowfall dashboard (1953/54–2024/25).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-sky-500/30 selection:text-sky-200">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
