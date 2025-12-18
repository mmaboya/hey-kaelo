import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';

const ChatSimulator = () => {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hi! I am HeyKaelo. How can I help you book an appointment?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const res = await fetch(`${API_URL}/api/simulate-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, sessionId: 'dashboard-sim' })
            });
            const data = await res.json();

            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to server. Is it running?' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h3 className="font-bold text-secondary-900">Live AI Simulator</h3>
                </div>
                <span className="text-xs text-secondary-400 bg-white px-2 py-1 rounded border border-gray-100">mocking +27 82 000 0000</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dots-pattern">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-primary-600" />
                            </div>
                        )}

                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                            ? 'bg-primary-500 text-white rounded-tr-none'
                            : 'bg-gray-100 text-secondary-800 rounded-tl-none'
                            }`}>
                            {msg.text}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-secondary-600" />
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none flex items-center">
                            <Loader2 className="w-4 h-4 animate-spin text-secondary-400" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-gray-50 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 h-10 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-sans"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};

export default ChatSimulator;
