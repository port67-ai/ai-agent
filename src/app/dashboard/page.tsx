"use client";

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { CallLog } from '@/components/dashboard/CallLog';
import { PromotionalCard } from '@/components/dashboard/PromotionalCard';
import { BottomNav } from '@/components/dashboard/BottomNav';

export default function DashboardPage() {
    return (
        <main className="min-h-screen bg-surface text-white">
            <div className="container-custom max-w-lg mx-auto pb-24 px-4 overflow-x-hidden">
                <DashboardHeader />
                <DashboardStats />
                <CallLog />
                <PromotionalCard />
            </div>

            <BottomNav />
        </main>
    );
}
