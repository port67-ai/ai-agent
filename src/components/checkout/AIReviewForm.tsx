'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { firebaseDb } from '@/lib/services/firebase-db';
import { AiReviewData } from '@/types/checkout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChefHat, AlertTriangle, ArrowRight, Loader2,
    Building2, Wrench, Clock, MessageSquare, Award
} from 'lucide-react';

const WEBHOOK_URL = 'https://hook.eu2.make.com/92f5n1wn6fwsdmenkd3o8g1rqw7za9ic';

const emptyReviewData: AiReviewData = {
    business_name: '',
    business_type: '',
    business_address: '',
    areas_covered: '',
    service_1: '',
    service_2: '',
    service_3: '',
    service_4: '',
    service_5: '',
    service_6: '',
    open_monday: '',
    open_tuesday: '',
    open_wednesday: '',
    open_thursday: '',
    open_friday: '',
    open_saturday: '',
    open_sunday: '',
    out_of_hours: '',
    booking_whatsapp: '',
    booking_sms: '',
    booking_either: '',
    accreditation: '',
    experience: '',
};

export function AIReviewForm() {
    const router = useRouter();
    const { user, profile } = useUser();
    const [phase, setPhase] = useState<'loading' | 'review' | 'error'>('loading');
    const [formData, setFormData] = useState<AiReviewData>(emptyReviewData);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const hasFired = useRef(false);

    const fireWebhook = async () => {
        setPhase('loading');
        setErrorMsg('');

        const businessDetails = profile?.businessDetails;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        try {
            const res = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessType: businessDetails?.businessType || '',
                    businessLink: businessDetails?.businessLink || '',
                    additionalNotes: businessDetails?.aiBusinessSummary || '',
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!res.ok) {
                throw new Error(`Webhook returned ${res.status}`);
            }

            const data = await res.json();

            // Merge response into form — use empty string fallbacks
            const merged: AiReviewData = { ...emptyReviewData };
            for (const key of Object.keys(emptyReviewData) as (keyof AiReviewData)[]) {
                merged[key] = typeof data[key] === 'string' ? data[key] : '';
            }

            setFormData(merged);
            setPhase('review');
        } catch (err: any) {
            clearTimeout(timeout);
            setErrorMsg(
                err.name === 'AbortError'
                    ? 'The request timed out. Please try again.'
                    : err.message || 'Something went wrong.'
            );
            setPhase('error');
        }
    };

    useEffect(() => {
        if (!hasFired.current && profile) {
            hasFired.current = true;
            fireWebhook();
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await firebaseDb.updateAiReviewData(user.uid, formData);
            router.push('/pricing?step=checkout');
        } catch (err) {
            console.error('Error saving AI review data:', err);
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (key: keyof AiReviewData, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const InputField = ({ label, fieldKey }: { label: string; fieldKey: keyof AiReviewData }) => (
        <div>
            <label className="text-[11px] font-black tracking-widest text-slate-500 mb-2 block uppercase">
                {label}
            </label>
            <input
                type="text"
                className="input bg-white/2 border-white/5 focus:bg-white/5 focus:border-primary/30"
                value={formData[fieldKey]}
                onChange={(e) => updateField(fieldKey, e.target.value)}
            />
        </div>
    );

    // ─── Loading Phase ───
    if (phase === 'loading') {
        return (
            <div className="text-center py-16 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center"
                    >
                        <ChefHat className="w-10 h-10 text-primary" />
                    </motion.div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                            We&apos;re cooking something up
                        </h2>
                        <p className="text-slate-400 text-lg max-w-md mx-auto">
                            so your AI receptionist knows all about you
                        </p>
                    </div>

                    <div className="flex justify-center gap-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-2.5 h-2.5 rounded-full bg-primary"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    // ─── Error Phase ───
    if (phase === 'error') {
        return (
            <div className="text-center py-16 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-red-400" />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                            Something went wrong
                        </h2>
                        <p className="text-slate-400 text-lg max-w-md mx-auto">
                            {errorMsg}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <button
                            onClick={() => {
                                hasFired.current = false;
                                fireWebhook();
                            }}
                            className="btn btn-primary px-8 py-4 text-lg justify-center font-black uppercase tracking-widest"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => router.push('/pricing?step=checkout')}
                            className="btn btn-outline px-8 py-4 text-lg justify-center font-semibold"
                        >
                            Skip This Step
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ─── Review Phase (editable form) ───
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
        >
            <div className="text-center space-y-3">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                    Review Your Business Info
                </h2>
                <p className="text-slate-400 text-lg max-w-lg mx-auto">
                    We&apos;ve gathered this from your website. Edit anything that doesn&apos;t look right.
                </p>
            </div>

            {/* Section 1: Business Info */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Business Info</h3>
                        <p className="text-xs text-slate-500 font-medium">Core details about your business</p>
                    </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                    <InputField label="Business Name" fieldKey="business_name" />
                    <InputField label="Business Type" fieldKey="business_type" />
                    <InputField label="Business Address" fieldKey="business_address" />
                    <InputField label="Areas Covered" fieldKey="areas_covered" />
                </div>
            </div>

            {/* Section 2: Services */}
            <div className="space-y-6 pt-8 border-t border-white/5">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary">
                        <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Services</h3>
                        <p className="text-xs text-slate-500 font-medium">What your business offers</p>
                    </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                    <InputField label="Service 1" fieldKey="service_1" />
                    <InputField label="Service 2" fieldKey="service_2" />
                    <InputField label="Service 3" fieldKey="service_3" />
                    <InputField label="Service 4" fieldKey="service_4" />
                    <InputField label="Service 5" fieldKey="service_5" />
                    <InputField label="Service 6" fieldKey="service_6" />
                </div>
            </div>

            {/* Section 3: Opening Hours */}
            <div className="space-y-6 pt-8 border-t border-white/5">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Opening Hours</h3>
                        <p className="text-xs text-slate-500 font-medium">When you&apos;re available</p>
                    </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                    <InputField label="Monday" fieldKey="open_monday" />
                    <InputField label="Tuesday" fieldKey="open_tuesday" />
                    <InputField label="Wednesday" fieldKey="open_wednesday" />
                    <InputField label="Thursday" fieldKey="open_thursday" />
                    <InputField label="Friday" fieldKey="open_friday" />
                    <InputField label="Saturday" fieldKey="open_saturday" />
                    <InputField label="Sunday" fieldKey="open_sunday" />
                    <InputField label="Out of Hours" fieldKey="out_of_hours" />
                </div>
            </div>

            {/* Section 4: Booking Preferences */}
            <div className="space-y-6 pt-8 border-t border-white/5">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Booking Preferences</h3>
                        <p className="text-xs text-slate-500 font-medium">How customers can book</p>
                    </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-6">
                    <InputField label="WhatsApp" fieldKey="booking_whatsapp" />
                    <InputField label="SMS" fieldKey="booking_sms" />
                    <InputField label="Either" fieldKey="booking_either" />
                </div>
            </div>

            {/* Section 5: Credentials */}
            <div className="space-y-6 pt-8 border-t border-white/5">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                        <Award className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Credentials</h3>
                        <p className="text-xs text-slate-500 font-medium">Your qualifications and experience</p>
                    </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                    <InputField label="Accreditation" fieldKey="accreditation" />
                    <InputField label="Experience" fieldKey="experience" />
                </div>
            </div>

            {/* Confirm & Save */}
            <div className="pt-8">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary w-full py-6 text-lg justify-center font-black uppercase tracking-widest shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_50px_rgba(147,51,234,0.5)] transition-all group"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <span className="flex items-center gap-2">
                            Confirm & Save
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    )}
                </button>
            </div>
        </motion.div>
    );
}
