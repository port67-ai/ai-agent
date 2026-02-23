'use client';

import { BarChart3, TrendingUp, PhoneMissed, CalendarCheck, Sparkles, Clock } from 'lucide-react';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { useUser } from '@/hooks/useUser';

export default function InsightsPage() {
    const { firstName } = useUser();

    const stats = [
        {
            label: 'Calls This Month',
            value: '—',
            change: 'Coming soon',
            icon: PhoneMissed,
            gradient: 'from-purple-600 to-purple-500',
            bg: 'bg-purple-500/10',
        },
        {
            label: 'Meetings Booked',
            value: '—',
            change: 'Coming soon',
            icon: CalendarCheck,
            gradient: 'from-emerald-600 to-emerald-500',
            bg: 'bg-emerald-500/10',
        },
        {
            label: 'Calls Handled by AI',
            value: '—',
            change: 'Coming soon',
            icon: Sparkles,
            gradient: 'from-blue-600 to-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Avg Response Time',
            value: '—',
            change: 'Coming soon',
            icon: Clock,
            gradient: 'from-orange-600 to-orange-500',
            bg: 'bg-orange-500/10',
        },
    ];

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-10 pt-4">
                <h1 className="text-4xl font-bold bg-white bg-clip-text text-transparent mb-1">
                    Insights
                </h1>
                <p className="text-slate-500 font-medium">
                    Your business performance overview
                </p>
            </div>

            {/* Coming Soon Banner */}
            <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-2xl p-6 mb-8 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="font-black text-white text-lg mb-1">Advanced Analytics Coming Soon</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Detailed charts, call trends, revenue forecasts, and AI performance metrics will be available here. We're building this feature now!
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="card-glass backdrop-blur-xl border border-white/5 rounded-2xl p-5"
                        >
                            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                                <Icon className="w-5 h-5 text-white/70" />
                            </div>
                            <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-[10px] text-slate-600 uppercase tracking-wider">{stat.change}</p>
                        </div>
                    );
                })}
            </div>

            {/* Chart Placeholder */}
            <div className="card-glass backdrop-blur-xl border border-white/5 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="font-black text-white text-lg">Monthly Call Volume</h3>
                </div>

                {/* Placeholder bars */}
                <div className="flex items-end justify-between gap-2 h-32">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => (
                        <div key={month} className="flex-1 flex flex-col items-center gap-2">
                            <div
                                className="w-full rounded-t-lg bg-gradient-to-t from-purple-600/20 to-purple-500/10 border border-purple-500/10"
                                style={{ height: `${[40, 55, 35, 70, 50, 30][i]}%` }}
                            />
                            <span className="text-[9px] text-slate-600 font-bold uppercase">{month}</span>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-slate-600 text-center mt-4 uppercase tracking-widest font-bold">
                    Live data coming soon
                </p>
            </div>

            {/* Feature List */}
            <div className="card-glass backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <h3 className="font-black text-white mb-4">What's Coming:</h3>
                <ul className="space-y-3">
                    {[
                        'Call volume trends by day & hour',
                        'AI vs missed call breakdown',
                        'Revenue impact calculator',
                        'Customer return rate tracking',
                        'Peak busy hours analysis',
                        'Monthly performance reports',
                    ].map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-slate-400 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            {feature}
                        </li>
                    ))}
                </ul>
            </div>

            <BottomNav />
        </div>
    );
}
