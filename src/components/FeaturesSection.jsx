import React from 'react';
import { Link, MessageCircleMore, FolderOpen } from 'lucide-react';

const FeaturesSection = () => {
    const features = [
        {
            icon: Link,
            title: "Shareable booking link",
            description: "Your own link you can put in your WhatsApp status, send to clients, or add to your website and social pages."
        },
        {
            icon: MessageCircleMore,
            title: "Automatic WhatsApp reminders",
            description: "We send confirmation messages, day-before reminders and 30-minute reminders so customers actually show up."
        },
        {
            icon: FolderOpen,
            title: "Simple client file",
            description: "See basic details, past appointments and notes for each client in one clean view. No complicated CRM."
        }
    ];

    return (
        <section className="py-20 lg:py-32 bg-neutral-beige">
            <div className="container mx-auto px-4 md:px-6">

                {/* Header */}
                <div className="text-center mb-16 lg:mb-20">
                    <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl text-balance">
                        Everything you need, without the clutter
                    </h2>
                </div>

                {/* Features Grid - Floating Tiles Design */}
                <div className="grid gap-8 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white p-10 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col items-start h-full border border-white/50"
                        >
                            {/* Icon Container */}
                            <div className="w-16 h-16 rounded-2xl bg-secondary-50 text-primary-600 flex items-center justify-center mb-8 shadow-sm">
                                <feature.icon className="w-8 h-8" strokeWidth={1.5} />
                            </div>

                            {/* Content */}
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold text-secondary-900 leading-tight">
                                    {feature.title}
                                </h3>
                                <p className="text-secondary-600 leading-relaxed text-lg">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default FeaturesSection;
