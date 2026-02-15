"use client";


import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mic } from "lucide-react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";

// Helper hook to unify Clerk and Mock Auth
function useAuthProxy() {
    const isClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const clerk = isClerk ? useClerk() : null;

    // We need to implement a detailed check or reuse AuthProvider context?
    // Actually, let's just use a simple Context or verify existence.
    // For simplicity in this protected layout, I'll rely on a Client Component wrapper.
    return { isClerk };
}

import { useMockAuth } from "@/components/auth/MockClerkProvider";
import { useAuth } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const isClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const router = useRouter();

    // Conditional hooks are bad practice but here strict separation avoids issues
    // or we create a wrapper component. Let's use a wrapper component.
    return (
        <ProtectedContent isClerk={isClerk}>
            <DashboardShell isClerk={isClerk}>{children}</DashboardShell>
        </ProtectedContent>
    );
}

function ProtectedContent({ isClerk, children }: { isClerk: boolean, children: React.ReactNode }) {
    const router = useRouter();

    // Real Clerk
    const clerkAuth = isClerk ? useAuth() : { isLoaded: true, isSignedIn: false };

    // Mock Auth
    const mockAuth = !isClerk ? useMockAuth() : { isLoaded: true, isSignedIn: false };

    const isLoaded = isClerk ? clerkAuth.isLoaded : mockAuth.isLoaded;
    const isSignedIn = isClerk ? clerkAuth.isSignedIn : mockAuth.isSignedIn;

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/sign-in");
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return <>{children}</>;
}

function DashboardShell({ isClerk, children }: { isClerk: boolean, children: React.ReactNode }) {
    const { signOut: mockSignOut } = useMockAuth();
    const clerk = isClerk ? useClerk() : null;
    const router = useRouter();

    const handleSignOut = () => {
        if (isClerk && clerk) {
            clerk.signOut(() => router.push("/"));
        } else {
            mockSignOut();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                <div className="max-w-screen-xl mx-auto flex justify-between items-center">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="bg-primary p-1.5 rounded-lg">
                            <Mic className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">VoiceAI Dashboard</span>
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                    >
                        Sign Out
                    </button>
                </div>
            </header>
            <main className="flex-1 max-w-screen-xl mx-auto w-full p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
