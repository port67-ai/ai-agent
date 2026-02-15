"use client";

import { useUser as useClerkUser } from '@clerk/nextjs';
import { useUser as useMockUser } from '@/components/auth/MockClerkProvider';

export function useUser() {
    const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    // We must call both hooks to satisfy the Rules of Hooks, 
    // but only if the providers are guaranteed to be in the tree.
    // In our RootLayout, we ensure only one is present.
    // However, calling a hook that uses a missing context will throw.

    // So we need a safer way.

    if (isClerkConfigured) {
        return useClerkUser();
    } else {
        return useMockUser();
    }
}
