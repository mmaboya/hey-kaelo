import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const Clients = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) {
            fetchClients();
        }
    }, [user]); // eslint-disable-next-line react-hooks/exhaustive-deps

    const fetchClients = async () => {
        try {
            setLoading(true);
            // 1. Get My Business Profile ID
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();

            if (!profile) return;

            // 2. Fetch Customers with Booking Counts
            // Note: This relies on Foreign Key 'bookings.customer_id' -> 'customers.id'
            const { data, error } = await supabase
                .from('customers')
                .select(`
                    *,
                    bookings:bookings(count)
                `)
                .eq('business_id', profile.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data to flatten count
            const formatted = data.map(c => ({
                ...c,
                total_bookings: c.bookings ? c.bookings[0]?.count || 0 : 0
            }));

            // Sort by most bookings by default if you want? Or just keep recent.
            // Let's sort by Total Bookings descending
            formatted.sort((a, b) => b.total_bookings - a.total_bookings);

            setClients(formatted);
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
    );

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
                    <p className="text-gray-600 mt-1">Manage your customer relationships.</p>
                </div>
                {/* Search Bar */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search name or phone..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
                    ))}
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-xl font-semibold text-gray-900">No Clients Yet</h3>
                    <p className="text-gray-500 mt-2">Customers will appear here automatically when they book via WhatsApp.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Bookings</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{client.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-400">Seen: {new Date(client.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                                        {client.phone}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.total_bookings > 2 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {client.total_bookings} visits
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {client.total_bookings > 5 ? (
                                            <span className="text-xs font-bold text-amber-600">★ VIP</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">Regular</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Clients;
