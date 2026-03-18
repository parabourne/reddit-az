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
    // Səndəki fayl icon.jpg olduğu üçün yolu belə yazırıq. 
    // ?v=4 əlavə etmək brauzeri yeni şəkli yükləməyə məcbur edir.
    icon: "/icon.jpg?v=4", 
    shortcut: "/icon.jpg",
    apple: "/icon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}