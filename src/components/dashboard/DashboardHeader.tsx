"use client";

import { Bell, Menu } from 'lucide-react';
import { useUser } from '@/hooks/useUser';

export function DashboardHeader() {
    const { user } = useUser();
    const displayName = user?.fullName?.split(' ')[0] || 'Alex';

    // Format date: Monday, 14 August 2023
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="flex items-center justify-between mb-10 pt-4">
            <div>
                <h1 className="text-4xl font-bold bg-white bg-clip-text text-transparent mb-1">
                    Morning, {displayName}
                </h1>
                <p className="text-slate-500 font-medium">
                    {formattedDate}
                </p>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative p-2 text-slate-300 hover:text-white transition-colors">
                    <Bell className="w-6 h-6" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-background" />
                </button>
                <button className="p-2 text-slate-300 hover:text-white transition-colors">
                    <Menu className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
