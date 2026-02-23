"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { Building2, Phone, Globe, Calendar, Clock, ClipboardList, Shield, Edit2, CheckCircle, Loader2, CalendarClock, CalendarCheck, LogOut, PartyPopper, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { firebaseDb } from '@/lib/services/firebase-db';

const VOICE_OPTIONS = [
    { id: 'rachel', name: 'Rachel', desc: 'Professional' },
    { id: 'drew', name: 'Drew', desc: 'Friendly' },
    { id: 'clyde', name: 'Clyde', desc: 'Casual' },
    { id: 'paul', name: 'Paul', desc: 'Mature' },
    { id: 'nicole', name: 'Nicole', desc: 'Soft' },
    { id: 'jessie', name: 'Jessie', desc: 'Energetic' },
    { id: 'ryan', name: 'Ryan', desc: 'Deep' },
    { id: 'glinda', name: 'Glinda', desc: 'Polished' },
    { id: 'finn', name: 'Finn', desc: 'Youthful' },
    { id: 'antoni', name: 'Antoni', desc: 'Neutral' },
];

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = ['00', '15', '30', '45'];

export default function SettingsPage() {
    const { user } = useUser();
    const { signOut } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [businessInfo, setBusinessInfo] = useState<any>(null);
    const [editingSegments, setEditingSegments] = useState<Record<string, boolean>>({});
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        const welcome = localStorage.getItem('showWelcome');
        if (welcome === 'true') {
            setShowWelcome(true);
            localStorage.removeItem('showWelcome');
        }
    }, []);

    useEffect(() => {
        if (user) {
            firebaseDb.getUser(user.uid).then((data: any) => {
                if (data?.businessDetails) {
                    setBusinessInfo(data.businessDetails);
                } else {
                    // Default values
                    setBusinessInfo({
                        businessName: "",
                        businessType: "",
                        currentPhoneNumber: "",
                        assistantPhoneNumber: "",
                        bookingDays: {
                            Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true,
                            Saturday: false, Sunday: false
                        },
                        startTime: "09:00",
                        stopTime: "17:00",
                        assistantVoice: 'rachel',
                        businessLink: "",
                        aiBusinessSummary: "",
                        appointment1Name: "",
                        appointment1Duration: 30,
                        appointment2Name: "",
                        appointment2Duration: 30
                    });
                }
                setLoading(false);
            });
        }
    }, [user]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/sign-in');
    };

    const toggleEdit = async (segmentTitle: string) => {
        if (editingSegments[segmentTitle]) {
            // Save logic
            setSaving(true);
            try {
                await firebaseDb.updateBusinessDetails(user!.uid, businessInfo);
            } catch (err) {
                console.error("Save failed", err);
            } finally {
                setSaving(false);
            }
        }
        setEditingSegments(prev => ({ ...prev, [segmentTitle]: !prev[segmentTitle] }));
    };

    if (loading || !businessInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    const infoGroups = [
        {
            title: "Business Identity",
            items: [
                { id: 'businessName', icon: Building2, label: "Business Name", value: businessInfo.businessName },
                { id: 'businessType', icon: Shield, label: "Business Type", value: businessInfo.businessType },
            ]
        },
        {
            title: "Assistant Voice",
            isVoiceSelector: true,
            currentVoice: businessInfo.assistantVoice,
            voices: VOICE_OPTIONS
        },
        {
            title: "Contact & Online Presence",
            items: [
                { id: 'currentPhoneNumber', icon: Phone, label: "Your Phone Number", value: businessInfo.currentPhoneNumber },
                { id: 'assistantPhoneNumber', icon: Phone, label: "Assistant Number", value: businessInfo.assistantPhoneNumber },
                { id: 'businessLink', icon: Globe, label: "Business Link", value: businessInfo.businessLink, isLink: true },
            ]
        },
        {
            title: "Availability",
            items: [
                { id: 'bookingDays', icon: Calendar, label: "Booking Days", value: "", isArray: true },
                { id: 'workingHours', icon: Clock, label: "Booking Between", value: `${businessInfo.startTime} - ${businessInfo.stopTime}`, isHours: true },
                { id: 'appointment1', icon: CalendarClock, label: "Appointment 1", value: businessInfo.appointment1Name || '', isBookingType: true, apptIndex: 1 },
                { id: 'appointment2', icon: CalendarCheck, label: "Appointment 2", value: businessInfo.appointment2Name || '', isBookingType: true, apptIndex: 2 },
            ]
        },
        {
            title: "AI Configuration",
            items: [
                { id: 'aiBusinessSummary', icon: ClipboardList, label: "AI Business Summary", value: businessInfo.aiBusinessSummary, isLong: true },
            ]
        }
    ];

    const handleUpdate = (id: string, value: any) => {
        setBusinessInfo((prev: any) => ({ ...prev, [id]: value }));
    };

    const handleTimeChange = (type: 'start' | 'stop', part: 'hour' | 'minute', value: string) => {
        const field = type === 'start' ? 'startTime' : 'stopTime';
        const current = businessInfo[field].split(':');
        const h = part === 'hour' ? value : current[0];
        const m = part === 'minute' ? value : current[1];
        handleUpdate(field, `${h}:${m}`);
    };

    const TimePicker = ({ type, label }: { type: 'start' | 'stop', label: string }) => {
        const field = type === 'start' ? 'startTime' : 'stopTime';
        const [h, m] = businessInfo[field].split(':');
        return (
            <div className="space-y-2 flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{label}</label>
                <div className="flex gap-1.5">
                    <select
                        value={h}
                        onChange={(e) => handleTimeChange(type, 'hour', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none text-center cursor-pointer"
                    >
                        {hours.map(hr => <option key={hr} value={hr} className="bg-slate-900">{hr}</option>)}
                    </select>
                    <span className="text-white/30 font-bold py-3">:</span>
                    <select
                        value={m}
                        onChange={(e) => handleTimeChange(type, 'minute', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none text-center cursor-pointer"
                    >
                        {minutes.map(min => <option key={min} value={min} className="bg-slate-900">{min}</option>)}
                    </select>
                </div>
            </div>
        );
    };

    const DayGrid = ({ isEditing }: { isEditing?: boolean }) => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        const renderDay = (day: string) => {
            const isSelected = businessInfo.bookingDays[day];
            const shortDay = day.slice(0, 3);
            return (
                <button
                    key={day}
                    disabled={!isEditing}
                    onClick={() => {
                        handleUpdate('bookingDays', {
                            ...businessInfo.bookingDays,
                            [day]: !isSelected
                        });
                    }}
                    className={`flex-1 min-w-[32px] py-1.5 rounded-md border transition-all duration-300 ${isSelected
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                        : 'border-rose-500/30 bg-rose-500/5 text-rose-500/60 hover:border-rose-500/50'
                        } ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                >
                    <span className="text-[8px] font-black uppercase tracking-tight">
                        {shortDay}
                    </span>
                </button>
            );
        };

        return (
            <div className="space-y-1.5 mt-2">
                <div className="flex gap-1">
                    {days.slice(0, 5).map(renderDay)}
                </div>
                <div className="flex gap-1 w-[38%]">
                    {days.slice(5).map(renderDay)}
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-surface text-white">
            {/* Welcome Splash Screen */}
            <AnimatePresence>
                {showWelcome && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                            className="text-center px-8 max-w-lg"
                        >
                            <motion.div
                                initial={{ rotate: -20, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
                                className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary/30 to-orange-500/30 border border-primary/30 flex items-center justify-center mb-8"
                            >
                                <PartyPopper className="w-12 h-12 text-primary" />
                            </motion.div>

                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-4xl font-black text-white uppercase tracking-tight mb-4"
                            >
                                Welcome to Port67!
                            </motion.h1>

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="text-slate-400 text-lg leading-relaxed mb-10"
                            >
                                Your account is all set up. This is your settings page where you can manage your business details and AI assistant configuration.
                            </motion.p>

                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.9 }}
                                onClick={() => setShowWelcome(false)}
                                className="btn btn-primary px-10 py-4 text-lg font-black uppercase tracking-widest shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_50px_rgba(147,51,234,0.5)] transition-all"
                            >
                                Let&apos;s Go
                            </motion.button>
                        </motion.div>

                        <button
                            onClick={() => setShowWelcome(false)}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="container-custom max-w-lg mx-auto pb-40 px-4">
                <DashboardHeader />

                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">Business Settings</h2>
                    <p className="text-slate-500 font-medium tracking-tight">Configure your AI assistant for your specific trade</p>
                </div>

                <div className="space-y-8">
                    {infoGroups.map((group, groupIndex) => {
                        const isEditing = editingSegments[group.title];
                        return (
                            <motion.div
                                key={group.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: groupIndex * 0.1 }}
                                className="space-y-3 relative"
                            >
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        {group.title}
                                    </h3>
                                    <button
                                        onClick={() => toggleEdit(group.title)}
                                        disabled={saving}
                                        className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all px-4 py-1.5 rounded-full ${isEditing
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-white/5 text-primary hover:bg-white/10'
                                            }`}
                                    >
                                        {isEditing ? (
                                            saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3" /> SAVE</>
                                        ) : (
                                            <><Edit2 className="w-3 h-3" /> EDIT</>
                                        )}
                                    </button>
                                </div>

                                <div className={`card-glass border transition-all duration-300 rounded-[2.5rem] bg-white/2 overflow-hidden ${isEditing ? 'border-primary/30 ring-1 ring-primary/20' : 'border-white/5'
                                    }`}>
                                    {group.isVoiceSelector ? (
                                        <div className="p-6">
                                            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 scrollbar-hide py-1">
                                                {group.voices?.map((voice) => (
                                                    <button
                                                        key={voice.id}
                                                        disabled={!isEditing}
                                                        onClick={() => handleUpdate('assistantVoice', voice.id)}
                                                        className={`p-4 rounded-2xl border transition-all duration-300 text-left ${group.currentVoice === voice.id
                                                            ? 'border-primary/50 bg-primary/20 text-white'
                                                            : isEditing
                                                                ? 'border-white/10 bg-white/5 text-slate-400 hover:border-primary/30'
                                                                : 'border-white/5 bg-white/2 text-slate-500 cursor-default'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold text-sm tracking-wide">{voice.name}</span>
                                                            {group.currentVoice === voice.id && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] uppercase font-black tracking-widest opacity-50">
                                                            {voice.desc}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (group.items as any[])?.map((item, itemIndex) => (
                                        <div
                                            key={item.label}
                                            className={`p-6 flex items-start gap-4 transition-colors ${itemIndex !== group.items!.length - 1 ? 'border-b border-white/5' : ''
                                                } ${isEditing ? 'bg-white/1' : ''}`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-900/50 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                                    {item.label}
                                                </p>
                                                {isEditing ? (
                                                    item.isArray ? (
                                                        <DayGrid isEditing={true} />
                                                    ) : item.isHours ? (
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <TimePicker type="start" label="START" />
                                                            <TimePicker type="stop" label="STOP" />
                                                        </div>
                                                    ) : item.isBookingType ? (
                                                        <div className="space-y-4 mt-2">
                                                            <div>
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">APPOINTMENT NAME</label>
                                                                <input
                                                                    type="text"
                                                                    value={businessInfo[`appointment${item.apptIndex}Name`] || ''}
                                                                    onChange={(e) => handleUpdate(`appointment${item.apptIndex}Name`, e.target.value)}
                                                                    placeholder="e.g., 30 min Job Quote"
                                                                    className="w-full bg-[#0a0e14] border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                                />
                                                                <p className="text-[10px] text-slate-500 mt-2 italic">
                                                                    This is what you will see in your diary when a user books a slot i.e. 30 min Job Quote
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">APPOINTMENT DURATION</label>
                                                                <select
                                                                    value={businessInfo[`appointment${item.apptIndex}Duration`] || 30}
                                                                    onChange={(e) => handleUpdate(`appointment${item.apptIndex}Duration`, Number(e.target.value))}
                                                                    className="w-full bg-[#0a0e14] border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer"
                                                                >
                                                                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                                                                        <option key={mins} value={mins} className="bg-slate-900">
                                                                            {mins < 60 ? `${mins} minutes` : `${mins / 60} hour${mins > 60 ? 's' : ''}`}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    ) : item.isLong ? (
                                                        <textarea
                                                            value={item.value}
                                                            onChange={(e) => handleUpdate(item.id, e.target.value)}
                                                            className="w-full bg-[#0a0e14] border border-white/10 rounded-xl p-3 text-sm font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                            rows={3}
                                                            placeholder="Describe your business for the AI..."
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={item.value}
                                                            onChange={(e) => handleUpdate(item.id, e.target.value)}
                                                            className="w-full bg-[#0a0e14] border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                        />
                                                    )
                                                ) : (
                                                    item.isArray ? (
                                                        <DayGrid isEditing={false} />
                                                    ) : item.isBookingType ? (
                                                        <div className="space-y-1 mt-1">
                                                            <p className="font-bold text-slate-200">
                                                                {businessInfo[`appointment${item.apptIndex}Name`] || 'Not set'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                                                {(() => {
                                                                    const d = businessInfo[`appointment${item.apptIndex}Duration`];
                                                                    return d ? (d < 60 ? `${d} min` : `${d / 60} hr`) : '30 min';
                                                                })()}
                                                            </p>
                                                        </div>
                                                    ) : item.isLink ? (
                                                        <a
                                                            href={item.value}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline font-bold truncate block"
                                                        >
                                                            {item.value || "Not set"}
                                                        </a>
                                                    ) : (
                                                        <p className="font-bold text-slate-200 leading-relaxed">
                                                            {item.value || "Not set"}
                                                        </p>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Sign Out */}
                <div className="mt-10 mb-2">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all font-bold uppercase tracking-widest text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>

            <BottomNav />
        </main>
    );
}
