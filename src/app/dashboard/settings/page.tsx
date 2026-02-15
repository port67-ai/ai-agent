"use client";

import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Building2, Phone, Globe, Calendar, Clock, ClipboardList, Shield, Edit2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock data representing what would be fetched from the database/Airtable
const INITIAL_BUSINESS_INFO = {
    businessName: "Port67 Services",
    businessType: "Plumber",
    phoneNumber: "07700 900123",
    bookingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    workingHours: {
        start: "09:00",
        end: "17:00"
    },
    businessLink: "https://port67.com/booking",
    additionalNotes: "Always ring twice if no answer at the main door.",
    assistantVoice: 'rachel'
};

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
    const [businessInfo, setBusinessInfo] = useState(INITIAL_BUSINESS_INFO);
    const [editingSegments, setEditingSegments] = useState<Record<string, boolean>>({});

    const toggleEdit = (segmentTitle: string) => {
        setEditingSegments(prev => ({ ...prev, [segmentTitle]: !prev[segmentTitle] }));
    };

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
                { id: 'phoneNumber', icon: Phone, label: "Phone Number", value: businessInfo.phoneNumber },
                { id: 'businessLink', icon: Globe, label: "Business Link", value: businessInfo.businessLink, isLink: true },
            ]
        },
        {
            title: "Availability",
            items: [
                { id: 'bookingDays', icon: Calendar, label: "Booking Days", value: businessInfo.bookingDays.join(", "), isArray: true },
                { id: 'workingHours', icon: Clock, label: "Booking Between", value: `${businessInfo.workingHours.start} - ${businessInfo.workingHours.end}`, isHours: true },
            ]
        },
        {
            title: "Additional Information",
            items: [
                { id: 'additionalNotes', icon: ClipboardList, label: "Setup Notes", value: businessInfo.additionalNotes, isLong: true },
            ]
        }
    ];

    const handleUpdate = (id: string, value: any) => {
        setBusinessInfo(prev => ({ ...prev, [id]: value }));
    };

    const handleTimeChange = (type: 'start' | 'end', part: 'hour' | 'minute', value: string) => {
        const current = businessInfo.workingHours[type].split(':');
        const h = part === 'hour' ? value : current[0];
        const m = part === 'minute' ? value : current[1];
        setBusinessInfo(prev => ({
            ...prev,
            workingHours: {
                ...prev.workingHours,
                [type]: `${h}:${m}`
            }
        }));
    };

    const TimePicker = ({ type, label }: { type: 'start' | 'end', label: string }) => {
        const [h, m] = businessInfo.workingHours[type].split(':');
        return (
            <div className="space-y-2 flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{label}</label>
                <div className="flex gap-1.5">
                    <select
                        value={h}
                        onChange={(e) => handleTimeChange(type, 'hour', e.target.value)}
                        className="flex-1 bg-white/2 border border-white/5 rounded-xl px-2 py-3 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none text-center cursor-pointer"
                    >
                        {hours.map(hr => <option key={hr} value={hr} className="bg-slate-900">{hr}</option>)}
                    </select>
                    <span className="text-white/30 font-bold py-3">:</span>
                    <select
                        value={m}
                        onChange={(e) => handleTimeChange(type, 'minute', e.target.value)}
                        className="flex-1 bg-white/2 border border-white/5 rounded-xl px-2 py-3 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none text-center cursor-pointer"
                    >
                        {minutes.map(min => <option key={min} value={min} className="bg-slate-900">{min}</option>)}
                    </select>
                </div>
            </div>
        );
    };

    const DayGrid = ({ isEditing }: { isEditing?: boolean }) => {
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const weekend = ['Saturday', 'Sunday'];

        const renderDay = (day: string) => {
            const isSelected = businessInfo.bookingDays.includes(day);
            const shortDay = day.slice(0, 3);
            return (
                <button
                    key={day}
                    disabled={!isEditing}
                    onClick={() => {
                        const newDays = isSelected
                            ? businessInfo.bookingDays.filter(d => d !== day)
                            : [...businessInfo.bookingDays, day];
                        setBusinessInfo(prev => ({ ...prev, bookingDays: newDays }));
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
                    {weekdays.map(renderDay)}
                </div>
                <div className="flex gap-1 w-[38%]">
                    {weekend.map(renderDay)}
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-[#0a0e14] text-white">
            <div className="container-custom max-w-lg mx-auto pb-40 px-4">
                <DashboardHeader />

                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">Business Settings</h2>
                    <p className="text-slate-500 font-medium">Manage your AI assistant's configuration</p>
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
                                        className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all px-3 py-1 rounded-full ${isEditing
                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                            : 'text-primary hover:text-primary-light hover:bg-white/5'
                                            }`}
                                    >
                                        {isEditing ? (
                                            <>
                                                <CheckCircle className="w-3 h-3" />
                                                SAVE
                                            </>
                                        ) : (
                                            <>
                                                <Edit2 className="w-3 h-3" />
                                                EDIT
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className={`card-glass border transition-all duration-300 rounded-[2rem] bg-white/2 overflow-hidden ${isEditing ? 'ring-1 ring-primary/30 border-primary/20 bg-white/4' : 'border-white/5'
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
                                                                ? 'border-white/10 bg-white/5 text-slate-400 hover:border-primary/30 hover:bg-primary/5'
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
                                            <AnimatePresence>
                                                {isEditing && (
                                                    <motion.p
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mt-4 text-[10px] text-primary font-bold uppercase tracking-widest italic text-center"
                                                    >
                                                        Tap a voice to select it
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
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
                                                            <TimePicker type="start" label="START TIME" />
                                                            <TimePicker type="end" label="END TIME" />
                                                        </div>
                                                    ) : item.isLong ? (
                                                        <textarea
                                                            value={item.value}
                                                            onChange={(e) => handleUpdate(item.id, e.target.value)}
                                                            className="w-full bg-[#0a0e14] border border-white/10 rounded-xl p-3 text-sm font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                            rows={3}
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
                                                    ) : item.isLink ? (
                                                        <a
                                                            href={item.value}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline font-bold truncate block"
                                                        >
                                                            {item.value}
                                                        </a>
                                                    ) : (
                                                        <p className="font-bold text-slate-200 leading-relaxed">
                                                            {item.value}
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
            </div>

            <BottomNav />
        </main>
    );
}
