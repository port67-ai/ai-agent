"use client";

import { useState, useEffect } from 'react';
import { Calendar, Clock, Phone, ArrowUpRight, Info, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { firebaseDb } from '@/lib/services/firebase-db';

export function CallLog() {
    const { user } = useUser();
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            firebaseDb.getCallHistory(user.uid).then(data => {
                setCalls(data);
                setLoading(false);
            });
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Recent calls history</h3>
                {calls.length > 0 && (
                    <button className="text-sm font-bold text-primary hover:text-primary-light transition-colors uppercase tracking-wider">
                        Export CSV
                    </button>
                )}
            </div>

            <div className="card-glass border border-white/5 rounded-[2.5rem] bg-white/2 overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] scrollbar-hide">
                    {calls.length === 0 ? (
                        <div className="p-12 text-center text-foreground/40 font-medium">
                            No calls recorded yet.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-[#0a0e14]/90 backdrop-blur-md">
                                <tr className="border-b border-white/10">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Time</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Mobile Number</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {calls.map((call, index) => (
                                    <motion.tr
                                        key={call.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="hover:bg-white/3 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                                    {call.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-200">{call.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm text-slate-400 font-medium">{call.date}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/50 text-xs text-slate-400 font-bold border border-white/5">
                                                <Clock className="w-3 h-3" />
                                                {call.time}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                                                <Phone className="w-3 h-3 text-slate-500" />
                                                {call.mobileNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {call.action === 'Meeting Booked' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-[10px] font-black text-emerald-500 border border-emerald-500/20 uppercase tracking-tight">
                                                    <ArrowUpRight className="w-3 h-3" />
                                                    {call.action}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-blue/10 text-[10px] font-black text-neon-blue border border-neon-blue/20 uppercase tracking-tight">
                                                    <Info className="w-3 h-3" />
                                                    {call.action}
                                                </span>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
