import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, User, Clock, ChevronRight, FileText, Paperclip, History, ExternalLink } from 'lucide-react';

const AppointmentDetails = ({ booking, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('bookings')
                .select('*')
                .eq('customer_phone', booking.customer_phone)
                .neq('id', booking.id) // Exclude current
                .order('start_time', { ascending: false });

            setHistory(data || []);
            setLoading(false);
        };
        fetchHistory();
    }, [booking]);

    return (
        <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm z-[60] flex items-center justify-end">
            <div className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl">
                            {booking.customer_name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-secondary-900">{booking.customer_name}</h2>
                            <p className="text-sm text-secondary-500">{booking.customer_phone}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10">
                    {/* Current Appointment Info */}
                    <section>
                        <h3 className="text-sm font-black uppercase tracking-widest text-secondary-400 mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Current Appointment
                        </h3>
                        <div className="bg-primary-50 border border-primary-100 p-6 rounded-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-lg font-bold text-secondary-900">
                                        {new Date(booking.start_time).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                    <p className="text-primary-700 font-medium"> @ {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">
                                    {booking.status}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Attachments Section */}
                    <section>
                        <h3 className="text-sm font-black uppercase tracking-widest text-secondary-400 mb-4 flex items-center gap-2">
                            <Paperclip className="w-4 h-4" /> Attachments
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {booking.signature_url ? (
                                <div
                                    onClick={() => window.open(booking.signature_url, '_blank')}
                                    className="group relative bg-white border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition-all"
                                >
                                    <div className="w-full h-24 mb-2 flex items-center justify-center overflow-hidden">
                                        <img src={booking.signature_url} alt="Signature" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Client Signature</p>
                                    <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/5 transition-colors rounded-2xl"></div>
                                </div>
                            ) : (
                                <div className="col-span-2 py-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400">
                                    <FileText className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-xs font-medium">No attachments yet</p>
                                </div>
                            )}

                            {/* Generic Placeholder for more attachments */}
                            <div className="border-2 border-dashed border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center text-gray-300 hover:text-primary-400 hover:border-primary-200 cursor-pointer transition-all">
                                <Paperclip className="w-6 h-6 mb-1" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Add Files</p>
                            </div>
                        </div>
                    </section>

                    {/* Previous Appointments (History) */}
                    <section>
                        <h3 className="text-sm font-black uppercase tracking-widest text-secondary-400 mb-4 flex items-center gap-2">
                            <History className="w-4 h-4" /> Previous Sessions
                        </h3>
                        {loading ? (
                            <div className="text-center py-6 text-gray-400 italic text-sm">Loading history...</div>
                        ) : history.length > 0 ? (
                            <div className="space-y-3">
                                {history.map((prev, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-400 flex-shrink-0">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-secondary-900">
                                                    {new Date(prev.start_time).toLocaleDateString()}
                                                </p>
                                                <p className="text-xs text-secondary-500">
                                                    {prev.status}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-2xl text-gray-400 italic text-sm">
                                First time client! No history found.
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

const AppointmentGrid = ({ businessId }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);

    useEffect(() => {
        if (!businessId) return;

        const fetchAppointments = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('business_id', businessId)
                .in('status', ['approved', 'completed'])
                .order('start_time', { ascending: false });

            if (error) console.error('Error fetching appointments:', error);
            else setAppointments(data || []);
            setLoading(false);
        };

        fetchAppointments();

        const channel = supabase
            .channel(`all-appointments-${businessId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bookings',
                filter: `business_id=eq.${businessId}`
            }, fetchAppointments)
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [businessId]);

    if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse">Syncing calendar...</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-secondary-900">Confirmed Appointments</h2>
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                    {appointments.length} Total
                </span>
            </div>

            {appointments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium text-center max-w-[200px]">No appointments booked yet.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {appointments.map((appt) => (
                        <div
                            key={appt.id}
                            onClick={() => setSelectedBooking(appt)}
                            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group cursor-pointer flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-secondary-900 text-white flex items-center justify-center font-bold text-sm">
                                    {appt.customer_name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">
                                        {appt.customer_name}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <p className="text-[10px] text-secondary-500 flex items-center gap-1 font-medium">
                                            <Calendar className="w-2.5 h-2.5" />
                                            {new Date(appt.start_time).toLocaleDateString()}
                                        </p>
                                        <p className="text-[10px] text-primary-600 flex items-center gap-1 font-bold">
                                            <Clock className="w-2.5 h-2.5" />
                                            {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    ))}
                </div>
            )}

            {selectedBooking && (
                <AppointmentDetails
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                />
            )}
        </div>
    );
};

export default AppointmentGrid;
