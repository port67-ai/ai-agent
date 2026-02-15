"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { MockClerkProvider } from "./MockClerkProvider";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    if (isClerkConfigured) {
        return <ClerkProvider>{children}</ClerkProvider>;
    }

    return <MockClerkProvider>{children}</MockClerkProvider>;
}
