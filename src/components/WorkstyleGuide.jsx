import React from 'react';
import { Check, Calendar, MapPin, Layers, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const WorkstyleGuide = () => {
    const styles = [
        {
            title: "Fixed Time Slots",
            icon: <Calendar className="w-6 h-6" />,
            description: "You work from a studio or rooms with set appointments.",
            features: [
                "Automated Calendar Sync",
                "Client Intake Forms",
                "Confirmation Reminders",
                "Hands-free scheduling"
            ],
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            title: "Call-Out / Mobile",
            icon: <MapPin className="w-6 h-6" />,
            description: "You travel to clients or handle walk-ins in the field.",
            features: [
                "Photo & Location capture",
                "Job qualification via AI",
                "One-tap Whatsapp approval",
                "Daily job summaries"
            ],
            color: "text-secondary-600",
            bg: "bg-secondary-50"
        },
        {
            title: "Both / Mixed",
            icon: <Layers className="w-6 h-6" />,
            description: "The best of both. You have a shop but also do deliveries.",
            features: [
                "Smart Intent Detection",
                "Adaptive AI Personas",
                "Switch between flows automatically",
                "Full business versatility"
            ],
            color: "text-primary-600",
            bg: "bg-primary-50",
            isHybrid: true
        }
    ];

    return (
        <section className="py-24 bg-white" id="workstyles">
            <div className="container mx-auto px-4 md:px-6">

                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold text-secondary-900 mb-6">
                        Find your rhythm.
                    </h2>
                    <p className="text-lg text-secondary-600 leading-relaxed">
                        HeyKaelo isn't one-size-fits-all. We adapt to the way your business actually runs, handled natively in WhatsApp.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto">
                    {styles.map((style, index) => (
                        <div
                            key={index}
                            className={`flex flex-col p-8 rounded-[2rem] border-2 transition-all duration-500 hover:shadow-2xl ${style.isHybrid ? 'border-primary-500 bg-primary-50/30 scale-105' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${style.bg} ${style.color} mb-8 shadow-sm`}>
                                {style.icon}
                            </div>

                            <h3 className="text-2xl font-bold text-secondary-900 mb-4">{style.title}</h3>
                            <p className="text-secondary-600 mb-8 leading-relaxed">
                                {style.description}
                            </p>

                            <ul className="space-y-4 mb-10 flex-1">
                                {style.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm font-medium text-secondary-700">
                                        <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to="/setup"
                                className={`flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold transition-all ${style.isHybrid ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-secondary-900 text-white hover:bg-secondary-800'}`}
                            >
                                Get Started
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default WorkstyleGuide;
