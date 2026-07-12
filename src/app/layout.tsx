import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synthegy — Strategy-Aware AI for Synthetic Chemistry",
  description:
    "Synthegy is an agentic reasoning platform that bridges computation and chemical intuition — strategic retrosynthesis, mechanistic electron-pushing, and expert alignment in one natural-language workspace.",
  keywords: [
    "Synthegy",
    "retrosynthesis",
    "mechanistic reasoning",
    "agentic AI",
    "chemistry AI",
    "pharma R&D",
    "materials science",
    "electron pushing",
  ],
  authors: [{ name: "Synthegy Labs" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Synthegy — Strategy-Aware AI for Synthetic Chemistry",
    description:
      "Bridging the gap between raw computation and chemical intuition with an agentic workflow.",
    siteName: "Synthegy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
