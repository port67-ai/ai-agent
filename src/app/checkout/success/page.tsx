import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/landing/Footer';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
    return (
        <main className="min-h-screen bg-surface">
            <Navbar />

            <div className="pt-20 pb-16">
                <div className="container-custom max-w-2xl">
                    <div className="card bg-white text-center py-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/10 mb-6">
                            <CheckCircle className="w-12 h-12 text-secondary" />
                        </div>

                        <h1 className="text-3xl font-bold text-foreground mb-4">
                            Welcome to Port67! 🎉
                        </h1>

                        <p className="text-xl text-muted mb-8">
                            Your business assistant is being set up. We'll be in touch within 24 hours to complete the configuration.
                        </p>

                        <div className="bg-surface rounded-xl p-6 mb-8 text-left">
                            <h2 className="font-bold text-lg mb-4">What Happens Next:</h2>
                            <ol className="space-y-3 text-muted">
                                <li className="flex gap-3">
                                    <span className="font-bold text-primary">1.</span>
                                    <span>We'll send you an email with your new UK mobile number</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-primary">2.</span>
                                    <span>Our team will configure your voice assistant based on your business details</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-primary">3.</span>
                                    <span>We'll send you calendar integration links</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-primary">4.</span>
                                    <span>You'll be live and ready to capture every customer!</span>
                                </li>
                            </ol>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/dashboard" className="btn btn-primary">
                                Go to Dashboard
                            </Link>
                            <Link href="/" className="btn btn-outline">
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
