import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Save, Plus, Trash2, Clock, Copy } from 'lucide-react';

const ProfileSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Business Profile State
    const [profile, setProfile] = useState({
        business_name: '',
        slug: '',
        phone_number: ''
    });

    // Operating Hours State (Default: Mon-Fri 9-5)
    // 0=Sun, 1=Mon, ...
    const [hours, setHours] = useState(
        Array.from({ length: 7 }, (_, i) => ({
            day_of_week: i,
            open_time: '09:00',
            close_time: '17:00',
            is_closed: i === 0 || i === 6 // Closed weekends by default
        }))
    );

    // Services State
    const [services, setServices] = useState([]);

    useEffect(() => {
        if (user) fetchAllData();
    }, [user]);

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileData) setProfile(profileData);

            // 2. Fetch Hours
            const { data: hoursData } = await supabase
                .from('operating_hours')
                .select('*')
                .eq('business_id', user.id)
                .order('day_of_week');

            if (hoursData && hoursData.length > 0) {
                // Merge DB data with default array to ensure all 7 days exist
                const newHours = [...hours];
                hoursData.forEach(h => {
                    newHours[h.day_of_week] = h;
                });
                setHours(newHours);
            }

            // 3. Fetch Services
            const { data: servicesData } = await supabase
                .from('services')
                .select('*')
                .eq('business_id', user.id);

            if (servicesData) setServices(servicesData);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            // Sanitize: Convert empty strings to null to avoid unique constraint violation on ""
            const updates = {
                ...profile,
                slug: profile.slug && profile.slug.trim() !== '' ? profile.slug.toLowerCase().trim() : null,
                updated_at: new Date(),
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) {
                // Postgres Unique Violation Code
                if (error.code === '23505') {
                    throw new Error('This "Link Slug" is already taken. Please choose another.');
                }
                throw error;
            }
            alert('Profile saved!');
        } catch (error) {
            alert('Error saving profile: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveHours = async () => {
        setSaving(true);
        try {
            const updates = hours.map(h => ({
                ...h,
                business_id: user.id
            }));

            const { error } = await supabase
                .from('operating_hours')
                .upsert(updates); // Upsert handles ID conflicts if we include ID, but for now we rely on constraints or clean insert

            if (error) throw error;
            alert('Hours saved!');
        } catch (error) {
            alert('Error saving hours: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddService = () => {
        setServices([...services, { name: '', duration_mins: 30, price: 0 }]);
    };

    const handleSaveServices = async () => {
        setSaving(true);
        try {
            // Filter out empty ones
            const validServices = services
                .filter(s => s.name.trim() !== '')
                .map(s => ({
                    ...s,
                    business_id: user.id
                }));

            const { error } = await supabase
                .from('services')
                .upsert(validServices);

            if (error) throw error;
            alert('Services saved!');
            fetchAllData(); // Refresh to get IDs
        } catch (error) {
            alert('Error saving services: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-12">

            {/* 1. General Profile */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Business Profile</h2>
                    <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex gap-2 items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} Save Profile
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg focus:ring-green-500"
                            placeholder="e.g. Classic Cuts"
                            value={profile.business_name}
                            onChange={e => setProfile({ ...profile, business_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Public Link Slug</label>
                        <div className="flex items-center flex-1">
                            <span className="bg-gray-50 text-gray-500 p-2 border border-r-0 rounded-l-lg">heykaelo.com/p/</span>
                            <input
                                type="text"
                                className="w-full p-2 border border-r-0 focus:ring-green-500 outline-none"
                                placeholder="classic-cuts"
                                value={profile.slug}
                                onChange={e => setProfile({ ...profile, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            />
                            <button
                                onClick={() => {
                                    // TODO: Replace with your actual WhatsApp Bot Number
                                    const botNumber = '14155238886';
                                    const text = encodeURIComponent(`Hi, I'd like to book an appointment with ${profile.business_name}`);
                                    const link = `https://wa.me/${botNumber}?text=${text}`;
                                    navigator.clipboard.writeText(link);
                                    alert('WhatsApp Booking Link copied! 📋\n(Paste this in your Status)');
                                }}
                                className="p-2 bg-gray-100 border border-l-0 rounded-r-lg hover:bg-gray-200 text-gray-600"
                                title="Copy WhatsApp Booking Link"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Operating Hours */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-500" /> Operating Hours
                    </h2>
                    <button onClick={handleSaveHours} disabled={saving} className="btn-secondary px-4 py-2 text-green-600 border border-green-200 rounded-lg hover:bg-green-50">
                        Save Hours
                    </button>
                </div>
                <div className="space-y-4">
                    {hours.map((day, index) => (
                        <div key={index} className="flex items-center gap-4 py-2 border-b last:border-0 hover:bg-gray-50 px-2 rounded-lg">
                            <div className="w-24 font-medium text-gray-700">{days[day.day_of_week]}</div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!day.is_closed}
                                    onChange={e => {
                                        const newHours = [...hours];
                                        newHours[index].is_closed = !e.target.checked;
                                        setHours(newHours);
                                    }}
                                    className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-500">Open</span>
                            </label>

                            {!day.is_closed && (
                                <div className="flex items-center gap-2 ml-4">
                                    <input
                                        type="time"
                                        value={day.open_time}
                                        onChange={e => {
                                            const newHours = [...hours];
                                            newHours[index].open_time = e.target.value;
                                            setHours(newHours);
                                        }}
                                        className="p-1 border rounded"
                                    />
                                    <span className="text-gray-400">to</span>
                                    <input
                                        type="time"
                                        value={day.close_time}
                                        onChange={e => {
                                            const newHours = [...hours];
                                            newHours[index].close_time = e.target.value;
                                            setHours(newHours);
                                        }}
                                        className="p-1 border rounded"
                                    />
                                </div>
                            )}
                            {day.is_closed && <span className="text-sm text-gray-400 ml-4 italic">Closed</span>}
                        </div>
                    ))}
                </div>
            </section>

            {/* 2.5 AI Knowledge Base (New for Phase 3) */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 ring-2 ring-purple-100">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                            🧠 AI "Knowledge Base" (Context)
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Paste your <b>Price List</b>, <b>FAQs</b>, or any special rules here.
                            The AI will use this to answer customer questions correctly.
                        </p>
                    </div>
                    <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium">
                        {saving ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Context"}
                    </button>
                </div>
                <textarea
                    className="w-full h-40 p-3 border rounded-lg focus:ring-purple-500 bg-gray-50 font-mono text-sm leading-relaxed"
                    placeholder={`Example:\n- Men's Haircut: R150 (30 mins)\n- Ladies Cut & Blow: R350\n- We are closed on Public Holidays.\n- Please come with clean hair.`}
                    value={profile.business_context || ''}
                    onChange={e => setProfile({ ...profile, business_context: e.target.value })}
                />
            </section>

            {/* 3. Service Menu */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Service Menu</h2>
                    <button onClick={handleSaveServices} disabled={saving} className="btn-primary bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
                        Save Menu
                    </button>
                </div>

                <div className="space-y-4">
                    {services.map((service, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 block mb-1">Service Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Men's Haircut"
                                    className="w-full p-2 border rounded-md"
                                    value={service.name}
                                    onChange={e => {
                                        const newServices = [...services];
                                        newServices[index].name = e.target.value;
                                        setServices(newServices);
                                    }}
                                />
                            </div>
                            <div className="w-24">
                                <label className="text-xs text-gray-500 block mb-1">Price (R)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded-md text-right"
                                    value={service.price}
                                    onChange={e => {
                                        const newServices = [...services];
                                        newServices[index].price = e.target.value;
                                        setServices(newServices);
                                    }}
                                />
                            </div>
                            <div className="w-32">
                                <label className="text-xs text-gray-500 block mb-1">Duration (min)</label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={service.duration_mins}
                                    onChange={e => {
                                        const newServices = [...services];
                                        newServices[index].duration_mins = parseInt(e.target.value);
                                        setServices(newServices);
                                    }}
                                >
                                    <option value="15">15 mins</option>
                                    <option value="30">30 mins</option>
                                    <option value="45">45 mins</option>
                                    <option value="60">1 hour</option>
                                    <option value="90">1.5 hours</option>
                                    <option value="120">2 hours</option>
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    const newServices = services.filter((_, i) => i !== index);
                                    setServices(newServices);
                                }}
                                className="mt-5 p-2 text-red-500 hover:bg-red-50 rounded-full"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={handleAddService}
                        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 font-medium hover:border-green-500 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Add Service
                    </button>
                </div>
            </section>
        </div>
    );
};

export default ProfileSettings;
