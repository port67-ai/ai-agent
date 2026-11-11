import type { Metadata } from "next";
import localFont from "next/font/local";
import { LegacyAuth } from "@/components/studio/LegacyAuth";
import "./globals.css";

const inter = localFont({
  src: "../../public/fonts/inter-latin.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});
const manrope = localFont({
  src: "../../public/fonts/manrope-latin.woff2",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  title:
    "Port67.ai | Intelligent Dashboards, AI Automation & Technology Explainers",
  description:
    "Better decisions. Smarter workflows. Clearer stories. Port67.ai is a business design and AI studio. Listen First. Build What Matters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className={`${inter.variable} ${manrope.variable} font-sans`}>
        <LegacyAuth>{children}</LegacyAuth>
      </body>
    </html>
  );
}
