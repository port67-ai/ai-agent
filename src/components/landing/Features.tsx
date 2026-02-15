'use client';

import { Clock, Phone, MessageSquare, Calendar, User, Zap } from 'lucide-react';

const features = [
    {
        icon: Clock,
        title: '24/7 Availability',
        description: 'Your business assistant never sleeps. Available all year round, no breaks, always ready to help your customers.',
        gradient: 'from-purple-600 via-purple-500 to-indigo-600',
        size: 'large', // Takes 2 columns
    },
    {
        icon: Phone,
        title: 'Human-Like Voice',
        description: 'Natural, conversational voice responses. Male and female voices available — no robotic tones.',
        gradient: 'from-purple-500 to-pink-500',
        size: 'normal',
    },
    {
        icon: MessageSquare,
        title: 'Multi-Channel Support',
        description: 'Works across voice calls, WhatsApp, Facebook Messenger, and SMS. One number for everything.',
        gradient: 'from-orange-600 to-amber-500',
        size: 'normal',
    },
    {
        icon: Calendar,
        title: 'Calendar Integration',
        description: 'Seamlessly connects with Google, Apple, and Microsoft calendars. Automatic booking and scheduling.',
        gradient: 'from-orange-500 to-red-500',
        size: 'normal',
    },
    {
        icon: User,
        title: 'Personalized Service',
        description: 'Tailored to your business. Knows your working days, job types, and pricing — always leads to bookings.',
        gradient: 'from-indigo-500 to-purple-500',
        size: 'normal',
    },
    {
        icon: Zap,
        title: 'Instant Response',
        description: 'No more missed opportunities. Customers get immediate answers, day or night, weekday or weekend.',
        gradient: 'from-yellow-500 to-orange-500',
        size: 'large', // Takes 2 columns
    },
];

export function Features() {
    return (
        <section id="features" className="section relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

            <div className="container-custom relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-glass border border-primary/20">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">Everything You Need</span>
                    </div>

                    <h2 className="animate-fade-in">
                        <span className="block text-foreground mb-2">To Grow Your Business</span>
                    </h2>

                    <p className="text-xl text-muted animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        Stop losing customers to missed calls and delayed responses. Our AI-powered assistant handles it all.
                    </p>
                </div>

                {/* Bento Grid - Asymmetric Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        const isLarge = feature.size === 'large';

                        return (
                            <div
                                key={feature.title}
                                className={`
                                    ${isLarge ? 'md:col-span-2' : 'md:col-span-1'}
                                    lg:col-span-${isLarge ? '2' : '1'}
                                    animate-scale-in
                                `}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="card-glass card-elevated h-full p-6 group relative overflow-hidden rounded-[3rem]">
                                    {/* Animated Gradient Background on Hover */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                                    {/* Glow Effect on Hover */}
                                    <div className={`absolute -inset-1 bg-gradient-to-r ${feature.gradient} rounded-[3rem] blur opacity-0 group-hover:opacity-30 transition-opacity duration-500 -z-10`} />

                                    <div className="relative z-10">
                                        {/* Icon Container */}
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>

                                        {/* Content */}
                                        <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                                            {feature.title}
                                        </h3>

                                        <p className="text-sm text-muted leading-relaxed">
                                            {feature.description}
                                        </p>

                                        {/* Decorative Corner Element */}
                                        <div className="absolute top-4 right-4 w-2 h-2 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-glow-pulse" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom CTA */}
                <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                    <div className="inline-block p-8 card-glass rounded-3xl shadow-2xl max-w-3xl">
                        <h3 className="text-3xl font-bold mb-4">
                            <span className="gradient-text">Tailored to YOUR Business</span>
                        </h3>
                        <p className="text-lg text-muted mb-6">
                            Whether you're a plumber, electrician, gardener, or carpenter — we customize the assistant to match your business tone, services, and schedule.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center text-sm">
                            {['Plumbers', 'Electricians', 'Gardeners', 'Carpenters', 'Builders', 'Decorators'].map((trade, i) => (
                                <span
                                    key={trade}
                                    className="px-6 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white font-medium shadow-sm hover:shadow-glow hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-orange-500/20 hover:border-orange-500/50 hover:scale-110 transition-all duration-300 cursor-default"
                                    style={{ animationDelay: `${0.7 + i * 0.05}s` }}
                                >
                                    {trade}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
