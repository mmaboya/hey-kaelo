import React, { useState } from 'react';
import { Check, Star, Zap, Building } from 'lucide-react';

const PricingSection = ({ viewMode }) => {
    const [isYearly, setIsYearly] = useState(false);

    // Business Pricing Data
    const businessTiers = [
        {
            name: 'Starter',
            price: isYearly ? 'FREE' : 'FREE',
            period: 'forever',
            description: 'Perfect for side-hustles and exploring.',
            features: [
                '1 Automated Booking Flow',
                'Manual Calendar Approval',
                'Basic Dashboard',
                '50AI Messages / month'
            ],
            color: 'bg-gray-50 border-gray-200',
            btnColor: 'bg-white text-secondary-900 border border-gray-200 hover:bg-gray-50'
        },
        {
            name: 'Professional',
            price: isYearly ? 'R 250' : 'R 299',
            period: '/ month',
            description: 'For growing businesses that need hands-free scheduling.',
            isPopular: true,
            features: [
                'Unlimited AI Bookings',
                'Google Calendar Sync (2-Way)',
                'WhatsApp Reminders (Reduce No-Shows)',
                'Client Database & Notes',
                'Priority Support'
            ],
            color: 'bg-white border-primary-500 shadow-xl scale-105',
            btnColor: 'bg-primary-500 text-white hover:bg-primary-600'
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'For multi-location franchises and large teams.',
            features: [
                'Multiple Numbers & Staff',
                'Custom AI Persona Training',
                'API Access & Webhooks',
                'Dedicated Account Manager'
            ],
            color: 'bg-gray-50 border-gray-200',
            btnColor: 'bg-secondary-900 text-white hover:bg-secondary-800'
        }
    ];

    // Customer "Pricing" (Free)
    const customerContent = (
        <div className="max-w-3xl mx-auto text-center bg-green-50 rounded-2xl p-12 border border-green-100">
            <h3 className="text-2xl font-bold text-green-900 mb-4">Always Free for Customers</h3>
            <p className="text-lg text-green-700 mb-8">
                Booking an appointment with HeyKaelo is completely free.
                You only pay the service provider directly for their work.
            </p>
            <div className="flex justify-center gap-8 text-green-800">
                <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white rounded-full"><Check className="w-6 h-6" /></div>
                    <span className="font-medium">No Booking Fees</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white rounded-full"><Zap className="w-6 h-6" /></div>
                    <span className="font-medium">Instant Confirmation</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white rounded-full"><Star className="w-6 h-6" /></div>
                    <span className="font-medium">Reminders Included</span>
                </div>
            </div>
        </div>
    );

    return (
        <section className="py-24 bg-white" id="pricing">
            <div className="container mx-auto px-4 md:px-6">

                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">
                        {viewMode === 'business' ? "Straightforward Pricing" : "How much does it cost?"}
                    </h2>
                    <p className="mt-4 text-lg text-secondary-500">
                        {viewMode === 'business'
                            ? "Start for free, upgrade as you grow. No hidden fees."
                            : "Booking appointments shouldn't cost you a cent."}
                    </p>

                    {/* Toggle (Only for Business) */}
                    {viewMode === 'business' && (
                        <div className="flex justify-center items-center mt-8 gap-3">
                            <span className={`text-sm font-medium ${!isYearly ? 'text-secondary-900' : 'text-secondary-500'}`}>Monthly</span>
                            <button
                                onClick={() => setIsYearly(!isYearly)}
                                className={`w-14 h-8 rounded-full p-1 transition-colors ${isYearly ? 'bg-primary-500' : 'bg-gray-300'}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                            <span className={`text-sm font-medium ${isYearly ? 'text-secondary-900' : 'text-secondary-500'}`}>
                                Yearly <span className="text-primary-600 text-xs font-bold bg-primary-50 px-2 py-0.5 rounded-full ml-1">-20%</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                {viewMode === 'business' ? (
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                        {businessTiers.map((tier, index) => (
                            <div key={index} className={`relative rounded-2xl p-8 border ${tier.color} flex flex-col h-full`}>
                                {tier.isPopular && (
                                    <div className="absolute top-0 right-0 left-0 -mt-4 flex justify-center">
                                        <span className="bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <h3 className="text-xl font-bold text-secondary-900">{tier.name}</h3>
                                <div className="mt-4 flex items-baseline">
                                    <span className="text-4xl font-extrabold text-secondary-900">{tier.price}</span>
                                    <span className="text-gray-500 ml-1 text-sm font-medium">{tier.period}</span>
                                </div>
                                <p className="mt-4 text-sm text-secondary-500 leading-relaxed">{tier.description}</p>

                                <ul className="mt-8 space-y-4 flex-1">
                                    {tier.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-secondary-700">
                                            <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button className={`mt-8 w-full py-3 px-6 rounded-lg font-bold transition-all shadow-sm ${tier.btnColor}`}>
                                    {index === 2 ? 'Contact Sales' : 'Get Started'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    customerContent
                )}

            </div>
        </section>
    );
};

export default PricingSection;
