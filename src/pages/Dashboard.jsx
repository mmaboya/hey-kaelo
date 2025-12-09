import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar, TrendingUp, Clock, CheckCircle, XCircle, Check, Send, LogOut, Settings } from 'lucide-react';
import ChatSimulator from '../components/ChatSimulator';
import ProfileSettings from '../components/dashboard/ProfileSettings';

// Configure API URL based on environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

import { supabase } from '../lib/supabase';

const RequestList = () => {
    const [bookings, setBookings] = useState([]);
    const { user } = useAuth(); // Need user to ensure we are auth'd

    useEffect(() => {
        if (!user) return;

        // 1. Fetch Initial Data
        const fetchBookings = async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) console.error('Error fetching bookings:', error);
            else setBookings(data || []);
        };

        fetchBookings();

        // 2. Subscribe to Realtime Changes
        const channel = supabase
            .channel('realtime-bookings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
                console.log('Realtime change received!', payload);
                fetchBookings(); // Simple refresh on any change
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user]);

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
    const [activeView, setActiveView] = useState('overview'); // 'overview' | 'settings'

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

            {activeView === 'settings' ? (
                <ProfileSettings />
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Total Bookings', value: '124', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Active Clients', value: '45', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                            { label: 'Revenue (Est.)', value: 'R 12,450', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
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

                    {/* Test Integration Widget & Chat Simulator Grid */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Existing Test Widget */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
                            <h2 className="text-lg font-bold text-secondary-900 mb-4">Test WhatsApp Integration 🔌</h2>
                            <div className="space-y-4">
                                <div className="max-w-xs">
                                    <label className="block text-sm font-medium text-secondary-600 mb-1">WhatsApp Number</label>
                                    <input
                                        type="text"
                                        placeholder="+27..."
                                        id="test-phone"
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            const phone = document.getElementById('test-phone').value;
                                            if (!phone) return alert('Please enter a phone number!');

                                            try {
                                                const res = await fetch(`${API_URL}/api/send-whatsapp`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ to: phone, body: 'Hello from HeyKaelo! 👋 This is your test message.' })
                                                });
                                                const data = await res.json();
                                                if (data.success) alert('Message sent! Check your WhatsApp.');
                                                else alert('Error: ' + JSON.stringify(data));
                                            } catch (e) {
                                                alert('Connection Error: Is the backend running?');
                                            }
                                        }}
                                        className="h-10 px-6 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors w-full"
                                    >
                                        Send Test Message
                                    </button>
                                </div>
                                <p className="text-xs text-secondary-400">*Connects to Sandbox: +14155238886</p>
                            </div>
                        </div>

                        {/* Chat Simulator */}
                        <ChatSimulator />
                    </div>

                    {/* Pending Booking Requests (New) */}
                    <div className="bg-orange-50 rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                        <div className="p-6 border-b border-orange-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-orange-900">Pending Requests ⏳</h2>
                            <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">Action Required</span>
                        </div>
                        <div className="divide-y divide-orange-100">
                            <RequestList />
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-secondary-900">Recent Activity</h2>
                            <button className="text-sm font-medium text-primary-600 hover:text-primary-700">View All</button>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {[
                                { title: 'New Booking', desc: 'Sarah J. booked a Haircut for tomorrow', time: '2 mins ago', icon: Calendar, color: 'bg-blue-100 text-blue-600' },
                                { title: 'Reminder Sent', desc: 'WhatsApp reminder sent to Mike T.', time: '15 mins ago', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
                                { title: 'New Client', desc: 'Emma W. was added to your client list', time: '1 hour ago', icon: Users, color: 'bg-purple-100 text-purple-600' },
                                { title: 'Booking Cancelled', desc: 'John D. cancelled his appointment', time: '3 hours ago', icon: Clock, color: 'bg-red-100 text-red-600' },
                            ].map((item, index) => (
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
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
