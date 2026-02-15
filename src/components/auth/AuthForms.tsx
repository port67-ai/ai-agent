"use client";

import { useMockAuth } from "@/components/auth/MockClerkProvider";
import { useState } from "react";
import Link from "next/link";
import { Mic } from "lucide-react";

export function MockSignIn() {
    const { signIn } = useMockAuth();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate network delay
        setTimeout(() => {
            signIn();
        }, 1200);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1),transparent_50%)]" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(249,115,22,0.1),transparent_50%)]" />

            <div className="max-w-md w-full card-glass card-elevated p-8 rounded-[2.5rem] border border-white/10 relative z-10 animate-fade-in">
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                        <Mic className="text-white w-8 h-8" />
                    </div>
                </div>

                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
                    <p className="text-slate-400">
                        Sign in to manage your voice assistant
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="label">Email Address</label>
                        <input
                            type="email"
                            required
                            className="input"
                            placeholder="alex@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <input
                            type="password"
                            required
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-4 text-lg justify-center shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Authenticating...</span>
                            </div>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-white/5 text-center">
                    <p className="text-sm text-slate-500 mb-4 italic">
                        Mock Mode: Any email and password will work
                    </p>
                    <p className="text-sm text-slate-400">
                        Don't have an account?{" "}
                        <Link href="/sign-up" className="text-primary font-bold hover:text-primary-light transition-colors">
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export function MockSignUp() {
    const { signIn } = useMockAuth();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            signIn();
        }, 1200);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.1),transparent_50%)]" />
            <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,rgba(249,115,22,0.1),transparent_50%)]" />

            <div className="max-w-md w-full card-glass card-elevated p-8 rounded-[2.5rem] border border-white/10 relative z-10 animate-fade-in">
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg transform rotate-6 hover:rotate-0 transition-transform duration-300">
                        <Mic className="text-white w-8 h-8" />
                    </div>
                </div>

                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold mb-2">Join Port67</h2>
                    <p className="text-slate-400">
                        Start your 14-day free trial today
                    </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                    <div>
                        <label className="label">Full Name</label>
                        <input
                            type="text"
                            required
                            className="input"
                            placeholder="Alex Smith"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="label">Email Address</label>
                        <input
                            type="email"
                            required
                            className="input"
                            placeholder="alex@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <input
                            type="password"
                            required
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-4 text-lg justify-center shadow-lg shadow-primary/20 mt-4"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Creating Account...</span>
                            </div>
                        ) : (
                            "Create Account"
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-white/5 text-center">
                    <p className="text-sm text-slate-400">
                        Already have an account?{" "}
                        <Link href="/sign-in" className="text-primary font-bold hover:text-primary-light transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
