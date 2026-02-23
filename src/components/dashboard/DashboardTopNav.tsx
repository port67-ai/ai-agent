'use client';

import { useState } from 'react';
import { Bell, Menu, X, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Port67Logo } from '@/components/Port67Logo';

const menuItems = [
    { label: 'Home', href: '/', description: 'Back to main website' },
    { label: 'Dashboard', href: '/dashboard', description: 'Your overview' },
    { label: 'Insights', href: '/dashboard/insights', description: 'Analytics & statistics' },
    { label: 'Settings', href: '/dashboard/settings', description: 'Business configuration' },
];

export function DashboardTopNav() {
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
        router.push('/sign-in');
    };

    return (
        <>
            {/* Fixed Top Nav */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="group-hover:scale-110 transition-transform">
                            <Port67Logo size={34} />
                        </div>
                        <span className="font-bold text-white text-lg">Port67 AI</span>
                    </Link>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                        </button>
                        <button
                            onClick={() => setMenuOpen(true)}
                            className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Overlay Backdrop */}
            {menuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            {/* Slide-in Menu Panel */}
            <div
                className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-[#05050a] border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
                    menuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Menu Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Port67Logo size={34} />
                        <span className="font-bold text-white">Port67 AI</span>
                    </div>
                    <button
                        onClick={() => setMenuOpen(false)}
                        className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className={`flex flex-col px-4 py-4 rounded-xl transition-all border ${
                                    isActive
                                        ? 'bg-primary/10 border-primary/30 text-primary'
                                        : 'border-transparent hover:bg-white/5 hover:border-white/10 text-white'
                                }`}
                            >
                                <span className="font-bold text-sm">{item.label}</span>
                                <span className="text-xs text-slate-500 mt-0.5">{item.description}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 space-y-3">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="font-bold text-sm uppercase tracking-widest">Sign Out</span>
                    </button>
                    <p className="text-xs text-slate-600 text-center">Port67 AI — Business Assistant</p>
                </div>
            </div>
        </>
    );
}
