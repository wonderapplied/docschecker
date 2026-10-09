import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["600", "700", "800"] });
const body = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Unlocked",
  description: "Hit your writing goal, unlock game night.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 pt-6 pb-12 sm:pt-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
