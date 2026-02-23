"use client";

import { LayoutDashboard, BarChart3, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: BarChart3, label: 'Insights', href: '/dashboard/insights' },
        { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
    ];

    const handleSignOut = async () => {
        await signOut();
        router.push('/sign-in');
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/5 px-6 py-3">
            <div className="max-w-md mx-auto flex items-center justify-around">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 transition-colors ${
                                isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
                <button
                    onClick={handleSignOut}
                    className="flex flex-col items-center gap-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                    <LogOut className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sign Out</span>
                </button>
            </div>
        </div>
    );
}
