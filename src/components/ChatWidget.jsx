import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Heita! 👋 I\'m Kaelo. How can I help you automate your business today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            // Determine API URL (Local vs Prod)
            const apiUrl = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL}/api/chat`
                : (import.meta.env.PROD ? '/api/chat' : 'http://localhost:3001/api/chat');

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${res.status}`);
            }

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        } catch (error) {
            console.error("Chat Error:", error);
            const errorMsg = error.message.includes("Failed to fetch")
                ? "Eish, connection problems. Try again just now! 🔌"
                : "Eish, I'm having a bit of trouble right now. Try again! 🛑";
            setMessages(prev => [...prev, { role: 'ai', text: errorMsg }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[350px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300 h-[500px]">

                    {/* Header */}
                    <div className="bg-[#075E54] p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-[#075E54] font-bold text-xs">
                                HK
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Chat with Kaelo</h3>
                                <p className="text-xs opacity-80 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#E5DDD5]">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 text-sm shadow-sm ${msg.role === 'user'
                                    ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none'
                                    : 'bg-white text-gray-800 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-3 bg-gray-50 border-t flex gap-2">
                        <input
                            type="text"
                            placeholder="Ask me anything..."
                            className="flex-1 px-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#075E54]"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="w-10 h-10 bg-[#075E54] text-white rounded-full flex items-center justify-center hover:bg-[#054c44] disabled:opacity-50 transition-colors"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group flex items-center gap-3 bg-[#075E54] text-white px-5 py-4 rounded-full shadow-lg hover:bg-[#054c44] transition-all hover:scale-105 active:scale-95"
                >
                    <span className="font-medium pr-1 hidden group-hover:block transition-all">Chat with us</span>
                    <MessageCircle className="w-6 h-6" />
                </button>
            )}
        </div>
    );
};

export default ChatWidget;
