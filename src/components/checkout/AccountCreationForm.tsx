'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { firebaseAuth } from '@/lib/services/firebase-auth';
import { User, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export function AccountCreationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const plan = searchParams.get('plan') || 'starter';

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validatePassword = (password: string) => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate password strength
        const passwordError = validatePassword(formData.password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setLoading(true);

        try {
            console.log('Starting account creation...');

            // Create Firebase account
            const user = await firebaseAuth.signUp(
                formData.email,
                formData.password,
                formData.firstName,
                formData.lastName,
                plan.charAt(0).toUpperCase() + plan.slice(1) as "Starter" | "Growth" | "Teamer"
            );

            console.log('Account created successfully:', user.uid);
            console.log('Redirecting to business details...');

            // Redirect to business details step
            router.push(`/pricing?plan=${plan}&step=business-details`);
        } catch (err: any) {
            console.error('Account creation error:', err);
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);
            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists. Please sign in instead.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use a stronger password.');
            } else {
                setError(err.message || 'Failed to create account. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
    const passwordsDontMatch = !!(formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword);

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-4xl font-black text-white mb-3 uppercase tracking-tight">
                    Create Your Account
                </h2>
                <p className="text-slate-400 text-lg">
                    Get started with the <span className="text-primary font-bold capitalize">{plan}</span> plan
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="firstName" className="label text-[11px] font-black tracking-widest mb-2">
                            FIRST NAME <span className="text-primary">*</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                id="firstName"
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="input pl-12 bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                                placeholder="John"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="lastName" className="label text-[11px] font-black tracking-widest mb-2">
                            LAST NAME <span className="text-primary">*</span>
                        </label>
                        <input
                            id="lastName"
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                            placeholder="Doe"
                        />
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="label text-[11px] font-black tracking-widest mb-2">
                        EMAIL ADDRESS <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input pl-12 bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>

                {/* Password */}
                <div>
                    <label htmlFor="password" className="label text-[11px] font-black tracking-widest mb-2">
                        PASSWORD <span className="text-primary">*</span>
                    </label>
                    <p className="text-[10px] text-slate-500 mb-3 uppercase font-bold italic tracking-wider">
                        Minimum 8 characters
                    </p>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input pl-12 pr-12 bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div>
                    <label htmlFor="confirmPassword" className="label text-[11px] font-black tracking-widest mb-2">
                        CONFIRM PASSWORD <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className={`input pl-12 pr-12 bg-white/2 border-white/5 focus:bg-white/5 transition-colors ${
                                passwordsMatch
                                    ? 'border-emerald-500/30 focus:border-emerald-500/50'
                                    : passwordsDontMatch
                                    ? 'border-red-500/30 focus:border-red-500/50'
                                    : 'focus:border-primary/30'
                            }`}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {passwordsMatch && (
                        <p className="text-emerald-400 text-xs mt-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Passwords match
                        </p>
                    )}
                    {passwordsDontMatch && (
                        <p className="text-red-400 text-xs mt-2 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Passwords do not match
                        </p>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || passwordsDontMatch}
                    className="btn btn-primary w-full py-6 text-lg justify-center font-black uppercase tracking-widest shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_50px_rgba(147,51,234,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Creating Account...</span>
                        </>
                    ) : (
                        <span>Continue to Business Details</span>
                    )}
                </button>

                {/* Already have account */}
                <div className="text-center pt-4 border-t border-white/5">
                    <p className="text-slate-400 text-sm">
                        Already have an account?{' '}
                        <a href="/sign-in" className="text-primary hover:text-primary/80 font-bold transition-colors">
                            Sign in instead
                        </a>
                    </p>
                </div>
            </form>
        </div>
    );
}
