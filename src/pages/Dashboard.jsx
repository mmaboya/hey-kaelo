import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, TrendingUp, Clock, CheckCircle, XCircle, Check, Send, LogOut, Settings, MessageSquare, User as UserIcon } from 'lucide-react';
import ChatSimulator from '../components/ChatSimulator';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import ChatHistory from '../components/dashboard/ChatHistory';

// Configure API URL based on environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

import { supabase } from '../lib/supabase';

const RequestList = ({ businessId }) => {
    const [bookings, setBookings] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        if (!user || !businessId) return;

        // 1. Fetch Initial Data
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

        // 2. Subscribe to Realtime Changes
        const channel = supabase
            .channel(`realtime-bookings-${businessId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bookings',
                filter: `business_id=eq.${businessId}`
            }, (payload) => {
                console.log('Realtime change received!', payload);
                fetchBookings();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user, businessId]);

    const handleAction = async (id, action) => {
        // Optimistic Update (optional)

        // 1. Update in Supabase
        const { error } = await supabase
            .from('bookings')
            .update({ status: action })
            .eq('id', id);

        if (error) {
            alert("Error updating booking");
            return;
        }

        // 2. Notify Server to send WhatsApp (Keep this server-side for security/Twilio)
        // We pass the ID and action, server handles the rest.
        // Note: Server currently fetches booking from DB. 
        // We might need to ensure Server has permission to read it if RLS is on. 
        // (Server uses Service Role so it's fine).
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
        <div>
            {bookings.map((booking) => (
                <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-orange-100/50 transition-colors">
                    <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                            {(booking.customer_name || 'U').charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-secondary-900">{booking.customer_name || 'Unknown'}</p>
                            <p className="text-sm text-secondary-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {new Date(booking.start_time).toLocaleString()}
                            </p>
                            <p className="text-xs text-secondary-400">{booking.customer_phone}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleAction(booking.id, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                            <XCircle className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleAction(booking.id, 'approved')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
                            <Check className="w-4 h-4" /> Accept
                        </button>
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
                            {/* WhatsApp Link Generator (New) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
                                <h2 className="text-lg font-bold text-secondary-900 mb-4">📢 Get Your Booking Link</h2>
                                <p className="text-sm text-secondary-500 mb-4">Share this link with customers so they can book you directly on WhatsApp.</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-600 mb-1">Your Unique Slug</label>
                                        <input
                                            type="text"
                                            value={profile?.slug || '...'}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 text-gray-700"
                                            readOnly
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Customers use this to find you on WhatsApp.</p>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 break-all font-mono text-sm text-gray-600">
                                        {whatsappLink}
                                    </div>

                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(whatsappLink);
                                            alert("Link copied to clipboard! 📋");
                                        }}
                                        className="h-10 px-6 rounded-lg bg-secondary-900 text-white font-medium hover:bg-secondary-800 transition-colors w-full flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-4 h-4" /> Copy Link
                                    </button>
                                </div>
                            </div>

                            {/* Interactive AI Simulator (New) */}
                            <div className="h-full">
                                <ChatSimulator />
                            </div>
                        </div>

                        {/* Pending Booking Requests (New) */}
                        <div className="bg-orange-50 rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                            <div className="p-6 border-b border-orange-100 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-orange-900">Pending Requests ⏳</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="p-1 text-orange-600 hover:bg-orange-100 rounded-full transition-colors"
                                        title="Refresh List"
                                    >
                                        <TrendingUp className="w-4 h-4 rotate-180" />
                                    </button>
                                    <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">Action Required</span>
                                </div>
                            </div>
                            <div className="divide-y divide-orange-100">
                                <RequestList businessId={user.id} />
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
                )
            }
        </div >
    );
};

export default Dashboard;
