'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

interface FAQItem {
    question: string;
    heading: string;
    answer: string;
    bullets?: string[];
}

const customerFAQs: FAQItem[] = [
    {
        question: 'How do customers book my time?',
        heading: 'We make it simple',
        answer: 'When a customer calls, or messages we send them a booking link back where they can click and see a list of booking options available. When they select the option they want they are then provided a calendar where they can select a date and time that works for them and is free in your diary.',
    },
    {
        question: 'Do you send confirmation details?',
        heading: 'Yes we confirm everything.....',
        answer: 'We ask first how they would like to be communicated with going forward (WhatsApp, Facebook messenger or Text), We send confirmation of the booking immediately after the diary entry is made to their preferred way with all the details they entered & an option to rearrange or cancel.',
    },
    {
        question: 'How do customers change their booking?',
        heading: 'Change is easy....',
        answer: 'We know things happen with customers and they want to change the date and we take the stress away from that situation. They simply phone up and say something like "I have an appointment and want to change it" or type in WhatsApp, FB or Text something like "change my appointment". We send them confirmation of their existing booking & a link to select a new date & time thats free.',
    },
    {
        question: 'Can a customer cancel a booking?',
        heading: 'They can ...',
        answer: 'Customers can cancel a booking by calling in or sending a message like "I want to cancel my booked appointment". Before we cancel we confirm the date and ask if they just want to rebook for a future date \u2013 we don\'t really want them to cancel do we?? Then if they do want to cancel we send them a link to cancel but make sure they know they can always contact us anytime...',
    },
    {
        question: 'Can customers call & message?',
        heading: 'Yes we are multi chat ...',
        answer: 'We aim to be as flexible as possible so if a customer calls to book an appointment we can then continue future communications on Facebook messenger or WhatsApp where they can change or book more appointments.',
    },
    {
        question: 'Do customers get an appointment reminder?',
        heading: 'So they don\'t forget....',
        answer: 'This is top of our list for next features. We know sometimes customers forget they booked and may be out so we are working hard to get a new feature that will remind your customers 24 hours before the booking time.',
    },
    {
        question: 'Can customers see what time I arrive?',
        heading: 'Like tracking a delivery...',
        answer: 'Not yet but watch this space, we have a lot of cool ideas we want to release such as notifying a customer how many jobs you have before you get to them and what the approximate time to your arrival would be.',
    },
];

const businessFAQs: FAQItem[] = [
    {
        question: 'How do you make it reflect my business?',
        heading: 'Reflecting your business is our unique difference',
        answer: 'We know customers don\'t like general bland information, they want specifics. We take your unique business and write a dedicated persona for your business, this includes everything you do and don\'t do so when a customer asks a question we can give them detailed information and look to book a job',
    },
    {
        question: 'How do customers book time in my Diary?',
        heading: 'Its on your terms',
        answer: 'We send them a unique booking link to their mobile either through text, WhatsApp or Facebook messenger. This allows them to select "blocks" of time in your diary. They can ONLY book free time in your diary & only on the days and hours you want. We get them to fill out some basic information for every booking so you know before you arrive what they want.',
    },
    {
        question: 'Can I choose the days for customer bookings?',
        heading: 'In short YES',
        answer: 'You can select which days of the week and which times during that day you allow customers to openly book jobs. If you typically leave Thursday & Friday morning say 8am to 12pm for customer quote visits then you can only open those days and customers only have those options to view free time slots',
    },
    {
        question: 'What is a time block?',
        heading: 'Pre set times for certain job types....',
        answer: 'We crate simple time blocks for customers to choose what they want to book time for based on general feedback, these are:-',
        bullets: ['15 mins Free Consultation', '1 hour', '2 hour', 'Full Day'],
    },
    {
        question: 'How flexible can the bookings be?',
        heading: 'Yes we aim to be flexible',
        answer: 'We try to be flexible but keep it simple for your customers. If you want to use us to book 15 min Free Consultations only then great we can do that. If you want to create a 15 mins session to be "regular grass treatment" then we can do that. Perhaps you have a regular 1 hour time slot for "general garden maintenance" we can do that also.',
    },
    {
        question: 'Do you have travel time?',
        heading: 'Yes we include travel time',
        answer: 'We include travel time for any bookings that are made through the customer self booking link. Typically this is at the start of the appointment where we reserve ~10mins free and mark this as travel time in your mobile calendar, we even colour it purple & add a google maps link to the address of the next appointment',
    },
    {
        question: 'I use my mobile phone for my work calendar',
        heading: 'Great we work with all mobile phones',
        answer: 'We don\'t ask you to download an app and integrate with your mobile phones calendar. We put work calendar appointments in your phone diary. Oh & we are secure we or your customer don\'t see any appointments just times that are free and busy.',
    },
    {
        question: 'Why do I have a new number?',
        heading: 'Keep your work and social separate',
        answer: 'We provide you a dedicated Work mobile number to advertise for inbound calls, texts and WhatsApp\'s so we can intercept messages on your behalf. This lets you to keep your existing number for personal use, removing the clutter of business calls, & WhatsApps so you don\'t loose things in the noise of business.',
    },
    {
        question: 'What about my old number?',
        heading: 'Its as easy as a quick divert',
        answer: 'We send you a divert on busy or no answer code to your new number. You just click & call a code we send you, anyone calling will be diverted and answered by your assistant, no fuss & no apps to mess around with. To turn this off you just hit Call #21#.',
    },
];

