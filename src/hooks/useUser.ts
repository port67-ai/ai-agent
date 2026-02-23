"use client";

import { useAuth } from "@/components/auth/AuthProvider";

export function useUser() {
    const { user, profile, loading } = useAuth();

    return {
        user,
        profile,
        isSignedIn: !!user,
        isLoaded: !loading,
        // Match Clerk-like structure for compatibility
        id: user?.uid,
        primaryEmailAddress: user?.email ? { emailAddress: user.email } : null,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
    };
}
