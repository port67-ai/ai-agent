'use client';

import { ArrowRight, Phone, MessageSquare, Calendar, Sparkles } from 'lucide-react';
import Link from 'next/link';

const features = [
    {
        icon: Phone,
        title: 'Voice Calls',
        description: 'Human-like voice responses, no robots',
    },
    {
        icon: MessageSquare,
        title: 'WhatsApp & Facebook',
        description: 'Instant responses across all channels',
    },
    {
        icon: Calendar,
        title: 'Calendar Integration',
        description: 'Syncs with Google, Apple, Microsoft',
    },
];

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center overflow-hidden bg-animated">
            {/* Animated Gradient Mesh Background */}
            <div className="absolute inset-0 gradient-mesh opacity-60" />

            {/* Floating Orbs */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl floating" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-secondary/20 rounded-full blur-3xl floating" style={{ animationDelay: '4s' }} />

            <div className="container-custom relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div className="text-center lg:text-left space-y-8 animate-slide-up">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
                            <Sparkles className="w-4 h-4 text-accent" />
                            <span className="text-sm font-semibold text-slate-300">
                                #1 Appointment Booker For Trade Professionals
                            </span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="animate-fade-in">
                            <span className="block text-foreground mb-2">Never Miss a</span>
                            <span className="block gradient-text-glow">Customer Again</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl md:text-2xl text-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            The automated assistant that answers calls, books appointments, and responds to messages 24/7 — so you can focus on your work.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in" style={{ animationDelay: '0.4s' }}>
                            <Link href="/pricing" className="btn btn-primary btn-glow text-lg group">
                                Get Started Now
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link href="#how-it-works" className="btn bg-white/5 backdrop-blur-md border border-white/10 hover:border-orange-500/50 hover:bg-white/10 text-white text-lg transition-all">
                                See How It Works
                            </Link>
                        </div>

                        {/* Trust Indicators */}
                        <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-muted animate-fade-in" style={{ animationDelay: '0.6s' }}>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-secondary rounded-full animate-glow-pulse" />
                                <span>No setup fees</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-secondary rounded-full animate-glow-pulse" style={{ animationDelay: '1s' }} />
                                <span>UK-based support</span>
                            </div>
                        </div>
                    </div>

                    {/* Right - 3D Floating Feature Cards */}
                    <div className="relative hidden lg:block animate-scale-in" style={{ animationDelay: '0.3s' }}>
                        <div className="relative h-[600px]">
                            {features.map((feature, index) => {
                                const Icon = feature.icon;
                                const positions = [
                                    'top-0 right-0',
                                    'top-1/2 -translate-y-1/2 left-0',
                                    'bottom-0 right-0',
                                ];

                                return (
                                    <div
                                        key={feature.title}
                                        className={`absolute ${positions[index]} w-72 floating`}
                                        style={{
                                            animationDelay: `${index * 0.5}s`,
                                            animationDuration: `${6 + index}s`
                                        }}
                                    >
                                        <div className="card-glass card-elevated p-8 group cursor-pointer transform-3d rounded-[2.5rem] bg-white/5 border-white/10 backdrop-blur-2xl">
                                            {/* Gradient Border Effect */}
                                            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-accent/30 to-purple-600/30 opacity-0 group-hover:opacity-10 transition-opacity blur-2xl" />

                                            <div className="relative">
                                                {/* Icon with Glow */}
                                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform glow-primary">
                                                    <Icon className="w-8 h-8 text-white" />
                                                </div>

                                                {/* Content */}
                                                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                                    {feature.title}
                                                </h3>
                                                <p className="text-muted">
                                                    {feature.description}
                                                </p>

                                                {/* Decorative Element */}
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-glow-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Central Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 rounded-full blur-3xl animate-glow-pulse" />
                        </div>
                    </div>
                </div>

                {/* Bottom Section - Mobile Feature Cards */}
                <div className="lg:hidden mt-16 grid sm:grid-cols-3 gap-4">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.title}
                                className="card-glass p-6 text-center animate-scale-in rounded-[2rem]"
                                style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3 shadow-lg">
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-semibold text-foreground text-sm mb-1">
                                    {feature.title}
                                </h4>
                                <p className="text-xs text-muted">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </section>
    );
}
