"use client";

import { Play, Calendar, Clock, Phone, ArrowUpRight, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const RECENT_CALLS = [
    { id: 1, name: 'John Smith', date: '09/02/26', time: '14:20', phone: '07700 900123', action: 'Meeting Booked' },
    { id: 2, name: 'Sarah Jenkins', date: '09/02/26', time: '11:05', phone: '07700 900456', action: 'Information Provided' },
    { id: 3, name: 'Michael Brown', date: '09/02/26', time: '09:30', phone: '07700 900789', action: 'Meeting Booked' },
    { id: 4, name: 'Emma Wilson', date: '08/02/26', time: '16:45', phone: '07700 900111', action: 'Information Provided' },
    { id: 5, name: 'David Jones', date: '08/02/26', time: '15:20', phone: '07700 900222', action: 'Meeting Booked' },
    { id: 6, name: 'Alice Cooper', date: '08/02/26', time: '14:10', phone: '07700 900333', action: 'Information Provided' },
    { id: 7, name: 'Bob Marley', date: '08/02/26', time: '12:05', phone: '07700 900444', action: 'Meeting Booked' },
    { id: 8, name: 'Charlie Sheen', date: '08/02/26', time: '10:50', phone: '07700 900555', action: 'Information Provided' },
    { id: 9, name: 'Diana Prince', date: '07/02/26', time: '17:30', phone: '07700 900666', action: 'Meeting Booked' },
    { id: 10, name: 'Edward Norton', date: '07/02/26', time: '16:15', phone: '07700 900777', action: 'Information Provided' },
    { id: 11, name: 'Fiona Apple', date: '07/02/26', time: '15:00', phone: '07700 900888', action: 'Meeting Booked' },
    { id: 12, name: 'George Clooney', date: '07/02/26', time: '13:45', phone: '07700 900999', action: 'Information Provided' },
    { id: 13, name: 'Hannah Abbott', date: '07/02/26', time: '11:20', phone: '07700 900000', action: 'Meeting Booked' },
    { id: 14, name: 'Ian Wright', date: '06/02/26', time: '17:55', phone: '07700 900112', action: 'Information Provided' },
    { id: 15, name: 'Jack Reacher', date: '06/02/26', time: '16:40', phone: '07700 900223', action: 'Meeting Booked' },
    { id: 16, name: 'Kelly Holmes', date: '06/02/26', time: '15:25', phone: '07700 900334', action: 'Information Provided' },
    { id: 17, name: 'Liam Neeson', date: '06/02/26', time: '14:10', phone: '07700 900445', action: 'Meeting Booked' },
    { id: 18, name: 'Mark Wahlberg', date: '06/02/26', time: '12:55', phone: '07700 900556', action: 'Information Provided' },
    { id: 19, name: 'Nina Simone', date: '05/02/26', time: '17:40', phone: '07700 900667', action: 'Meeting Booked' },
    { id: 20, name: 'Oscar Wilde', date: '05/02/26', time: '16:25', phone: '07700 900778', action: 'Information Provided' },
];

export function CallLog() {
    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Recent 20 calls history</h3>
                <button className="text-sm font-bold text-primary hover:text-primary-light transition-colors uppercase tracking-wider">
                    Export CSV
                </button>
            </div>

            <div className="card-glass border border-white/5 rounded-[2.5rem] bg-white/2 overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] scrollbar-hide">
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
                            {RECENT_CALLS.map((call, index) => (
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
                                            {call.phone}
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
                </div>
            </div>
        </div>
    );
}
