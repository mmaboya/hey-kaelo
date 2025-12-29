import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, TrendingUp, Clock, CheckCircle, XCircle, Check, Send, LogOut, Settings, MessageSquare, Search, User as UserIcon } from 'lucide-react';
import AppointmentGrid from '../components/dashboard/AppointmentGrid';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import ChatHistory from '../components/dashboard/ChatHistory';

// Configure API URL based on environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

import { supabase } from '../lib/supabase';

const ChatTooltip = ({ phone, name }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('conversation_states')
                .select('metadata')
                .eq('phone_number', phone)
                .maybeSingle();

            if (data && data.metadata?.history) {
                setHistory(data.metadata.history.slice(-5)); // Show last 5 messages
            }
            setLoading(false);
        };
        fetchHistory();
    }, [phone]);

    return (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full bg-secondary-900 flex items-center justify-center text-white text-xs font-bold">
                    {name.charAt(0)}
                </div>
                <div>
                    <p className="text-xs font-bold text-secondary-900">{name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">WhatsApp Context</p>
                </div>
            </div>
            {loading ? (
                <div className="py-4 text-center text-[10px] text-gray-400 italic">Loading conversation...</div>
            ) : history.length > 0 ? (
                <div className="space-y-3">
                    {history.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`px-3 py-2 rounded-xl text-[11px] leading-relaxed max-w-[90%] shadow-sm ${msg.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-700 rounded-tl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-4 text-center text-[10px] text-gray-400 italic">No chat history found.</div>
            )}
            <div className="absolute top-full left-6 -mt-1 border-8 border-transparent border-t-white"></div>
        </div>
    );
};

const RequestList = ({ businessId }) => {
    const [bookings, setBookings] = useState([]);
    const [hoveredId, setHoveredId] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!user || !businessId) return;

        const fetchBookings = async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('business_id', businessId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) console.error('Error fetching bookings:', error);
            else setBookings(data || []);
        };

        fetchBookings();

        const channel = supabase
            .channel(`realtime-bookings-${businessId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bookings',
                filter: `business_id=eq.${businessId}`
            }, (payload) => {
                fetchBookings();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user, businessId]);

    const handleAction = async (id, action) => {
        const { error } = await supabase
            .from('bookings')
            .update({ status: action })
            .eq('id', id);

        if (error) {
            alert("Error updating booking");
            return;
        }

        try {
            await fetch(`${API_URL}/api/bookings/${id}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
        } catch (e) {
            console.error("Failed to trigger WhatsApp notification", e);
        }
    };

    if (bookings.length === 0) return <div className="p-6 text-center text-orange-700">No pending requests. Great job! 🎉</div>;

    return (
        <div className="relative">
            {bookings.map((booking) => (
                <div
                    key={booking.id}
                    className="group p-6 border-b last:border-0 hover:bg-orange-50/30 transition-colors relative"
                    onMouseEnter={() => setHoveredId(booking.id)}
                    onMouseLeave={() => setHoveredId(null)}
                >
                    {hoveredId === booking.id && (
                        <ChatTooltip phone={booking.customer_phone} name={booking.customer_name} />
                    )}

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl flex-shrink-0">
                                {(booking.customer_name || 'U').charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-bold text-secondary-900 text-lg">{booking.customer_name || 'Unknown'}</p>
                                    <div className="p-1 px-2 rounded-full border border-orange-200 text-orange-600 bg-orange-50 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MessageSquare className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Hover for Context</span>
                                    </div>
                                    {booking.form_signed_at && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Signed
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-secondary-600 flex items-center gap-1 mb-2">
                                    <Calendar className="w-3 h-3" /> {new Date(booking.start_time).toLocaleString()}
                                </p>

                                {/* Registration Details (Doctor Mode) */}
                                {(booking.patient_id_number || booking.medical_aid_name) && (
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        {booking.patient_id_number && (
                                            <div>
                                                <p className="text-[10px] uppercase text-gray-400 font-bold">ID Number</p>
                                                <p className="text-sm text-gray-700">{booking.patient_id_number}</p>
                                            </div>
                                        )}
                                        {booking.medical_aid_name && (
                                            <div>
                                                <p className="text-[10px] uppercase text-gray-400 font-bold">Medical Aid</p>
                                                <p className="text-sm text-gray-700 capitalize">{booking.medical_aid_name}</p>
                                            </div>
                                        )}
                                        {booking.reason_for_visit && (
                                            <div className="sm:col-span-2">
                                                <p className="text-[10px] uppercase text-gray-400 font-bold">Reason for Visit</p>
                                                <p className="text-sm text-gray-700 italic">"{booking.reason_for_visit}"</p>
                                            </div>
                                        )}
                                        {booking.signature_url && (
                                            <div className="sm:col-span-2 mt-2">
                                                <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Handwritten Signature</p>
                                                <div className="relative group/sig w-32 h-20 bg-white border rounded-lg overflow-hidden cursor-pointer hover:border-orange-400 transition-colors"
                                                    onClick={() => window.open(booking.signature_url, '_blank')}>
                                                    <img
                                                        src={booking.signature_url}
                                                        alt="Signature"
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover/sig:bg-black/10 flex items-center justify-center transition-all">
                                                        <Search className="w-4 h-4 text-white opacity-0 group-hover/sig:opacity-100" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end items-center">
                            <button
                                onClick={() => handleAction(booking.id, 'rejected')}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center gap-2"
                            >
                                <XCircle className="w-5 h-5" /> Decline
                            </button>
                            <button
                                onClick={() => handleAction(booking.id, 'approved')}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-sm shadow-green-200 transition-all active:scale-95 flex items-center gap-2">
                                <Check className="w-5 h-5" /> Accept Booking
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Dashboard = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState('overview'); // 'overview' | 'settings' | 'messages'
    const [stats, setStats] = useState({ totalBookings: 0, activeClients: 0 });
    const [activity, setActivity] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            // 0. Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!profileData || !profileData.business_name || profileData.business_name === 'My Business') {
                // Redirect if profile is incomplete
                navigate('/setup');
                return;
            }
            setProfile(profileData);

            // 1. Total Bookings
            const { count: bookingCount } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', user.id);

            // 2. Active Clients
            const { count: clientCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', user.id);

            setStats({
                totalBookings: bookingCount || 0,
                activeClients: clientCount || 0
            });

            // 3. Recent Activity
            const { data: recentBookings } = await supabase
                .from('bookings')
                .select('*, customers(name)')
                .eq('business_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentBookings) {
                setActivity(recentBookings.map(b => ({
                    title: b.status === 'pending' ? 'New Booking Request' : `Booking ${b.status}`,
                    desc: `${b.customer_name || 'Someone'} requested for ${new Date(b.start_time).toLocaleDateString()}`,
                    time: new Date(b.created_at).toLocaleTimeString(),
                    icon: Calendar,
                    color: b.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                })));
            }
            setLoading(false);
        };

        fetchData();

        // Realtime refresh
        const channel = supabase
            .channel('dashboard-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bookings',
                filter: `business_id=eq.${user.id}`
            }, fetchData)
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user, navigate]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const whatsappLink = `https://wa.me/14155238886?text=${encodeURIComponent(`join ${profile?.slug || 'setup'}`)}`;

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
                    <p className="text-secondary-500">Welcome back, {user?.email}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveView('overview')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeView === 'overview' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveView('messages')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeView === 'messages' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Send className="w-4 h-4" /> Chats
                    </button>
                    <button
                        onClick={() => setActiveView('settings')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeView === 'settings' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Settings className="w-4 h-4" /> Settings
                    </button>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors ml-4 border-l pl-4"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </div>

            {
                activeView === 'settings' ? (
                    <ProfileSettings />
                ) : activeView === 'messages' ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-bold mb-6 text-gray-900">Conversation History</h2>
                        <ChatHistory businessId={user.id} />
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { label: 'Total Bookings', value: stats.totalBookings, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Active Clients', value: stats.activeClients, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                            ].map((stat, index) => (
                                <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-secondary-500">{stat.label}</p>
                                        <p className="text-3xl font-bold text-secondary-900 mt-2">{stat.value}</p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Test & Link Generator Grid */}
                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* WhatsApp Invite Hub (Consolidated) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-secondary-900">WhatsApp Invite Hub</h2>
                                            <p className="text-[10px] text-secondary-500 font-medium uppercase tracking-wider">Expand your reach via WhatsApp</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/20"></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Section A: Invite Customers */}
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <h3 className="text-xs font-black text-secondary-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Users className="w-3 h-3" /> Customer Booking Link
                                            </h3>
                                            <p className="text-xs text-secondary-500 mb-4 font-medium leading-relaxed">
                                                Send this link to customers or put it in your Instagram bio.
                                            </p>

                                            <div className="space-y-3">
                                                <div className="p-2.5 bg-white rounded-lg border border-gray-200 font-mono text-[10px] text-gray-500 truncate select-all">
                                                    {whatsappLink}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(whatsappLink);
                                                            alert("Link copied to clipboard! 📋");
                                                        }}
                                                        className="h-9 rounded-lg border border-gray-200 text-secondary-700 text-xs font-bold hover:bg-white transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Send className="w-3 h-3" /> Copy Link
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const text = `Awe! You can now book your next appointment with ${profile?.business_name || 'me'} directly on WhatsApp: ${whatsappLink}`;
                                                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                                        }}
                                                        className="h-9 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-green-100"
                                                    >
                                                        <MessageSquare className="w-3 h-3" /> WhatsApp
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section B: Connect Admin Phone */}
                                    <div className="space-y-4">
                                        <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                                            <h3 className="text-xs font-black text-primary-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <TrendingUp className="w-3 h-3" /> Receive Notifications
                                            </h3>
                                            <p className="text-xs text-primary-700/80 mb-4 font-medium leading-relaxed">
                                                Join the WhatsApp Sandbox to receive instant booking alerts and approve appointments.
                                            </p>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 p-2.5 bg-white/50 rounded-xl border border-primary-200">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-primary-400 font-bold uppercase tracking-tight">Step 1: Text "join {profile?.slug || 'biz'}" to:</p>
                                                        <p className="text-sm font-black text-primary-900">+1 415 523 8886</p>
                                                    </div>
                                                    <button
                                                        onClick={() => window.open(`https://wa.me/14155238886?text=join%20${profile?.slug || 'setup'}`, '_blank')}
                                                        className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10 min-h-[500px]">
                                <AppointmentGrid businessId={user.id} />
                            </div>

                            {/* Pending Booking Requests (New) */}
                            <div className="bg-orange-50 rounded-2xl shadow-sm border border-orange-100 overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-orange-100 flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-orange-900">Pending Requests ⏳</h2>
                                    <div className="flex gap-2">
                                        <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">Action Required</span>
                                    </div>
                                </div>
                                <div className="divide-y divide-orange-100 overflow-y-auto flex-1">
                                    <RequestList businessId={user.id} />
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-secondary-900">Recent Activity</h2>
                                <button className="text-sm font-medium text-primary-600 hover:text-primary-700">View All</button>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {activity.length > 0 ? activity.map((item, index) => (
                                    <div key={index} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-secondary-900">{item.title}</p>
                                            <p className="text-sm text-secondary-500 truncate">{item.desc}</p>
                                        </div>
                                        <span className="text-xs text-secondary-400 whitespace-nowrap">{item.time}</span>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-gray-400 italic">No recent activity.</div>
                                )}
                            </div>
                        </div>
                    </>
                )}
        </div>
    );
};

export default Dashboard;
