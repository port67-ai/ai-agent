import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { MockClerkProvider } from "@/components/auth/MockClerkProvider";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "Port67 Business Assistant - Never Miss a Customer Again",
    description: "Automated appointment booking assistant for trade professionals. 24/7 voice, WhatsApp, and Facebook support. Perfect for plumbers, electricians, gardeners, and carpenters.",
    keywords: "business assistant, appointment booking, trade professionals, plumber, electrician, gardener, carpenter, automated booking, WhatsApp, voice assistant",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    return (
        <html lang="en">
            <body className={`${inter.variable} font-sans`}>
                {isClerkConfigured ? (
                    <ClerkProvider>
                        {children}
                    </ClerkProvider>
                ) : (
                    <MockClerkProvider>
                        {children}
                    </MockClerkProvider>
                )}
            </body>
        </html>
    );
}
