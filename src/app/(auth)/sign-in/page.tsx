"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { firebaseAuth } from "@/lib/services/firebase-auth";
import { Phone, LogIn, Mail, Lock, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState("");

    // Reset password state (when user clicks link in email)
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await firebaseAuth.signIn(email, password);
            router.push("/dashboard");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to sign in. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetLoading(true);
        setResetError("");

        try {
            await firebaseAuth.sendPasswordReset(resetEmail);
            setResetSent(true);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setResetError('No account found with this email address.');
            } else if (err.code === 'auth/invalid-email') {
                setResetError('Invalid email address.');
            } else {
                setResetError(err.message || 'Failed to send reset email. Please try again.');
            }
        } finally {
            setResetLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmNewPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        setLoading(true);

        try {
            await firebaseAuth.confirmPasswordReset(oobCode!, newPassword);
            setResetSuccess(true);
            setTimeout(() => {
                router.push('/sign-in');
            }, 2000);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-action-code') {
                setError('This password reset link is invalid or has expired. Please request a new one.');
            } else {
                setError(err.message || 'Failed to reset password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // If user clicked password reset link from email, show reset password form
    if (mode === 'resetPassword' && oobCode) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <Link href="/" className="flex items-center gap-3 group justify-center mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Phone className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold gradient-text">Port67 Assistant</span>
                    </Link>

                    <div className="bg-[#05050a]/60 backdrop-blur-glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                        {resetSuccess ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Password Reset Successful</h2>
                                <p className="text-foreground/60 mb-4">Your password has been updated. Redirecting to sign in...</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <h1 className="text-3xl font-bold mb-2">Reset Your Password</h1>
                                    <p className="text-foreground/60">Enter your new password below</p>
                                </div>

                                <form onSubmit={handleResetPassword} className="space-y-6">
                                    {error && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-red-400 text-sm">{error}</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-2 px-1">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60 transition-colors"
                                            >
                                                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-2 px-1">Confirm New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                                            <input
                                                type={showConfirmNewPassword ? 'text' : 'password'}
                                                required
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60 transition-colors"
                                            >
                                                {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full btn btn-primary flex items-center justify-center gap-2 py-4 text-lg"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Normal sign-in or forgot password flow
    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Brand */}
                <Link href="/" className="flex items-center gap-3 group justify-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Phone className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-2xl font-bold gradient-text">Port67 Assistant</span>
                </Link>

                {/* Form Card */}
                <div className="bg-[#05050a]/60 backdrop-blur-glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                    {showForgotPassword ? (
                        /* Forgot Password Form */
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
                                <p className="text-foreground/60">We'll send you a reset link</p>
                            </div>

                            {resetSent ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
                                    <p className="text-foreground/60 mb-6">
                                        We've sent a password reset link to <strong>{resetEmail}</strong>
                                    </p>
                                    <button
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setResetSent(false);
                                            setResetEmail('');
                                        }}
                                        className="text-primary hover:underline font-medium"
                                    >
                                        Back to Sign In
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotPassword} className="space-y-6">
                                    {resetError && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-red-400 text-sm">{resetError}</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-2 px-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                                            <input
                                                type="email"
                                                required
                                                value={resetEmail}
                                                onChange={(e) => setResetEmail(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="w-full btn btn-primary flex items-center justify-center gap-2 py-4 text-lg"
                                    >
                                        {resetLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            'Send Reset Link'
                                        )}
                                    </button>

                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowForgotPassword(false);
                                                setResetError('');
                                            }}
                                            className="text-foreground/60 hover:text-primary transition-colors"
                                        >
                                            Back to Sign In
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    ) : (
                        /* Sign In Form */
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
                                <p className="text-foreground/60">Sign in to your account</p>
                            </div>

                            <form onSubmit={handleSignIn} className="space-y-6">
                                {error && (
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-foreground/80 mb-2 px-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                            placeholder="name@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <label className="block text-sm font-medium text-foreground/80">Password</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowForgotPassword(true)}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn btn-primary flex items-center justify-center gap-2 py-4 text-lg"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <LogIn className="w-5 h-5" />
                                            Sign In
                                        </>
                                    )}
                                </button>

                                <div className="text-center mt-6">
                                    <p className="text-foreground/60">
                                        Don't have an account?{" "}
                                        <Link href="/pricing" className="text-primary hover:underline font-medium">
                                            Get started
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
