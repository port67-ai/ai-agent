'use client';

import { TrendingDown, Clock, Phone, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const stats = [
    {
        icon: Phone,
        value: '62%',
        label: 'Of Calls Go Unanswered',
        description: 'Trade professionals miss over half their calls',
        color: 'from-red-500 to-orange-500',
    },
    {
        icon: Clock,
        value: '4.5hrs',
        label: 'Average Response Time',
        description: 'Customers wait hours for a callback',
        color: 'from-orange-500 to-yellow-500',
    },
    {
        icon: TrendingDown,
        value: '£47k',
        label: 'Lost Revenue Per Year',
        description: 'From missed calls and slow responses',
        color: 'from-purple-500 to-pink-500',
    },
    {
        icon: MessageSquare,
        value: '73%',
        label: 'Want Instant Messaging',
        description: 'Customers prefer WhatsApp and Facebook',
        color: 'from-purple-600 to-orange-500',
    },
];

export function Statistics() {
    return (
        <section className="section relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
            {/* Animated Background Grid */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                }} />
            </div>

            {/* Glowing Orbs */}
            <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-glow-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }} />

            <div className="container-custom relative z-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-16 space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-glass border border-white/20">
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-semibold text-white">The Cost of Inaction</span>
                    </div>

                    <h2 className="text-white">
                        How Much Business Are You
                        <span className="block mt-2 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                            Losing Every Day?
                        </span>
                    </h2>

                    <p className="text-xl text-slate-300">
                        The numbers don't lie. Every missed call and delayed response is money left on the table.
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;

                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{
                                    delay: index * 0.1,
                                    duration: 0.6,
                                    type: "spring",
                                    stiffness: 100
                                }}
                                className="h-full"
                            >
                                <motion.div
                                    animate={{
                                        y: [0, -10, 0],
                                    }}
                                    transition={{
                                        duration: 4 + index,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="card-glass p-8 group relative overflow-hidden h-full border border-white/10 rounded-[3rem]"
                                >
                                    {/* Gradient Glow on Hover */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
                                    <div className={`absolute -inset-1 bg-gradient-to-r ${stat.color} rounded-[3rem] blur opacity-0 group-hover:opacity-40 transition-opacity duration-500 -z-10`} />

                                    <div className="relative z-10">
                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>

                                        {/* Value - Large and Glowing */}
                                        <div className={`text-5xl font-bold mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent group-hover:text-glow transition-all`}>
                                            {stat.value}
                                        </div>

                                        {/* Label */}
                                        <div className="text-lg font-semibold text-white mb-2">
                                            {stat.label}
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-slate-400">
                                            {stat.description}
                                        </p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Bottom CTA */}
                <div className="mt-24 text-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    <div className="inline-block p-10 card-glass rounded-[3.5rem] shadow-2xl border border-white/10 max-w-4xl">
                        <h3 className="text-3xl font-bold text-white mb-4">
                            Stop the Bleeding
                        </h3>
                        <p className="text-lg text-slate-300 mb-6">
                            Our AI assistant answers every call, responds to every message, and books every appointment — automatically.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <div className="px-8 py-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white">
                                <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                    100%
                                </div>
                                <div className="text-sm text-slate-400">Call Answer Rate</div>
                            </div>
                            <div className="px-8 py-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white">
                                <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                                    &lt;30s
                                </div>
                                <div className="text-sm text-slate-400">Response Time</div>
                            </div>
                            <div className="px-8 py-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white">
                                <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    24/7
                                </div>
                                <div className="text-sm text-slate-400">Availability</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
