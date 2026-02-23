"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { DashboardTopNav } from "@/components/dashboard/DashboardTopNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/sign-in");
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface">
            <DashboardTopNav />
            <main className="pt-16 pb-24">
                <div className="container-custom">
                    {children}
                </div>
            </main>
        </div>
    );
}
