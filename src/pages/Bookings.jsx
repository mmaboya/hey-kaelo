import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Calendar, Search, CheckCircle, XCircle, Clock, Filter,
    ChevronDown, Phone, User, Check, X, Eye, RefreshCw,
    ChevronLeft, ChevronRight, MessageSquare
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    pending:  { label: 'Pending',  bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-400' },
    approved: { label: 'Approved', bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500'  },
    rejected: { label: 'Declined', bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-400'    },
    cancelled:{ label: 'Cancelled',bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'   },
};

const DATE_FILTERS = [
    { label: 'All Time',   value: 'all'   },
    { label: 'Today',      value: 'today' },
    { label: 'This Week',  value: 'week'  },
    { label: 'This Month', value: 'month' },
];

function getDateRange(filter) {
    const now = new Date();
    if (filter === 'today') {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const end   = new Date(now); end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    if (filter === 'week') {
        const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
        const end   = new Date(now); end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    if (filter === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end   = new Date(now); end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    return null;
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
            {cfg.label}
        </span>
    );
}

const PAGE_SIZE = 10;

// ─── Detail Modal ────────────────────────────────────────────────────────────

const BookingModal = ({ booking, onClose, onAction }) => {
    const [acting, setActing] = useState(false);

    if (!booking) return null;

    const handle = async (action) => {
        setActing(true);
        await onAction(booking.id, action);
        setActing(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-secondary-900">Booking Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Customer */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0">
                            {(booking.customer_name || 'U').charAt(0)}
                        </div>
                        <div>
                            <p className="text-lg font-bold text-secondary-900">{booking.customer_name || 'Unknown'}</p>
                            <p className="text-sm text-secondary-500 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" /> {booking.customer_phone}
                            </p>
                        </div>
                        <div className="ml-auto">
                            <StatusBadge status={booking.status} />
                        </div>
                    </div>

                    {/* Date/Time */}
                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary-600" />
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Appointment</p>
                            <p className="text-sm font-bold text-secondary-900">
                                {new Date(booking.start_time).toLocaleString('en-ZA', {
                                    weekday: 'long', year: 'numeric', month: 'long',
                                    day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Optional registration fields */}
                    {(booking.patient_id_number || booking.medical_aid_name || booking.reason_for_visit) && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Registration Info</p>
                            <div className="grid grid-cols-2 gap-3">
                                {booking.patient_id_number && (
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">ID Number</p>
                                        <p className="text-sm font-medium text-secondary-900 mt-0.5">{booking.patient_id_number}</p>
                                    </div>
                                )}
                                {booking.medical_aid_name && (
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Medical Aid</p>
                                        <p className="text-sm font-medium text-secondary-900 mt-0.5 capitalize">{booking.medical_aid_name}</p>
                                    </div>
                                )}
                                {booking.reason_for_visit && (
                                    <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Reason for Visit</p>
                                        <p className="text-sm text-secondary-700 mt-0.5 italic">"{booking.reason_for_visit}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Signature */}
                    {booking.signature_url && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Signature</p>
                            <div
                                className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-primary-300 transition-colors"
                                onClick={() => window.open(booking.signature_url, '_blank')}
                            >
                                <img src={booking.signature_url} alt="Signature" className="w-full h-full object-contain p-2" />
                            </div>
                        </div>
                    )}

                    {/* Created at */}
                    <p className="text-xs text-gray-400">
                        Booked on {new Date(booking.created_at).toLocaleString('en-ZA')}
                    </p>
                </div>

                {/* Actions for pending */}
                {booking.status === 'pending' && (
                    <div className="px-6 pb-6 flex gap-3">
                        <button
                            disabled={acting}
                            onClick={() => handle('rejected')}
                            className="flex-1 py-3 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <XCircle className="w-4 h-4" /> Decline
                        </button>
                        <button
                            disabled={acting}
                            onClick={() => handle('approved')}
                            className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shadow-primary-200"
                        >
                            <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const Bookings = () => {
    const { user } = useAuth();
    const [bookings, setBookings]       = useState([]);
    const [total, setTotal]             = useState(0);
    const [counts, setCounts]           = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
    const [loading, setLoading]         = useState(true);
    const [refreshing, setRefreshing]   = useState(false);

    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter]     = useState('all');
    const [search, setSearch]             = useState('');
    const [page, setPage]                 = useState(1);
    const [selectedBooking, setSelectedBooking] = useState(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchBookings = useCallback(async (opts = {}) => {
        if (!user) return;
        const isRefresh = opts.refresh || false;
        isRefresh ? setRefreshing(true) : setLoading(true);

        try {
            // 1. Status counts (not filtered by date/search so totals are accurate)
            const statusQueries = ['pending', 'approved', 'rejected'].map(s =>
                supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('business_id', user.id)
                    .eq('status', s)
            );
            const [pendingRes, approvedRes, rejectedRes] = await Promise.all(statusQueries);
            const totalRes = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', user.id);

            setCounts({
                all:      totalRes.count      || 0,
                pending:  pendingRes.count    || 0,
                approved: approvedRes.count   || 0,
                rejected: rejectedRes.count   || 0,
            });

            // 2. Main filtered query
            let query = supabase
                .from('bookings')
                .select('*', { count: 'exact' })
                .eq('business_id', user.id);

            if (statusFilter !== 'all') query = query.eq('status', statusFilter);

            const range = getDateRange(dateFilter);
            if (range) {
                query = query
                    .gte('start_time', range.start.toISOString())
                    .lte('start_time', range.end.toISOString());
            }

            if (search.trim()) {
                query = query.or(
                    `customer_name.ilike.%${search.trim()}%,customer_phone.ilike.%${search.trim()}%`
                );
            }

            const currentPage = opts.page ?? page;
            const from = (currentPage - 1) * PAGE_SIZE;
            const to   = from + PAGE_SIZE - 1;

            query = query.order('created_at', { ascending: false }).range(from, to);

            const { data, count, error } = await query;
            if (error) throw error;

            setBookings(data || []);
            setTotal(count || 0);
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, statusFilter, dateFilter, search, page]);

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        setPage(1);
    }, [statusFilter, dateFilter, search]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Realtime subscription
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel(`bookings-page-${user.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'bookings',
                filter: `business_id=eq.${user.id}`
            }, () => fetchBookings({ refresh: true }))
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchBookings]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleAction = async (id, action) => {
        const { error } = await supabase
            .from('bookings')
            .update({ status: action })
            .eq('id', id);
        if (error) { alert('Error updating booking'); return; }
        try {
            await fetch(`${API_URL}/api/bookings/${id}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
        } catch (e) {
            console.error('Failed to trigger WhatsApp notification', e);
        }
        fetchBookings({ refresh: true });
    };

    // ── Pagination ────────────────────────────────────────────────────────────
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const goToPage = (p) => {
        const clamped = Math.max(1, Math.min(p, totalPages));
        setPage(clamped);
        fetchBookings({ page: clamped });
    };

    // ─────────────────────────────────────────────────────────────────────────

    const STATUS_TABS = [
        { label: 'All',      value: 'all',      count: counts.all      },
        { label: 'Pending',  value: 'pending',  count: counts.pending  },
        { label: 'Approved', value: 'approved', count: counts.approved },
        { label: 'Declined', value: 'rejected', count: counts.rejected },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900">Bookings</h1>
                    <p className="text-secondary-500 text-sm mt-0.5">
                        {counts.pending > 0
                            ? `${counts.pending} pending booking${counts.pending > 1 ? 's' : ''} need your attention`
                            : 'All caught up — no pending bookings'}
                    </p>
                </div>
                <button
                    onClick={() => fetchBookings({ refresh: true })}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-secondary-600 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total',    value: counts.all,      icon: Calendar,     bg: 'bg-blue-50',   text: 'text-blue-600'   },
                    { label: 'Pending',  value: counts.pending,  icon: Clock,        bg: 'bg-orange-50', text: 'text-orange-600' },
                    { label: 'Approved', value: counts.approved, icon: CheckCircle,  bg: 'bg-green-50',  text: 'text-green-600'  },
                    { label: 'Declined', value: counts.rejected, icon: XCircle,      bg: 'bg-red-50',    text: 'text-red-500'    },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.text}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">{stat.value}</p>
                            <p className="text-xs text-secondary-500 font-medium">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                {/* Status Tabs */}
                <div className="flex border-b border-gray-100 overflow-x-auto">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                statusFilter === tab.value
                                    ? 'border-primary-500 text-primary-700'
                                    : 'border-transparent text-secondary-500 hover:text-secondary-900 hover:border-gray-200'
                            }`}
                        >
                            {tab.label}
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                statusFilter === tab.value
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'bg-gray-100 text-gray-500'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search + Date filter row */}
                <div className="flex flex-col sm:flex-row gap-3 p-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        />
                    </div>

                    {/* Date filter */}
                    <div className="flex gap-1 p-1 bg-gray-50 rounded-xl">
                        {DATE_FILTERS.map(df => (
                            <button
                                key={df.value}
                                onClick={() => setDateFilter(df.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                                    dateFilter === df.value
                                        ? 'bg-white text-secondary-900 shadow-sm'
                                        : 'text-secondary-500 hover:text-secondary-900'
                                }`}
                            >
                                {df.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-secondary-900 font-semibold">No bookings found</p>
                        <p className="text-secondary-500 text-sm mt-1">
                            {search || statusFilter !== 'all' || dateFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Bookings will appear here once customers book via WhatsApp'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-y border-gray-100">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Appointment</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {bookings.map(booking => (
                                        <tr key={booking.id} className="hover:bg-gray-50/60 transition-colors group">
                                            {/* Customer */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                                                        {(booking.customer_name || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-secondary-900">{booking.customer_name || 'Unknown'}</p>
                                                        <p className="text-xs text-secondary-400">
                                                            {new Date(booking.created_at).toLocaleDateString('en-ZA')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Phone */}
                                            <td className="px-5 py-4 hidden sm:table-cell">
                                                <span className="font-mono text-sm text-secondary-600">{booking.customer_phone}</span>
                                            </td>

                                            {/* Appointment */}
                                            <td className="px-5 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-secondary-900">
                                                        {new Date(booking.start_time).toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </p>
                                                    <p className="text-xs text-secondary-400">
                                                        {new Date(booking.start_time).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4">
                                                <StatusBadge status={booking.status} />
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {booking.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleAction(booking.id, 'rejected')}
                                                                title="Decline"
                                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(booking.id, 'approved')}
                                                                title="Approve"
                                                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => setSelectedBooking(booking)}
                                                        title="View details"
                                                        className="p-1.5 rounded-lg text-secondary-400 hover:bg-gray-100 hover:text-secondary-900 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                                <p className="text-xs text-secondary-500">
                                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => goToPage(page - 1)}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-secondary-600" />
                                    </button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => goToPage(p)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                                    p === page
                                                        ? 'bg-primary-500 text-white shadow-sm'
                                                        : 'hover:bg-gray-100 text-secondary-600'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => goToPage(page + 1)}
                                        disabled={page === totalPages}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4 text-secondary-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {selectedBooking && (
                <BookingModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onAction={handleAction}
                />
            )}
        </div>
    );
};

export default Bookings;
