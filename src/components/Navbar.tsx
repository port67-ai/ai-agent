'use client';

import { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { useAuth } from '@/components/auth/AuthProvider';
import { Port67Logo } from '@/components/Port67Logo';

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const { isSignedIn, user } = useUser();
    const { signOut } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? 'bg-[#05050a]/80 backdrop-blur-glass shadow-lg border-b border-white/10'
            : 'bg-transparent'
            }`}>
            <div className="container-custom">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="group-hover:scale-110 transition-transform">
                            <Port67Logo size={42} />
                        </div>
                        <span className="text-xl font-bold gradient-text">Port67 Assistant</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link
                            href="#how-it-works"
                            className="text-foreground hover:text-primary font-medium transition-colors relative group"
                        >
                            How It Works
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
                        </Link>
                        <Link
                            href="#pricing"
                            className="text-foreground hover:text-primary font-medium transition-colors relative group"
                        >
                            Pricing
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
                        </Link>
                        <Link
                            href="#faq"
                            className="text-foreground hover:text-primary font-medium transition-colors relative group"
                        >
                            Got Questions?
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
                        </Link>

                        {isSignedIn ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="text-foreground hover:text-primary font-medium transition-colors relative group"
                                >
                                    Dashboard
                                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="flex items-center gap-2 text-foreground hover:text-primary font-medium transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/sign-in"
                                    className="text-foreground hover:text-primary font-medium transition-colors relative group"
                                >
                                    Sign In
                                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
                                </Link>
                                <Link href="/pricing" className="btn btn-primary">
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 rounded-xl hover:bg-surface transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isOpen ? (
                            <X className="w-6 h-6 text-foreground" />
                        ) : (
                            <Menu className="w-6 h-6 text-foreground" />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isOpen && (
                    <div className="md:hidden py-6 animate-fade-in">
                        <div className="flex flex-col gap-4">
                            <Link
                                href="#how-it-works"
                                className="px-4 py-3 rounded-xl hover:bg-surface text-foreground font-medium transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                How It Works
                            </Link>
                            <Link
                                href="#pricing"
                                className="px-4 py-3 rounded-xl hover:bg-surface text-foreground font-medium transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                Pricing
                            </Link>
                            <Link
                                href="#faq"
                                className="px-4 py-3 rounded-xl hover:bg-surface text-foreground font-medium transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                Got Questions?
                            </Link>

                            {isSignedIn ? (
                                <>
                                    <Link
                                        href="/dashboard"
                                        className="px-4 py-3 rounded-xl hover:bg-surface text-foreground font-medium transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                    <div className="px-4 py-3 border-t border-white/5 mt-2">
                                        <button
                                            onClick={() => {
                                                signOut();
                                                setIsOpen(false);
                                            }}
                                            className="w-full text-left text-foreground hover:text-primary font-medium transition-colors flex items-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/sign-in"
                                        className="px-4 py-3 rounded-xl hover:bg-surface text-foreground font-medium transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/pricing"
                                        className="btn btn-primary mx-4"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
