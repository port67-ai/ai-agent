'use client';

import { FileText, Phone, Share2, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const steps = [
    {
        number: '1',
        icon: FileText,
        title: 'Fill In Your Business Details',
        description: 'Quick form about your business, services, working days, and hours. Takes just 5 minutes.',
        features: [
            'Business type and services',
            'Working schedule',
            'Service areas',
            'Pricing information',
        ],
        gradient: 'from-red-500 to-orange-500',
    },
    {
        number: '2',
        icon: Phone,
        title: 'Get Your New UK Mobile Number',
        description: 'We provide a dedicated UK mobile number for voice, WhatsApp, and SMS — all connected to your assistant.',
        features: [
            'New UK mobile number',
            'Voice call setup',
            'WhatsApp integration',
            'Testing and verification',
        ],
        gradient: 'from-purple-500 to-pink-500',
    },
    {
        number: '3',
        icon: Share2,
        title: 'Connect & Go Live',
        description: 'Link your calendar, share your Facebook page, and you\'re ready. Start capturing customers immediately.',
        features: [
            'Calendar integration (Google/Apple/Microsoft)',
            'Facebook Messenger connection',
            'Phone divert setup',
            'You\'re live!',
        ],
        gradient: 'from-green-500 to-emerald-500',
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="section bg-surface relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

            <div className="container-custom relative z-10">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-20 space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 backdrop-blur-glass border border-secondary/20">
                        <CheckCircle className="w-4 h-4 text-secondary" />
                        <span className="text-sm font-semibold text-secondary">Simple Setup</span>
                    </div>

                    <h2 className="">
                        <span className="text-foreground">Get Started in</span>
                        <span className="block gradient-text mt-2">Just 3 Simple Steps</span>
                    </h2>

                    <p className="text-xl text-muted">
                        No technical knowledge required. We handle the setup, you start getting bookings.
                    </p>
                </motion.div>

                {/* Modern Timeline */}
                <div className="max-w-6xl mx-auto relative">
                    {/* Connecting Line - Desktop */}
                    <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary via-accent to-secondary opacity-20" />
                        <div className="absolute inset-0 bg-gradient-to-b from-primary via-accent to-secondary opacity-40 blur-sm" />
                    </div>

                    {/* Steps */}
                    <div className="space-y-16">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isEven = index % 2 === 0;

                            return (
                                <div
                                    key={step.number}
                                    className={`relative`}
                                >
                                    <div className={`grid lg:grid-cols-2 gap-8 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                                        {/* Content Side */}
                                        <motion.div
                                            initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.6, delay: index * 0.1 }}
                                            className={`${isEven ? 'lg:text-right lg:pr-16' : 'lg:pl-16 lg:col-start-2'}`}
                                        >
                                            <motion.div
                                                animate={{ y: [0, -15, 0] }}
                                                transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
                                                className="card-glass card-elevated p-8 group rounded-[3.5rem] relative"
                                            >
                                                {/* Gradient Glow */}
                                                <div className={`absolute -inset-1 bg-gradient-to-r ${step.gradient} rounded-[3.5rem] blur opacity-0 group-hover:opacity-30 transition-opacity duration-500 -z-10`} />

                                                <div className="relative">
                                                    {/* Step Number Badge */}
                                                    <div className={`inline-flex items-center gap-3 mb-4 ${isEven ? 'lg:flex-row-reverse' : ''}`}>
                                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                                                            {step.number}
                                                        </div>
                                                        <div className={`h-px w-12 bg-gradient-to-r ${step.gradient} opacity-50`} />
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="text-3xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                                                        {step.title}
                                                    </h3>

                                                    {/* Description */}
                                                    <p className="text-lg text-muted mb-6">
                                                        {step.description}
                                                    </p>

                                                    {/* Features list */}
                                                    <ul className={`space-y-3 ${isEven ? 'lg:flex lg:flex-col lg:items-end' : ''}`}>
                                                        {step.features.map((feature) => (
                                                            <li key={feature} className={`flex items-center gap-3 ${isEven ? 'lg:flex-row-reverse' : ''}`}>
                                                                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${step.gradient} flex items-center justify-center flex-shrink-0`}>
                                                                    <CheckCircle className="w-4 h-4 text-white" />
                                                                </div>
                                                                <span className="text-foreground font-medium">{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </motion.div>
                                        </motion.div>

                                        {/* Icon Side */}
                                        <motion.div
                                            initial={{ opacity: 0, x: isEven ? 50 : -50 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.6, delay: index * 0.1 }}
                                            className={`hidden lg:block ${isEven ? 'lg:col-start-2' : 'lg:col-start-1 lg:row-start-1'}`}
                                        >
                                            <div className="relative">
                                                {/* Large Icon with Glow */}
                                                <motion.div
                                                    animate={{ y: [0, -20, 0] }}
                                                    transition={{ duration: 6 + index, repeat: Infinity, ease: "easeInOut" }}
                                                    className={`w-48 h-48 mx-auto rounded-3xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-2xl`}
                                                >
                                                    <Icon className="w-24 h-24 text-white" />

                                                    {/* Glow Effect */}
                                                    <div className={`absolute -inset-4 bg-gradient-to-r ${step.gradient} rounded-3xl blur-2xl opacity-50 -z-10`} />
                                                </motion.div>

                                                {/* Decorative Elements */}
                                                <div className={`absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gradient-to-br ${step.gradient} animate-glow-pulse`} />
                                                <div className={`absolute -bottom-4 -left-4 w-6 h-6 rounded-full bg-gradient-to-br ${step.gradient} animate-glow-pulse`} style={{ animationDelay: '1s' }} />
                                            </div>
                                        </motion.div>

                                        {/* Mobile Icon */}
                                        <div className="lg:hidden flex justify-center">
                                            <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-xl`}>
                                                <Icon className="w-16 h-16 text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Center Timeline Node - Desktop */}
                                    <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${step.gradient} shadow-lg border-4 border-surface`} />
                                        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.gradient} blur-md opacity-50`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-24 text-center"
                >
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-block p-12 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden max-w-4xl"
                    >
                        {/* Animated background gradient - smoother and less bright */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 90, 180, 270, 360],
                            }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-[50%] bg-gradient-to-tr from-purple-900/40 via-orange-900/30 to-pink-900/40 blur-3xl opacity-60"
                        />

                        {/* Subtle Grid Overlay */}
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4wNSIv+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />

                        <div className="relative z-10">
                            <h3 className="text-4xl font-bold mb-4">
                                That's it - You're Up and Running! 🎉
                            </h3>
                            <p className="text-xl opacity-95 max-w-2xl mx-auto">
                                Remember, we tailor YOUR business assistant for YOUR business. Every detail is customized to match your services and style.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
