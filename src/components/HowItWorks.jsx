import React from 'react';

const HowItWorks = () => {
    const steps = [
        {
            number: 1,
            title: "Create your booking link",
            description: "Set your business name and available hours. HeyKaelo creates a unique booking link you can share on WhatsApp."
        },
        {
            number: 2,
            title: "Customers book in their own time",
            description: "They click the link, pick a time, and enter their details – without calling you."
        },
        {
            number: 3,
            title: "We handle the reminders",
            description: "HeyKaelo sends automatic WhatsApp reminders and stores each customer in a simple client file."
        }
    ];

    return (
        <section className="py-24 bg-neutral-beige" id="how-it-works">
            <div className="container mx-auto px-4 md:px-6">

                {/* Header */}
                <div className="text-center mb-16 lg:mb-24">
                    <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">
                        How HeyKaelo works
                    </h2>
                </div>

                {/* Steps Grid */}
                <div className="grid gap-12 md:grid-cols-3 max-w-6xl mx-auto relative">

                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-6 left-[16%] right-[16%] h-0.5 bg-secondary-100 -z-10" />

                    {steps.map((step, index) => (
                        <div key={index} className="flex flex-col items-center text-center group">

                            {/* Badge */}
                            <div className="w-12 h-12 rounded-full bg-primary-500 text-white font-bold text-lg flex items-center justify-center mb-6 shadow-soft group-hover:scale-110 transition-transform duration-300 relative z-10 ring-4 ring-white">
                                {step.number}
                            </div>

                            {/* Content */}
                            <div className="max-w-xs space-y-3">
                                <h3 className="text-xl font-bold text-secondary-900">
                                    {step.title}
                                </h3>
                                <p className="text-secondary-600 leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Text */}
                <div className="text-center mt-16 pt-8 border-t border-secondary-50 max-w-lg mx-auto">
                    <p className="text-lg font-medium text-secondary-500 italic">
                        "You focus on your work. HeyKaelo handles the admin."
                    </p>
                </div>

            </div>
        </section>
    );
};

export default HowItWorks;
