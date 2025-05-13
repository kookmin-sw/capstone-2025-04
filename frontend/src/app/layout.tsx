// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AmplifyClientProvider from "@/components/AmplifyClientProvider"; // Import the new client provider
import { Toaster } from "sonner"; // Import Toaster

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALPACO | 코딩테스트 플랫폼",
  description: "ALPACO - 클라우드 기반 LLM 코딩테스트 플랫폼",
  icons: {
    icon: '/alpaco_square_logo_blue.svg',
    shortcut: '/alpaco_square_logo_blue.svg',
    apple: '/alpaco_square_logo_blue.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 scroll-smooth:important`}
      >
        {/* Wrap children with AmplifyClientProvider */}
        <AmplifyClientProvider>
          {children}
          <Toaster richColors position="top-right" /> {/* Add Toaster here */}
        </AmplifyClientProvider>
      </body>
    </html>
  );
}
