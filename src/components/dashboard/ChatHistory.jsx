import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, User, Clock, ChevronRight } from 'lucide-react';

const ChatHistory = ({ businessId }) => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChat, setSelectedChat] = useState(null);

    useEffect(() => {
        if (!businessId) return;

        const fetchChats = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('conversation_states')
                .select('*')
                .eq('business_id', businessId)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching chats:', error);
            } else {
                setConversations(data || []);
            }
            setLoading(false);
        };

        fetchChats();

        // Realtime subscription
        const channel = supabase
            .channel('chat-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversation_states',
                filter: `business_id=eq.${businessId}`
            }, fetchChats)
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [businessId]);

    if (loading) return <div className="p-8 text-center text-gray-500 italic">Finding your conversations...</div>;

    if (conversations.length === 0) {
        return (
            <div className="p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No chats yet</h3>
                <p className="text-gray-500">When customers message your bot, they will appear here.</p>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
            {/* Sidebar: List of Customers */}
            <div className="lg:col-span-1 border rounded-xl overflow-hidden flex flex-col bg-white">
                <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">Recent Chats</div>
                <div className="flex-1 overflow-y-auto divide-y">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => setSelectedChat(conv)}
                            className={`w-full p-4 text-left hover:bg-orange-50 transition-colors flex items-center justify-between ${selectedChat?.id === conv.id ? 'bg-orange-100 border-l-4 border-orange-500' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-900 truncate">{conv.phone_number}</p>
                                    <p className="text-xs text-gray-500 truncate italic">
                                        {conv.metadata?.history?.[conv.metadata.history.length - 1]?.text || 'No message'}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-gray-300 ${selectedChat?.id === conv.id ? 'text-orange-500' : ''}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Body */}
            <div className="lg:col-span-2 border rounded-xl overflow-hidden flex flex-col bg-gray-50">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm">
                                    {selectedChat.phone_number.slice(-2)}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{selectedChat.phone_number}</p>
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 uppercase tracking-wider font-semibold">
                                        <Clock className="w-2.5 h-2.5" /> LIVE ON WHATSAPP
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {selectedChat.metadata?.history?.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'ai' || msg.role === 'model' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'ai' || msg.role === 'model'
                                            ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                            : 'bg-orange-600 text-white rounded-tr-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {(!selectedChat.metadata?.history || selectedChat.metadata?.history.length === 0) && (
                                <div className="text-center text-gray-400 italic py-20">No message history found for this session.</div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a customer to view their full chat history</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatHistory;
