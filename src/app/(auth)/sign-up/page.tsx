"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, ArrowRight, Sparkles } from "lucide-react";

export default function SignUpPage() {
    const router = useRouter();

    // Redirect to pricing page after a short delay
    useEffect(() => {
        const timer = setTimeout(() => {
            router.push("/pricing");
        }, 3000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
            <div className="max-w-lg w-full">
                {/* Brand */}
                <Link href="/" className="flex items-center gap-3 group justify-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Phone className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-2xl font-bold gradient-text">Port67 Assistant</span>
                </Link>

                {/* Redirect Card */}
                <div className="bg-[#05050a]/60 backdrop-blur-glass p-12 rounded-3xl border border-white/10 shadow-2xl text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>

                    <h1 className="text-4xl font-bold mb-4">Choose Your Plan First</h1>
                    <p className="text-foreground/70 text-lg mb-8 max-w-md mx-auto">
                        To create an account, please select a plan that best fits your business needs.
                        You'll create your account during checkout.
                    </p>

                    <Link
                        href="/pricing"
                        className="inline-flex items-center gap-2 btn btn-primary px-8 py-4 text-lg"
                    >
                        View Pricing Plans
                        <ArrowRight className="w-5 h-5" />
                    </Link>

                    <p className="text-sm text-foreground/50 mt-6">
                        Redirecting automatically in 3 seconds...
                    </p>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <p className="text-foreground/60">
                            Already have an account?{" "}
                            <Link href="/sign-in" className="text-primary hover:underline font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
