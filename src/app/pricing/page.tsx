'use client';

import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/landing/Footer';
import { BusinessDetailsForm } from '@/components/checkout/BusinessDetailsForm';
import { CheckoutPlaceholder } from '@/components/checkout/CheckoutPlaceholder';
import { Pricing } from '@/components/landing/Pricing';

export default function PricingPage() {
    const searchParams = useSearchParams();
    const step = searchParams.get('step');

    return (
        <main className="min-h-screen bg-background relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-purple-900/40 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-t from-orange-500/10 to-transparent pointer-events-none" />

            <Navbar />

            <div className="relative z-10 pt-24 pb-20">
                {step === 'business-details' ? (
                    <section className="section py-12">
                        <div className="container-custom max-w-3xl">
                            <div className="card card-glass border border-white/10 backdrop-blur-2xl p-8 md:p-12">
                                <BusinessDetailsForm />
                            </div>
                        </div>
                    </section>
                ) : step === 'checkout' ? (
                    <section className="section">
                        <div className="container-custom max-w-2xl">
                            <CheckoutPlaceholder />
                        </div>
                    </section>
                ) : (
                    <Pricing />
                )}
            </div>

            <Footer />
        </main>
    );
}
