"use client";

import { useUser } from '@/hooks/useUser';

export function DashboardHeader() {
    const { firstName } = useUser();
    const displayName = firstName || 'Alex';

    const today = new Date();
    const hour = today.getHours();
    const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

    const formattedDate = today.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="mb-10 pt-4">
            <h1 className="text-4xl font-bold bg-white bg-clip-text text-transparent mb-1">
                {greeting}, {displayName}
            </h1>
            <p className="text-slate-500 font-medium">
                {formattedDate}
            </p>
        </div>
    );
}
