import React from 'react';
import { PhoneMissed, CalendarX, MessageSquareDashed } from 'lucide-react';

const ProblemSection = () => {
    const problems = [
        {
            icon: PhoneMissed,
            color: "text-red-500",
            bg: "bg-red-50",
            title: "Missed calls, missed business",
            description: "You’re busy working, so you can’t always answer the phone when customers want to book."
        },
        {
            icon: CalendarX,
            color: "text-primary-600",
            bg: "bg-primary-50",
            title: "No-shows and forgotten bookings",
            description: "Customers forget their appointment if you don’t remind them."
        },
        {
            icon: MessageSquareDashed,
            color: "text-secondary-600",
            bg: "bg-secondary-50",
            title: "Scattered client info",
            description: "Details sit in chats, notes and memory – not in one simple place."
        }
    ];

    return (
        <section className="py-20 lg:py-28 bg-neutral-beige">
            <div className="container mx-auto px-4 md:px-6">

                {/* Header */}
                <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl text-balance">
                        The problem HeyKaelo solves
                    </h2>
                    <p className="text-lg text-secondary-700 leading-relaxed">
                        Most small businesses run on WhatsApp, voice notes and missed calls. Bookings get lost, customers forget appointments, and owners don’t have time for admin.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-8 md:grid-cols-3">
                    {problems.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white p-8 rounded-3xl shadow-soft hover:shadow-lg transition-all duration-300 flex flex-col items-start border border-secondary-50/50"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.bg} ${item.color} mb-6`}>
                                <item.icon className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-3">
                                {item.title}
                            </h3>
                            <p className="text-secondary-600 leading-relaxed">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default ProblemSection;
