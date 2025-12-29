import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Send, CheckCircle, Clock, Plus, Trash2, ExternalLink, Copy, Search } from 'lucide-react';

const DocumentRepository = ({ businessId }) => {
    const [templates, setTemplates] = useState([
        { id: 1, title: 'POPI Act Consent', content: 'I hereby consent to the processing of my personal data...' },
        { id: 2, title: 'Service Agreement', content: 'This agreement outlines the terms of service provided...' }
    ]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'templates'
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!businessId) return;
        fetchRequests();
    }, [businessId]);

    const fetchRequests = async () => {
        setLoading(true);
        // Fallback: Using a hypothetical 'document_requests' table
        // If it doesn't exist, we'll show an empty state with a "Run SQL" prompt
        const { data, error } = await supabase
            .from('document_requests')
            .select('*, customers(name, phone)')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (!error) setRequests(data || []);
        setLoading(false);
    };

    const sendDocument = async (template, customerId) => {
        // Logic to create a request and get a link
        alert(`Request created for ${template.title}. Link copied to clipboard!`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-secondary-900">Document Repository</h2>
                    <p className="text-secondary-500 text-sm">Manage agreements, consents, and signatures.</p>
                </div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-white shadow-sm text-secondary-900' : 'text-secondary-500'}`}
                    >
                        Sent & Signed
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'templates' ? 'bg-white shadow-sm text-secondary-900' : 'text-secondary-500'}`}
                    >
                        Templates
                    </button>
                </div>
            </div>

            {activeTab === 'requests' ? (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <div className="relative w-64">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search client or doc..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="bg-secondary-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-500 transition-colors">
                            <Plus className="w-4 h-4" /> New Request
                        </button>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {requests.length > 0 ? requests.map((req) => (
                            <div key={req.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${req.status === 'signed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-secondary-900">{req.title}</p>
                                        <p className="text-sm text-secondary-500">Client: {req.customers?.name || 'Unknown'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest ${req.status === 'signed' ? 'text-green-600' : 'text-orange-500'}`}>
                                            {req.status === 'signed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                            {req.status}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {req.status === 'signed' ? (
                                            <button className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-gray-400 hover:text-secondary-900 transition-all">
                                                <ExternalLink className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <button className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-gray-400 hover:text-primary-600 transition-all">
                                                <Copy className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all rounded-lg">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-20 text-center text-gray-400 flex flex-col items-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <FileText className="w-10 h-10 opacity-20" />
                                </div>
                                <h3 className="text-lg font-bold text-secondary-900">No documents sent yet</h3>
                                <p className="mt-2 text-sm max-w-xs mx-auto">Click "New Request" to send an agreement or consent form to a client via WhatsApp.</p>

                                <div className="mt-10 p-4 bg-primary-50 border border-primary-100 rounded-2xl text-left max-w-md">
                                    <p className="text-xs font-black text-primary-700 uppercase tracking-widest mb-2">Beta Setup Required</p>
                                    <p className="text-xs text-primary-600 leading-relaxed">To enable the full Document Repository database, please run the SQL migration provided in your project documentation. For now, you can view the UI features here.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((tpl) => (
                        <div key={tpl.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 mb-4">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-secondary-900 mb-2">{tpl.title}</h3>
                            <p className="text-sm text-secondary-500 flex-1 line-clamp-3 mb-6 italic">"{tpl.content}"</p>
                            <div className="flex gap-2">
                                <button className="flex-1 bg-secondary-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-primary-500 transition-colors flex items-center justify-center gap-2">
                                    <Send className="w-4 h-4" /> Use
                                </button>
                                <button className="p-3 bg-gray-50 text-gray-400 hover:text-secondary-900 rounded-xl transition-colors font-bold">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button className="border-2 border-dashed border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center text-gray-300 hover:text-primary-500 hover:border-primary-200 transition-all group">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-100 group-hover:border-primary-200 flex items-center justify-center mb-4 transition-all">
                            <Plus className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-sm uppercase tracking-widest">Add Template</p>
                    </button>
                </div>
            )}
        </div>
    );
};

export default DocumentRepository;
