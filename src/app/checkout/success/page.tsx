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
                    <div className="card-glass backdrop-blur-xl border border-white/10 text-center py-12 px-8 rounded-3xl shadow-2xl">
                        {/* Success Icon with gradient background */}
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 mb-6 animate-pulse">
                            <CheckCircle className="w-12 h-12 text-orange-400" />
                        </div>

                        <h1 className="text-4xl font-bold text-white mb-4">
                            Welcome to Port67! 🎉
                        </h1>

                        <p className="text-xl text-slate-300 mb-8 max-w-lg mx-auto">
                            Your business assistant is being set up. We'll be in touch within 24 hours to complete the configuration.
                        </p>

                        {/* What Happens Next - Dark box with purple accent */}
                        <div className="bg-[#0a0a0f]/80 backdrop-blur-md rounded-2xl p-8 mb-8 text-left border border-white/5 shadow-xl">
                            <h2 className="font-black text-xl mb-6 text-white">What Happens Next:</h2>
                            <ol className="space-y-4">
                                <li className="flex gap-4 items-start">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center font-bold text-white text-sm">1</span>
                                    <span className="text-slate-300 pt-1">We'll send you an email with your new UK mobile number</span>
                                </li>
                                <li className="flex gap-4 items-start">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center font-bold text-white text-sm">2</span>
                                    <span className="text-slate-300 pt-1">Our team will configure your voice assistant based on your business details</span>
                                </li>
                                <li className="flex gap-4 items-start">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center font-bold text-white text-sm">3</span>
                                    <span className="text-slate-300 pt-1">We'll send you calendar integration links</span>
                                </li>
                                <li className="flex gap-4 items-start">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center font-bold text-white text-sm">4</span>
                                    <span className="text-slate-300 pt-1">You'll be live and ready to capture every customer!</span>
                                </li>
                            </ol>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/dashboard" className="btn btn-primary px-8 py-4 text-lg font-black">
                                Go to Dashboard
                            </Link>
                            <Link href="/" className="btn btn-outline px-8 py-4 text-lg font-semibold">
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
