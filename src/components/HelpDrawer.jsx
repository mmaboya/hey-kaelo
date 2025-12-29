import React, { useState, useEffect } from 'react';
import { HelpCircle, X, MessageSquare, AlertTriangle, BookOpen, Camera, Copy, CheckCircle, Send, ArrowRight, Shield, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';

const HelpDrawer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('fix'); // 'fix' | 'report' | 'guides'
    const [capturedImage, setCapturedImage] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [reportDone, setReportDone] = useState(false);

    const diagnostics = {
        route: window.location.pathname,
        last_action: 'Dashboard Interaction',
        browser: navigator.userAgent.split(') ')[0] + ')',
        ts: new Date().toISOString()
    };

    const [isChatting, setIsChatting] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [ticketId, setTicketId] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const handleStartChat = () => {
        setIsChatting(true);
        if (messages.length === 0) {
            setMessages([{
                role: 'kaelo',
                text: "Sharp! 👋 I'm Kaelo. I can see you're on the dashboard. What's bothering you today?"
            }]);
        }
    };

    const handleQuickFix = async (fixType) => {
        setIsChatting(true);
        const fixMessages = {
            whatsapp: "Checking your WhatsApp connection now... 🔄",
            reset: "I'm resetting your AI conversation state to clear any confusion... 🧠"
        };

        const initialMsg = fixMessages[fixType] || "Let me look into that for you.";
        setMessages(prev => [...prev, { role: 'user', text: fixType }, { role: 'kaelo', text: initialMsg }]);

        // Trigger actual triage for the quick fix
        try {
            const response = await fetch('/api/support/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Internal Quick Fix Triggered: ${fixType}`,
                    context: { ...diagnostics, quick_fix: fixType }
                })
            });
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'kaelo', text: data.reply }]);
            setTicketId(data.ticketId);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'kaelo', text: "⚠️ Sorry, I hit a snag. Let's try again or report it." }]);
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || isSending) return;

        const userMsg = inputValue;
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsSending(true);

        try {
            const response = await fetch('/api/support/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId,
                    message: userMsg,
                    context: diagnostics
                })
            });
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'kaelo', text: data.reply }]);
            setTicketId(data.ticketId);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'kaelo', text: "I'm having a bit of trouble connecting to my support brain. Ake uzame futhi? (Try again?)" }]);
        } finally {
            setIsSending(false);
        }
    };

    const handleCapture = async () => {
        setIsCapturing(true);
        try {
            const canvas = await html2canvas(document.body, {
                useCORS: true,
                scale: 0.5,
                ignoreElements: (el) => el.classList.contains('help-drawer-overlay') || el.closest('.help-drawer-overlay')
            });
            const dataUrl = canvas.toDataURL('image/webp', 0.8);
            setCapturedImage(dataUrl);
        } catch (error) {
            console.error("Screenshot failed:", error);
        } finally {
            setIsCapturing(false);
        }
    };

    const submitReport = () => {
        setIsReporting(true);
        setTimeout(() => {
            setIsReporting(false);
            setReportDone(true);
        }, 1500);
    };

    const copyDiagnostics = () => {
        const text = JSON.stringify(diagnostics, null, 2);
        navigator.clipboard.writeText(text);
        alert('Diagnostics copied to clipboard! 📋');
    };

    return (
        <>
            {/* Help Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-secondary-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
            >
                <HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className="absolute right-full mr-3 bg-secondary-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Support Center
                </span>
            </button>

            {/* Help Drawer Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-secondary-900/20 backdrop-blur-sm z-50 flex justify-end help-drawer-overlay"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 help-drawer-overlay"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-secondary-900 rounded-lg flex items-center justify-center text-white">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <h2 className="text-lg font-bold text-secondary-900">Support Center</h2>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100">
                            {[
                                { id: 'fix', label: 'Fix It Now', icon: MessageSquare },
                                { id: 'report', label: 'Report Issue', icon: AlertTriangle },
                                { id: 'guides', label: 'Guides', icon: BookOpen }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? 'border-secondary-900 text-secondary-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                            {/* Chat Layer */}
                            {isChatting && (
                                <div className="absolute inset-0 bg-white z-10 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                                        <button onClick={() => setIsChatting(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                            <ArrowLeft className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <span className="text-sm font-bold text-secondary-900">Chat with Kaelo</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                        {messages.map((m, i) => (
                                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-secondary-900 text-white rounded-tr-none' : 'bg-gray-100 text-secondary-900 rounded-tl-none'
                                                    }`}>
                                                    {m.text}
                                                </div>
                                            </div>
                                        ))}
                                        {isSending && (
                                            <div className="flex justify-start">
                                                <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none animate-pulse text-gray-400 text-xs">
                                                    Kaelo is thinking...
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-gray-100 flex gap-2">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                            placeholder="Type message..."
                                            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={isSending}
                                            className="w-10 h-10 bg-secondary-900 text-white rounded-xl flex items-center justify-center hover:bg-secondary-800 disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'fix' && (
                                <div className="space-y-6">
                                    <div className="bg-primary-50 border border-primary-100 p-6 rounded-2xl">
                                        <h3 className="text-primary-700 font-bold mb-2">Talk to Kaelo AI</h3>
                                        <p className="text-sm text-primary-600 leading-relaxed mb-4">
                                            Kaelo is trained to debug booking issues and account settings in real-time.
                                        </p>
                                        <button
                                            onClick={handleStartChat}
                                            className="w-full bg-white border border-primary-200 py-3 rounded-xl text-sm font-bold text-primary-700 flex items-center justify-center gap-2 hover:shadow-md transition-all active:scale-[0.98]"
                                        >
                                            Start Support Chat <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quick Fixes</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            <button
                                                onClick={() => handleQuickFix('whatsapp')}
                                                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left text-sm font-bold text-secondary-900 flex items-center justify-between group"
                                            >
                                                <span>WhatsApp Messages not delivering</span>
                                                <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-secondary-900" />
                                            </button>
                                            <button
                                                onClick={() => handleQuickFix('reset')}
                                                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left text-sm font-bold text-secondary-900 flex items-center justify-between group"
                                            >
                                                <span>Reset AI Conversation State</span>
                                                <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-secondary-900" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'report' && (
                                <div className="space-y-6">
                                    {reportDone ? (
                                        <div className="py-12 text-center">
                                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <CheckCircle className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-xl font-bold text-secondary-900">Issue Reported!</h3>
                                            <p className="text-sm text-gray-500 mt-2">Kaelo is investigating. Case #SUP-{Math.floor(Math.random() * 1000)}</p>
                                            <button
                                                onClick={() => { setReportDone(false); setActiveTab('fix'); }}
                                                className="mt-8 text-primary-600 font-bold text-sm"
                                            >
                                                Back to Support Hub
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Auto-captured Context</p>
                                                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                                    <div>
                                                        <p className="text-[11px] font-bold text-secondary-500">Route</p>
                                                        <p className="text-xs text-secondary-900 truncate">{diagnostics.route}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-secondary-500">Request ID</p>
                                                        <p className="text-xs text-secondary-900 truncate">REQ-{Math.random().toString(36).substr(2, 5).toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <textarea
                                                    placeholder="What happened? (e.g. 'The signature link didn't open')"
                                                    className="w-full h-32 p-4 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                                />

                                                {!capturedImage ? (
                                                    <button
                                                        onClick={handleCapture}
                                                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-primary-500 hover:border-primary-200 transition-all group"
                                                    >
                                                        <Camera className={`w-8 h-8 mb-2 ${isCapturing ? 'animate-pulse text-primary-500' : ''}`} />
                                                        <span className="text-xs font-bold uppercase tracking-widest">{isCapturing ? 'Capturing...' : 'Capture Screenshot'}</span>
                                                    </button>
                                                ) : (
                                                    <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                                        <img src={capturedImage} alt="Capture" className="w-full h-40 object-cover" />
                                                        <button
                                                            onClick={() => setCapturedImage(null)}
                                                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="flex gap-2 pt-4">
                                                    <button
                                                        onClick={copyDiagnostics}
                                                        className="px-4 py-4 rounded-2xl border border-gray-200 text-secondary-900 hover:bg-gray-50 transition-all"
                                                        title="Copy Diagnostics"
                                                    >
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={submitReport}
                                                        disabled={isReporting}
                                                        className="flex-1 bg-secondary-900 text-white font-bold py-4 rounded-2xl hover:bg-secondary-800 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        {isReporting ? 'Sending...' : 'Submit Report'} <Send className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'guides' && (
                                <div className="space-y-4">
                                    {[
                                        { title: 'Connecting WhatsApp', time: '2 min read' },
                                        { title: 'Managing Booking Slots', time: '3 min read' },
                                        { title: 'Designing your AI Persona', time: '5 min read' },
                                        { title: 'Troubleshooting Delivery', time: '4 min read' }
                                    ].map((guide, i) => (
                                        <div key={i} className="p-4 border border-gray-100 rounded-2xl hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer group">
                                            <p className="font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">{guide.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <ClockIcon className="w-3 h-3 text-gray-400" />
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{guide.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 text-center">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                Version 1.2.0 • Running on Google Vertex AI
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const ChevronRightIcon = ({ className }) => <ArrowRight className={className} />;
const ClockIcon = ({ className }) => <BookOpen className={className} />;

export default HelpDrawer;
