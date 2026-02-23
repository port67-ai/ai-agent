'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { BusinessDetailsFormData } from '@/types/checkout';
import { Check, Loader2, Phone, Clock, Play, Pause, Building2, Shield, Calendar, CalendarClock, CalendarCheck } from 'lucide-react';
import { firebaseDb } from '@/lib/services/firebase-db';

const businessTypes = ['Plumber', 'Electrician', 'Gardener', 'Carpenter', 'Other'] as const;
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = ['00', '15', '30', '45'];

export function BusinessDetailsForm() {
    const router = useRouter();
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const [formData, setFormData] = useState<BusinessDetailsFormData>({
        businessName: '',
        businessType: '',
        phoneNumber: '',
        workingDays: [],
        workingHours: {
            start: '09:00',
            end: '17:00',
        },
        businessLink: '',
        assistantVoice: '',
        additionalNotes: '',
        appointment1Name: '',
        appointment1Duration: 30,
        appointment2Name: '',
        appointment2Duration: 30,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('You must be signed in to save business details.');
            return;
        }

        setLoading(true);

        try {
            // Transform the form data to match Firestore schema
            const firestoreBusinessDetails = {
                businessName: formData.businessName,
                businessType: formData.businessType,
                currentPhoneNumber: formData.phoneNumber,
                assistantPhoneNumber: '', // Will be assigned later
                bookingDays: formData.workingDays.reduce((acc: any, day: string) => {
                    acc[day] = true;
                    return acc;
                }, {
                    Monday: false,
                    Tuesday: false,
                    Wednesday: false,
                    Thursday: false,
                    Friday: false,
                    Saturday: false,
                    Sunday: false,
                }),
                startTime: formData.workingHours.start,
                stopTime: formData.workingHours.end,
                assistantVoice: formData.assistantVoice,
                businessLink: formData.businessLink,
                aiBusinessSummary: formData.additionalNotes || '',
                appointment1Name: formData.appointment1Name || '',
                appointment1Duration: formData.appointment1Duration || 30,
                appointment2Name: formData.appointment2Name || '',
                appointment2Duration: formData.appointment2Duration || 30,
            };

            await firebaseDb.updateBusinessDetails(user.uid, firestoreBusinessDetails);

            // Redirect to AI review step (webhook fires from there)
            router.push('/pricing?step=ai-review');
        } catch (error) {
            console.error('Error saving business details:', error);
            alert('Failed to save business details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (day: string) => {
        setFormData((prev) => ({
            ...prev,
            workingDays: prev.workingDays.includes(day)
                ? prev.workingDays.filter((d) => d !== day)
                : [...prev.workingDays, day],
        }));
    };

    const handleTimeChange = (type: 'start' | 'end', part: 'hour' | 'minute', value: string) => {
        setFormData(prev => {
            const current = prev.workingHours[type].split(':');
            const h = part === 'hour' ? value : current[0];
            const m = part === 'minute' ? value : current[1];
            return {
                ...prev,
                workingHours: {
                    ...prev.workingHours,
                    [type]: `${h}:${m}`
                }
            };
        });
    };

    const TimePicker = ({ type, label }: { type: 'start' | 'end', label: string }) => {
        const [h, m] = formData.workingHours[type].split(':');
        return (
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
                <div className="flex gap-2">
                    <select
                        value={h}
                        onChange={(e) => handleTimeChange(type, 'hour', e.target.value)}
                        className="flex-1 bg-white/2 border border-white/5 rounded-xl px-3 py-3 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none text-center cursor-pointer"
                    >
                        {hours.map(hr => <option key={hr} value={hr} className="bg-slate-900">{hr}</option>)}
                    </select>
                    <span className="text-white font-bold py-3">:</span>
                    <select
                        value={m}
                        onChange={(e) => handleTimeChange(type, 'minute', e.target.value)}
                        className="flex-1 bg-white/2 border border-white/5 rounded-xl px-3 py-3 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none text-center cursor-pointer"
                    >
                        {minutes.map(min => <option key={min} value={min} className="bg-slate-900">{min}</option>)}
                    </select>
                </div>
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-12">
            {/* Section 1: Identity & Contact */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Identity & Contact</h3>
                        <p className="text-xs text-slate-500 font-medium">Basic information about your business</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="businessName" className="label text-[11px] font-black tracking-widest mb-2 flex items-center gap-2">
                            BUSINESS NAME <span className="text-primary">*</span>
                        </label>
                        <input
                            id="businessName"
                            type="text"
                            required
                            className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                            value={formData.businessName}
                            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                            placeholder="e.g., Smith Plumbing Services"
                        />
                    </div>

                    <div>
                        <label htmlFor="businessType" className="label text-[11px] font-black tracking-widest mb-2 flex items-center gap-2">
                            BUSINESS TYPE <span className="text-primary">*</span>
                        </label>
                        <select
                            id="businessType"
                            required
                            className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                            value={formData.businessType}
                            onChange={(e) => setFormData({ ...formData, businessType: e.target.value as any })}
                        >
                            <option value="" disabled className="bg-slate-900">Select Business Type</option>
                            {businessTypes.map((type) => (
                                <option key={type} value={type} className="bg-slate-900">
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="phoneNumber" className="label text-[11px] font-black tracking-widest mb-2 flex items-center gap-2">
                            CURRENT PHONE NUMBER <span className="text-primary">*</span>
                        </label>
                        <p className="text-[10px] text-slate-500 mb-3 uppercase font-bold italic tracking-wider">
                            We'll provide you with a new number for the assistant
                        </p>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                id="phoneNumber"
                                type="tel"
                                required
                                className="input pl-12 bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                placeholder="+44 7XXX XXXXXX"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Availability */}
            <div className="space-y-8 pt-8 border-t border-white/5">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Identify when the Assistant can book time</h3>
                        <p className="text-xs text-slate-500 font-medium font-bold italic">When is your diary open for bookings?</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <label className="label text-[11px] font-black tracking-widest mb-3">BOOKING DAYS *</label>
                        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                            {daysOfWeek.map((day) => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`flex-1 min-w-[32px] py-1.5 rounded-md border transition-all duration-300 ${formData.workingDays.includes(day)
                                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                        : 'border-rose-500/30 bg-rose-500/5 text-rose-500/60 hover:border-rose-500/50'
                                        }`}
                                >
                                    <span className="text-[8px] font-black uppercase tracking-tight">
                                        {day.slice(0, 3)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <TimePicker type="start" label="Start Time *" />
                        <TimePicker type="end" label="End Time *" />
                    </div>

                    {/* Appointment 1 */}
                    <div className="pt-6 border-t border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-7 h-7 rounded-xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                                <CalendarClock className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-[15px] font-bold text-white uppercase tracking-tight">Appointment 1</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-5 uppercase font-bold italic tracking-wider">
                            Define how this appointment type appears in your diary
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="appointment1Name" className="label text-[11px] font-black tracking-widest mb-2">
                                    APPOINTMENT NAME
                                </label>
                                <input
                                    id="appointment1Name"
                                    type="text"
                                    className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                                    value={formData.appointment1Name || ''}
                                    onChange={(e) => setFormData({ ...formData, appointment1Name: e.target.value })}
                                    placeholder="e.g., 30 min Job Quote"
                                />
                                <p className="text-[10px] text-slate-500 mt-2 italic">
                                    This is what you will see in your diary when a user books a slot i.e. 30 min Job Quote
                                </p>
                            </div>
                            <div>
                                <label htmlFor="appointment1Duration" className="label text-[11px] font-black tracking-widest mb-2">
                                    APPOINTMENT DURATION
                                </label>
                                <select
                                    id="appointment1Duration"
                                    className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                                    value={formData.appointment1Duration || 30}
                                    onChange={(e) => setFormData({ ...formData, appointment1Duration: parseInt(e.target.value) })}
                                >
                                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                                        <option key={mins} value={mins} className="bg-slate-900">
                                            {mins < 60 ? `${mins} minutes` : `${mins / 60} hour${mins > 60 ? 's' : ''}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Appointment 2 */}
                    <div className="pt-6 border-t border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-7 h-7 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary flex-shrink-0">
                                <CalendarCheck className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-[15px] font-bold text-white uppercase tracking-tight">Appointment 2</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-5 uppercase font-bold italic tracking-wider">
                            Define how this appointment type appears in your diary
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="appointment2Name" className="label text-[11px] font-black tracking-widest mb-2">
                                    APPOINTMENT NAME
                                </label>
                                <input
                                    id="appointment2Name"
                                    type="text"
                                    className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                                    value={formData.appointment2Name || ''}
                                    onChange={(e) => setFormData({ ...formData, appointment2Name: e.target.value })}
                                    placeholder="e.g., 60 min Full Assessment"
                                />
                                <p className="text-[10px] text-slate-500 mt-2 italic">
                                    This is what you will see in your diary when a user books a slot i.e. 60 min Full Assessment
                                </p>
                            </div>
                            <div>
                                <label htmlFor="appointment2Duration" className="label text-[11px] font-black tracking-widest mb-2">
                                    APPOINTMENT DURATION
                                </label>
                                <select
                                    id="appointment2Duration"
                                    className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                                    value={formData.appointment2Duration || 30}
                                    onChange={(e) => setFormData({ ...formData, appointment2Duration: parseInt(e.target.value) })}
                                >
                                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                                        <option key={mins} value={mins} className="bg-slate-900">
                                            {mins < 60 ? `${mins} minutes` : `${mins / 60} hour${mins > 60 ? 's' : ''}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Assistant Behavior */}
            <div className="space-y-8 pt-8 border-t border-white/5">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">How your assistant answers</h3>
                        <p className="text-xs text-slate-500 font-medium">Fine-tune the personality and knowledge base</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <label className="label text-[11px] font-black tracking-widest mb-3">ASSISTANT VOICE *</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-2 scrollbar-hide py-1">
                            {[
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
                            ].map((voice) => (
                                <div
                                    key={voice.id}
                                    className={`p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group cursor-pointer ${formData.assistantVoice === voice.id
                                        ? 'border-primary bg-primary/10 text-white'
                                        : 'border-white/5 bg-white/2 text-slate-400 hover:border-white/10'
                                        }`}
                                    onClick={() => setFormData({ ...formData, assistantVoice: voice.id })}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${formData.assistantVoice === voice.id ? 'bg-primary text-white' : 'bg-white/5 text-slate-500 group-hover:bg-white/10'}`}>
                                            {formData.assistantVoice === voice.id ? <Check className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm tracking-wide">{voice.name}</p>
                                            <p className="text-[10px] uppercase font-black tracking-widest opacity-50">{voice.desc}</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPlayingVoice(playingVoice === voice.id ? null : voice.id);
                                            // Optional: Add actual audio logic here
                                        }}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${playingVoice === voice.id
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {playingVoice === voice.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="businessLink" className="label text-[11px] font-black tracking-widest mb-2 flex items-center gap-2">
                            BUSINESS LINK <span className="text-primary">*</span>
                        </label>
                        <p className="text-[10px] text-slate-500 mb-3 uppercase font-bold italic tracking-wider">
                            Link to your website, business site or Facebook Business site
                        </p>
                        <p className="text-[10px] text-primary/80 mb-3 uppercase font-black tracking-widest">
                            We turn this into information that's detailed about your business.
                        </p>
                        <input
                            id="businessLink"
                            type="url"
                            required
                            className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                            value={formData.businessLink}
                            onChange={(e) => setFormData({ ...formData, businessLink: e.target.value })}
                            placeholder="e.g., https://yourbusiness.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="additionalNotes" className="label text-[11px] font-black tracking-widest mb-2 flex items-center gap-2">
                            ADDITIONAL NOTES
                        </label>
                        <p className="text-[10px] text-slate-500 mb-3 uppercase font-bold italic tracking-wider">
                            Optional: Any special requirements or services
                        </p>
                        <textarea
                            id="additionalNotes"
                            rows={4}
                            className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                            value={formData.additionalNotes}
                            onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                            placeholder="e.g., Specific services keywords, pricing info..."
                        />
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            <div className="pt-8 block">
                <button
                    type="submit"
                    disabled={loading || formData.workingDays.length === 0 || !formData.assistantVoice}
                    className="btn btn-primary w-full py-6 text-lg justify-center font-black uppercase tracking-widest shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_50px_rgba(147,51,234,0.5)] transition-all group"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <span className="flex items-center gap-2">
                            Review & Checkout
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    )}
                </button>
            </div>
        </form>
    );
}

const ArrowRight = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
);
