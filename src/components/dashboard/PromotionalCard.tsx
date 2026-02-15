"use client";

import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export function PromotionalCard() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-700 mb-20 group"
        >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl transition-transform duration-700 group-hover:scale-110" />

            {/* Arrow/Chart graphic placeholder */}
            <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20 pointer-events-none">
                <TrendingUp className="w-full h-full text-white transform translate-y-8 translate-x-8" />
            </div>

            <div className="relative z-10 max-w-[280px]">
                <h3 className="text-2xl font-bold text-white mb-2">
                    Scale your business
                </h3>
                <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                    You've saved 4 hours this week using Voice AI.
                </p>

                <button className="bg-white text-blue-600 font-bold px-6 py-3 rounded-2xl hover:bg-slate-50 transition-colors shadow-lg shadow-black/10">
                    Upgrade to Pro
                </button>
            </div>
        </motion.div>
    );
}
