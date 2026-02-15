'use client';

import { useState } from 'react';
import { CheckCircle, Sparkles, Zap, Gem, ArrowRight, ChevronDown, ChevronUp, Phone, MessageSquare, Info, MessageCircle, Instagram, X, Linkedin } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const plans = [
    {
        name: 'Starter',
        subtitle: 'Perfect for Solopreneurs',
        price: '35.20',
        period: 'per month*',
        billing: 'Billed yearly',
        icon: Sparkles,
        gradient: 'from-purple-600 via-purple-500 to-indigo-600',
        glowColor: 'group-hover:bg-purple-500/10',
        borderColor: 'group-hover:border-purple-400/50',
        ctaColor: 'bg-gradient-to-r from-purple-600 to-indigo-600',
        socialIcons: [<Phone key="p" size={18} />, <Info key="i" size={18} />, <MessageSquare key="m" size={18} />, <MessageCircle key="w" size={18} />],
        mainFeatures: [
            '1 x Social Set (1 of each)',
            '1 x Dedicated User Account'
        ],
        detailedFeatures: [
            '1 x New UK mobile number',
            '1 x AI Voice agent',
            '1 x Facebook Chatbot',
            '1 x WhatsApp AI agent',
            '1 x Calendar Integration',
            '1 x Unique booking link',
            '12 x Facebook page admin',
            'Live chat support'
        ],
        note: 'Service is calculated on a fair use policy. Voice usage capped at 30 minutes inbound per month.'
    },
    {
        name: 'Growth',
        subtitle: 'Scalable for Teams',
        price: '55.50',
        period: 'per month*',
        billing: 'Billed yearly',
        icon: Zap,
        gradient: 'from-orange-500 via-orange-400 to-amber-600',
        glowColor: 'group-hover:bg-orange-500/10',
        borderColor: 'group-hover:border-orange-400/50',
        ctaColor: 'bg-gradient-to-r from-orange-500 to-amber-600 text-black',
        socialIcons: [<Phone key="p" size={18} />, <Info key="i" size={18} />, <MessageSquare key="m" size={18} />, <MessageCircle key="w" size={18} />],
        mainFeatures: [
            '2 x Social Set (2 of each)',
            '2 x Dedicated User Accounts'
        ],
        detailedFeatures: [
            '2 x New UK mobile numbers',
            '2 x AI Voice agents',
            '2 x Facebook Chatbots',
            '2 x WhatsApp AI agents',
            '2 x Calendar Integrations',
            '2 x Unique booking links',
            '12 x Facebook page admin',
            'Live chat support'
        ],
        note: 'Service is calculated on a fair use policy. Voice usage capped at 70 minutes inbound per month.'
    },
    {
        name: 'Teamer',
        subtitle: 'Enterprise Solutions',
        price: 'Custom',
        period: '',
        billing: 'Tailored for your business needs',
        icon: Gem,
        gradient: 'from-purple-600 via-pink-500 to-orange-500',
        glowColor: 'group-hover:bg-purple-500/10',
        borderColor: 'group-hover:border-purple-400/50',
        ctaColor: 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500',
        socialIcons: [<Instagram key="ig" size={18} />, <X key="x" size={18} />, <Phone key="p" size={18} />, <Info key="i" size={18} />, <MessageSquare key="m" size={18} />, <Linkedin key="li" size={18} />],
        mainFeatures: [
            'Full Enterprise Social Set',
            'Unlimited Business Accounts'
        ],
        sections: [
            {
                title: 'Fully automated voice assistant',
                items: ['Hand calls to departments', 'AI enabled conversation', 'Matching your Voice']
            },
            {
                title: 'Social content creation',
                items: ['Writing & scheduling blogs']
            },
            {
                title: 'Business integration',
                items: ['Calendar, invoicing, booking, etc']
            }
        ],
        note: 'Get a custom demo to see how we can align with your business goals.'
    }
];

