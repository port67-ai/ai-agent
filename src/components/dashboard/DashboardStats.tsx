"use client";

import { useState, useEffect } from 'react';
import { PhoneMissed, Sparkles, CalendarCheck, Banknote, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { firebaseDb } from '@/lib/services/firebase-db';

export function DashboardStats() {
    const { user } = useUser();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            firebaseDb.getMetrics(user.uid).then(data => {
                setMetrics(data);
                setLoading(false);
            });
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4 mb-10 max-w-2xl mx-auto">
            {/* Missed Calls */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-glass border border-white/5 p-5 rounded-[2rem] bg-white/2"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center text-slate-400">
                        <PhoneMissed className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Missed</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{metrics?.numberOfCalls || 0}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                </div>
            </motion.div>

            {/* Caught by AI */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-glass border border-white/5 p-5 rounded-[2rem] bg-white/2"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                        <Sparkles className="w-4 h-4 shadow-[0_0_10px_rgba(30,144,255,0.4)]" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Caught</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono">{metrics?.callsCaught || 0}</span>
                </div>
            </motion.div>

            {/* Meetings Booked */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card-glass border border-white/5 p-5 rounded-[2rem] bg-white/2"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <CalendarCheck className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meetings</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{metrics?.meetingsBooked || 0}</span>
                </div>
            </motion.div>

            {/* Potential Revenue */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card-glass border border-white/5 p-5 rounded-[2rem] bg-white/2 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">
                        <Banknote className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Est. Revenue</span>
                </div>
                <div className="flex items-baseline gap-2 text-emerald-400">
                    <span className="text-3xl font-bold">£{(metrics?.meetingsBooked || 0) * 300}</span>
                </div>
            </motion.div>
        </div>
    );
}
