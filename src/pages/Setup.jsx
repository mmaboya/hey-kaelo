import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Briefcase, Wrench, ChevronRight, Check, User, MapPin } from 'lucide-react';

export default function Setup() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        role_category: '', // 'professional' | 'mobile_service'
        role_type: '',
        other_role: '',
    });
    const [loading, setLoading] = useState(false);

    // STEP 1: OPTIONS
    const workStyles = [
        {
            id: 'professional',
            title: 'By Appointment',
            subtitle: 'I work on scheduled appointments, usually at a set location.',
            examples: 'Doctor, Psychologist, Lawyer, Physiotherapist, Consultant',
            icon: <Briefcase className="w-8 h-8 text-primary" />,
            color: 'bg-primary-50 border-primary-200 hover:border-primary-500'
        },
        {
            id: 'mobile_service',
            title: 'On-the-Go / Call-Out',
            subtitle: 'Customers contact me and I go to them or fit jobs into my day.',
            examples: 'Plumber, Electrician, Nail Tech, Barber, Beautician',
            icon: <Wrench className="w-8 h-8 text-secondary" />,
            color: 'bg-secondary-50 border-secondary-200 hover:border-secondary-500'
        }
    ];

    // STEP 2: ROLES
    const professionalRoles = [
        'Doctor / GP', 'Psychologist', 'Lawyer / Advocate', 'Physiotherapist',
        'Occupational Therapist', 'Dietitian', 'Consultant'
    ];

    const mobileRoles = [
        'Plumber', 'Electrician', 'Barber', 'Nail Technician',
        'Hair Stylist', 'Make-up Artist', 'Handyman'
    ];

    const currentRoles = formData.role_category === 'professional' ? professionalRoles : mobileRoles;

    // STEP 3: PROPOSITIONS
    const getProposition = () => {
        if (formData.role_category === 'professional') {
            return {
                headline: 'Structured appointments, handled professionally.',
                visual: '🟦 Practice-Grade',
                points: [
                    'Clean booking links',
                    'Calendar-based scheduling',
                    'Client confirmations',
                    'Rescheduling handled automatically'
                ],
                tone: 'Formal, Predictable, Reliable.'
            };
        } else {
            return {
                headline: 'All your bookings, handled in WhatsApp.',
                visual: '🟩 WhatsApp-Native',
                points: [
                    'Customers book by chatting',
                    'You approve jobs with one reply',
                    'Automatic daily summaries',
                    'No apps, no dashboards required'
                ],
                tone: 'Human, Practical, Memory-saving.'
            };
        }
    };

    const handleSelectStyle = (id) => {
        setFormData({ ...formData, role_category: id });
        setStep(2);
    };

    const handleSelectRole = (role) => {
        setFormData({ ...formData, role_type: role });
        setStep(3);
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            // 1. Determine Defaults based on Category
            const isPro = formData.role_category === 'professional';
            const updates = {
                role_category: formData.role_category,
                role_type: formData.role_type === 'Other' ? formData.other_role : formData.role_type,
                // Differentiated Defaults
                slot_granularity: isPro ? 30 : 15, // 30m vs 15m
                approval_required: !isPro,         // Mobile defaults to Approval Required
                business_name: 'My Business',      // Placeholder if empty
                updated_at: new Date()
            };

            const { error } = await supabase
                .from('profiles')
                .upsert({ id: user.id, ...updates });

            if (error) throw error;

            // Navigate to Dashboard
            navigate('/dashboard');

        } catch (error) {
            console.error('Setup Error:', error);
            alert('Error saving setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">

                {/* Progress Bar */}
                <div className="w-full h-1 bg-gray-100">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                <div className="p-8">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-secondary mb-2">
                            {step === 1 && "How do you work with customers?"}
                            {step === 2 && "Which best fits your practice?"}
                            {step === 3 && "Here is how HeyKaelo will help you:"}
                        </h1>
                        <p className="text-gray-500">
                            {step === 1 && "We'll tailor your experience based on your style."}
                            {step === 2 && "Select the closest match."}
                            {step === 3 && "Review your tailored setup."}
                        </p>
                    </div>

                    {/* STEP 1: WORK STYLE */}
                    {step === 1 && (
                        <div className="grid md:grid-cols-2 gap-4">
                            {workStyles.map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => handleSelectStyle(style.id)}
                                    className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${style.color}`}
                                >
                                    <div className="mb-4">{style.icon}</div>
                                    <h3 className="font-bold text-lg text-secondary mb-2">{style.title}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{style.subtitle}</p>
                                    <div className="text-xs text-gray-400">Examples: {style.examples}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* STEP 2: ROLE SELECTION */}
                    {step === 2 && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                {currentRoles.map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => handleSelectRole(role)}
                                        className="p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary-50 text-left font-medium text-secondary transition-colors"
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>

                            {/* Other Input */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Other Role</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="E.g. Yoga Instructor"
                                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        value={formData.other_role}
                                        onChange={(e) => setFormData({ ...formData, other_role: e.target.value })}
                                    />
                                    <button
                                        onClick={() => handleSelectRole('Other')}
                                        disabled={!formData.other_role}
                                        className="px-6 py-2 bg-secondary text-white rounded-lg disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>

                            <button onClick={() => setStep(1)} className="text-gray-400 text-sm mt-4 hover:underline">
                                Back
                            </button>
                        </div>
                    )}

                    {/* STEP 3: PROPOSITION */}
                    {step === 3 && (
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                            {(() => {
                                const prop = getProposition();
                                return (
                                    <>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="px-3 py-1 bg-white text-xs font-bold uppercase tracking-wider text-gray-500 rounded-full border">
                                                {prop.visual}
                                            </span>
                                        </div>

                                        <h2 className="text-xl font-bold text-secondary mb-6">
                                            "{prop.headline}"
                                        </h2>

                                        <ul className="space-y-3 mb-8">
                                            {prop.points.map((point, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                                    <span className="text-gray-700">{point}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                                            <button onClick={() => setStep(2)} className="text-gray-500 hover:text-secondary">
                                                Back
                                            </button>

                                            <button
                                                onClick={handleFinish}
                                                disabled={loading}
                                                className="flex items-center gap-2 px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-600 transition-colors shadow-lg shadow-primary/20"
                                            >
                                                {loading ? 'Setting up...' : 'Start Trial'}
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