export function Pricing() {
    const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

    return (
        <section id="pricing" className="section relative overflow-hidden bg-[#05050a] py-24">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] -z-10" />

            <div className="container-custom relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10"
                    >
                        <span className="text-sm font-semibold text-purple-300">Premium Plans</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-white"
                    >
                        <span className="block text-5xl md:text-7xl font-black tracking-tight">Simple Pricing for</span>
                        <span className="block gradient-text mt-4">Extraordinary Growth</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-slate-400"
                    >
                        Choose the perfect assistant for your business journey.
                    </motion.p>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start pt-12">
                    {plans.map((plan, planIndex) => {
                        const Icon = plan.icon;
                        const isExpanded = expandedPlan === planIndex;
                        return (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: planIndex * 0.1 }}
                                className={`group relative card-glass backdrop-blur-xl rounded-[3rem] border border-white/10 p-10 flex flex-col transition-all duration-500 hover:shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:-translate-y-4 animate-float ${plan.glowColor} ${plan.borderColor}`}
                                style={{ animationDelay: `${planIndex * 0.5}s` }}
                            >
                                {/* Background Glow Interaction */}
                                <div className={`absolute inset-0 rounded-[3rem] bg-gradient-to-br ${plan.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                                <div className="relative z-10 flex flex-col h-full">
                                    {/* Icon & Title Row */}
                                    <div className="mb-8 flex justify-between items-start">
                                        <div>
                                            <h3 className="text-3xl font-black text-white mb-2">{plan.name}</h3>
                                            <p className="text-slate-400 font-medium text-sm">{plan.subtitle}</p>
                                        </div>
                                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${plan.gradient} shadow-lg shadow-black/20`}>
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>
                                    </div>

                                    {/* Price Section */}
                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-1">
                                            {plan.price !== 'Custom' && <span className="text-2xl font-bold text-white">£</span>}
                                            <span className="text-6xl font-black text-white tracking-tight">{plan.price}</span>
                                            <span className="text-lg font-bold text-slate-400 ml-2">{plan.period}</span>
                                        </div>
                                        <p className="text-slate-400 text-sm mt-2 leading-relaxed">{plan.billing}</p>
                                    </div>

                                    {/* Feature Group: Social Set */}
                                    <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5 group-hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Includes Social Set</span>
                                            <div className="flex gap-2">
                                                {plan.socialIcons.map((icon, i) => (
                                                    <div key={i} className="text-slate-300 group-hover:text-white transition-colors">
                                                        {icon}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {plan.mainFeatures.map((f, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${plan.gradient}`} />
                                                    <span className="text-white font-bold text-sm tracking-tight">{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CTA Button */}
                                    <Link
                                        href={`/pricing?plan=${plan.name.toLowerCase()}&step=business-details`}
                                        className={`w-full py-5 rounded-2xl text-center font-black text-white shadow-xl transition-all duration-300 transform group-hover:scale-[1.02] active:scale-95 mb-8 ${plan.ctaColor} flex items-center justify-center gap-2`}
                                    >
                                        Get Started
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>

                                    {/* Expandable Detailed Features */}
                                    <div className="">
                                        <button
                                            onClick={() => setExpandedPlan(isExpanded ? null : planIndex)}
                                            className="flex items-center gap-2 text-white/60 hover:text-white font-bold text-sm transition-colors"
                                        >
                                            {isExpanded ? (
                                                <>Show Less <ChevronUp size={16} /></>
                                            ) : (
                                                <>Detailed Breakdown <ChevronDown size={16} /></>
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-6 space-y-6">
                                                        {plan.detailedFeatures ? (
                                                            <div className="space-y-3">
                                                                {plan.detailedFeatures.map(feature => (
                                                                    <div key={feature} className="flex items-center gap-3 px-2">
                                                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                                        <span className="text-sm text-slate-300">{feature}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-6">
                                                                {plan.sections?.map(section => (
                                                                    <div key={section.title} className="space-y-2">
                                                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{section.title}</p>
                                                                        <ul className="space-y-2">
                                                                            {section.items.map(item => (
                                                                                <li key={item} className="text-sm text-slate-300 flex items-start gap-3 pl-1">
                                                                                    <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${plan.gradient} mt-2 flex-shrink-0`} />
                                                                                    {item}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Footer Note - Now inside expanded area */}
                                                        <div className="pt-6 border-t border-white/5">
                                                            <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-medium">
                                                                <span className="font-black text-slate-400 mr-1">NOTE:</span> {plan.note}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Bottom Trust Row */}
                <div className="mt-24 pt-12 border-t border-white/5 flex flex-wrap justify-center gap-12 text-slate-500 font-bold text-sm uppercase tracking-widest">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-glow-pulse" />
                        No Setup Fees
                    </div>
                </div>
            </div>
        </section>
    );
}
