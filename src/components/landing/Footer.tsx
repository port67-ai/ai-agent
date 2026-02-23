'use client';

import { Mail, Phone, Facebook, Linkedin, Twitter } from 'lucide-react';
import Link from 'next/link';
import { Port67Logo } from '@/components/Port67Logo';

export function Footer() {
    return (
        <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
            {/* Animated Background Grid */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(rgba(139, 92, 246, 0.2) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(139, 92, 246, 0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                }} />
            </div>

            {/* Glowing Orbs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

            <div className="container-custom relative z-10">
                {/* Main Footer Content */}
                <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Port67Logo size={48} />
                            <span className="text-2xl font-bold">Port67</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                            The #1 appointment booking assistant for trade professionals. Never miss a customer again.
                        </p>
                        <div className="text-sm text-slate-500">
                            © 2025 Port67.ai
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 gradient-text">Quick Links</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                                    <span className="w-1 h-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="#how-it-works" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                                    <span className="w-1 h-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    How It Works
                                </Link>
                            </li>
                            <li>
                                <Link href="#pricing" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                                    <span className="w-1 h-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                                    <span className="w-1 h-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    Dashboard
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 gradient-text">Legal</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/terms" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                                    <span className="w-1 h-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    Terms & Conditions
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                                    <span className="w-1 h-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/accessibility" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                                    <span className="w-1 h-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    Accessibility
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 gradient-text">Contact Us</h3>
                        <ul className="space-y-4">
                            <li>
                                <a
                                    href="mailto:info@port67.com"
                                    className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-glass flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <span>info@port67.com</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href="tel:+44XXXXXXXX"
                                    className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-glass flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <span>+44 (0) XXX XXXX</span>
                                </a>
                            </li>
                        </ul>

                        {/* Social Links */}
                        <div className="mt-6">
                            <h4 className="text-sm font-semibold mb-4 text-slate-300">Follow Us</h4>
                            <div className="flex gap-3">
                                <a
                                    href="https://facebook.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-glass flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110"
                                    aria-label="Facebook"
                                >
                                    <Facebook className="w-5 h-5" />
                                </a>
                                <a
                                    href="https://linkedin.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-glass flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110"
                                    aria-label="LinkedIn"
                                >
                                    <Linkedin className="w-5 h-5" />
                                </a>
                                <a
                                    href="https://twitter.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-glass flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110"
                                    aria-label="Twitter"
                                >
                                    <Twitter className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="py-8 border-t border-white/10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-slate-400 text-sm text-center md:text-left">
                            Built with <span className="text-red-400">❤</span> for trade professionals across the UK
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>Powered by AI</span>
                            <div className="w-2 h-2 bg-secondary rounded-full animate-glow-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
