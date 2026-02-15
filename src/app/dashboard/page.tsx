import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { CallLog } from '@/components/dashboard/CallLog';
import { PromotionalCard } from '@/components/dashboard/PromotionalCard';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
    const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    let userId = null;

    if (isClerkConfigured) {
        const authData = await auth();
        userId = authData.userId;
    } else {
        // In mock mode, we assume the user is "signed in" if they reached here 
        // or we can rely on client-side protection if needed.
        // For the purpose of the mock-up, we'll allow access.
        userId = 'mock_user_123';
    }

    if (!userId) {
        redirect('/sign-in');
    }

    return (
        <main className="min-h-screen bg-[#0a0e14] text-white">
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