function FAQAccordionItem({
    item,
    isOpen,
    onToggle,
}: {
    item: FAQItem;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="border-b border-white/10">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between py-5 text-left group"
            >
                <span className={`text-sm font-semibold pr-4 transition-colors ${isOpen ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`}>
                    {item.question}
                </span>
                <span className="flex-shrink-0 w-7 h-7 rounded-full border border-white/20 flex items-center justify-center transition-colors group-hover:border-white/40">
                    {isOpen ? (
                        <Minus className="w-3.5 h-3.5 text-primary" />
                    ) : (
                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="pb-6 space-y-3">
                            <h4 className="text-lg font-black text-white">
                                {item.heading}
                            </h4>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {item.answer}
                            </p>
                            {item.bullets && (
                                <ul className="space-y-1.5 pl-1">
                                    {item.bullets.map((b) => (
                                        <li key={b} className="text-sm text-slate-400 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function FAQ() {
    const [openId, setOpenId] = useState<string | null>(null);

    const handleToggle = (id: string) => {
        setOpenId(openId === id ? null : id);
    };

    return (
        <section id="faq" className="relative overflow-hidden bg-[#05050a] pt-12 pb-24">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] bg-orange-600/8 rounded-full blur-[120px] -z-10" />

            <div className="container-custom relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-black tracking-tight text-white"
                    >
                        Frequently Asked{' '}
                        <span className="gradient-text">Questions</span>
                    </motion.h2>
                </div>

                {/* Two-column FAQ grid */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16"
                >
                    {/* Left Column — About your customers */}
                    <div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
                            About your customers
                        </h3>
                        <div className="h-0.5 w-full bg-gradient-to-r from-primary to-transparent mb-6" />
                        <div>
                            {customerFAQs.map((item, i) => (
                                <FAQAccordionItem
                                    key={i}
                                    item={item}
                                    isOpen={openId === `customer-${i}`}
                                    onToggle={() => handleToggle(`customer-${i}`)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Column — About your business */}
                    <div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
                            About your business
                        </h3>
                        <div className="h-0.5 w-full bg-gradient-to-r from-secondary to-transparent mb-6" />
                        <div>
                            {businessFAQs.map((item, i) => (
                                <FAQAccordionItem
                                    key={i}
                                    item={item}
                                    isOpen={openId === `business-${i}`}
                                    onToggle={() => handleToggle(`business-${i}`)}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
