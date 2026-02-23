'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

export function CheckoutPlaceholder() {
    const router = useRouter();
    const { user } = useUser();
    const [processing, setProcessing] = useState(false);

    const handleCheckout = async () => {
        setProcessing(true);

        // Simulate payment processing
        setTimeout(() => {
            // Set welcome flag so settings page shows splash
            localStorage.setItem('showWelcome', 'true');
            router.push('/dashboard/settings');
        }, 2000);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    Complete Your Purchase
                </h2>
                <p className="text-muted">
                    Secure checkout powered by Stripe
                </p>
            </div>

            {/* Mock mode notice */}
            <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-blue-200 mb-1">Development Mode</p>
                    <p className="text-blue-100/70 leading-relaxed">
                        Stripe integration is not yet configured. This is a placeholder checkout flow.
                        When you add your Stripe API keys, real payment processing will be enabled.
                    </p>
                </div>
            </div>

            {/* Order Summary */}
            <div className="card card-glass border border-white/10 backdrop-blur-2xl p-8">
                <h3 className="font-bold text-xl mb-6">Order Summary</h3>

                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Business Assistant - Annual Plan</span>
                        <span className="font-bold text-lg">£XXX</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">VAT (20%)</span>
                        <span className="text-slate-500">£XX</span>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-xl">Total</span>
                        <div className="text-right">
                            <span className="font-bold text-3xl gradient-text-glow">£XXX</span>
                            <p className="text-sm text-slate-500 mt-1 uppercase tracking-wider font-bold">Billed annually</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* What's Included */}
            <div className="card card-glass border border-white/5 bg-white/2 p-8">
                <h3 className="font-bold text-lg mb-4 text-slate-200">What's Included:</h3>
                <ul className="grid sm:grid-cols-2 gap-4 text-sm">
                    {[
                        'New UK mobile number',
                        'Voice, WhatsApp & Facebook',
                        'Calendar sync (Google/Apple)',
                        'Unlimited calls & messages',
                        '24/7 automated responses',
                        'Live chat support',
                    ].map((item) => (
                        <li key={item} className="flex items-center gap-3 text-slate-300">
                            <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-3.5 h-3.5 text-secondary" />
                            </div>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Payment Button */}
            <button
                onClick={handleCheckout}
                disabled={processing}
                className="btn btn-primary w-full text-lg justify-center"
            >
                {processing ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <CreditCard className="w-5 h-5" />
                        Complete Purchase (Mock)
                    </>
                )}
            </button>

            <p className="text-xs text-center text-muted">
                By completing this purchase, you agree to our Terms & Conditions and Privacy Policy
            </p>
        </div>
    );
}
