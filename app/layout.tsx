import type { Metadata } from "next";
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

// METADATA YENİLƏNDİ
export const metadata: Metadata = {
  title: "Reddit.az — Azərbaycanın Müzakirə Platforması",
  description: "Maraqlı icmalara qoşulun, şəkillər paylaşın və fikirlərinizi bölüşün.",
  icons: {
    icon: "/favicon.ico", // Əgər adını icon.png qoymusansa, bura /icon.png yaz
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az"> {/* Dil Azərbaycancaya dəyişdirildi */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}