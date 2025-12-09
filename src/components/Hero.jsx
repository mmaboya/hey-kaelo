import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Calendar, CheckCircle, MessageSquare, Clock } from 'lucide-react';

const Hero = () => {
    return (
        <section className="relative w-full overflow-hidden bg-white pt-20 pb-12 lg:pt-32 lg:pb-20">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">

                    {/* Left Column: Copy */}
                    <div className="flex flex-col justify-center space-y-8 max-w-2xl">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-5xl xl:text-6xl text-balance">
                                A simple booking link you can share on WhatsApp.
                            </h1>
                            <p className="text-lg text-secondary-600 sm:text-xl max-w-lg leading-relaxed">
                                HeyKaelo gives small businesses a clean booking link, automated reminders, and a simple client file – so you don’t need a secretary to look professional.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/login" className="inline-flex items-center justify-center h-14 px-8 rounded-pill bg-primary-500 text-white font-medium text-lg transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-soft">
                                Get started – it’s free to try
                            </Link>
                            <a
                                href="https://wa.me/14155238886?text=Hi%20HeyKaelo,%20I%20need%20an%20appointment"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-14 px-8 rounded-pill text-primary-600 font-medium text-lg transition-colors hover:bg-neutral-beige border border-transparent hover:border-primary-200 gap-2"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                                    <MessageSquare className="w-4 h-4 fill-current" />
                                </div>
                                Try Live Demo
                            </a>
                        </div>

                        <div className="pt-4 flex items-center gap-6 text-sm text-secondary-500">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-primary-500" />
                                <span>No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-primary-500" />
                                <span>Works on WhatsApp</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Visual */}
                    <div className="relative mx-auto w-full max-w-[360px] lg:max-w-[420px]">
                        {/* Background Blob */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-gradient-to-tr from-primary-100/40 via-neutral-beige/60 to-transparent rounded-full blur-3xl -z-10" />

                        {/* Phone Frame */}
                        <div className="relative bg-secondary-900 rounded-[2.5rem] border-[8px] border-secondary-900 shadow-2xl overflow-hidden aspect-[9/19]">
                            {/* Dynamic Island / Notch */}
                            <div className="absolute top-0 inset-x-0 h-6 bg-secondary-900 z-20 flex justify-center">
                                <div className="w-32 h-4 bg-black rounded-b-xl" />
                            </div>

                            {/* Screen Content */}
                            <div className="h-full bg-[#E5DDD5] flex flex-col font-sans">

                                {/* Header */}
                                <div className="bg-[#075E54] text-white p-4 pt-8 flex items-center gap-3 shadow-sm">
                                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs">HK</div>
                                    <div>
                                        <div className="font-semibold text-sm">HeyKaelo Assistant</div>
                                        <div className="text-[10px] opacity-80">Business Account</div>
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div className="flex-1 p-4 space-y-4 overflow-hidden relative" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', opacity: 0.9 }}>
                                    {/* Message 1 (Bot) */}
                                    <div className="flex justify-start">
                                        <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm max-w-[85%] text-sm text-secondary-800">
                                            <p>Hi! 👋 Welcome to Classic Cuts. How can I help you today?</p>
                                            <span className="text-[10px] text-secondary-400 mt-1 block text-right">10:23 AM</span>
                                        </div>
                                    </div>

                                    {/* Message 2 (User) */}
                                    <div className="flex justify-end">
                                        <div className="bg-[#DCF8C6] rounded-lg rounded-tr-none p-3 shadow-sm max-w-[85%] text-sm text-secondary-800">
                                            <p>I need a haircut for tomorrow around 10am.</p>
                                            <span className="text-[10px] text-secondary-500 mt-1 block text-right">10:24 AM</span>
                                        </div>
                                    </div>

                                    {/* Message 3 (Bot with Options) */}
                                    <div className="flex justify-start">
                                        <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm max-w-[85%] text-sm text-secondary-800">
                                            <p className="mb-2">We have these slots available tomorrow:</p>
                                            <div className="space-y-2">
                                                <div className="p-2 border border-secondary-100 rounded bg-secondary-50 text-xs flex justify-between items-center cursor-pointer hover:bg-neutral-beige transition-colors">
                                                    <span className="font-medium">10:00 AM - Haircut</span>
                                                    <span className="text-primary-600 font-bold">R 250</span>
                                                </div>
                                                <div className="p-2 border border-secondary-100 rounded bg-secondary-50 text-xs flex justify-between items-center cursor-pointer hover:bg-neutral-beige transition-colors">
                                                    <span className="font-medium">11:30 AM - Haircut</span>
                                                    <span className="text-primary-600 font-bold">R 250</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-secondary-400 mt-1 block text-right">10:24 AM</span>
                                        </div>
                                    </div>

                                </div>

                                {/* Input Area (Mock) */}
                                <div className="p-2 bg-[#F0F0F0] flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-secondary-300/50" />
                                    <div className="flex-1 h-8 rounded-full bg-white shadow-sm" />
                                    <div className="w-8 h-8 rounded-full bg-primary-500/80" />
                                </div>
                            </div>

                            {/* Floating Notification Card */}
                            <div className="absolute bottom-24 -left-12 bg-white p-4 rounded-xl shadow-soft border border-secondary-50 w-64 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 fill-mode-forwards opacity-0 z-30">
                                <div className="flex items-start gap-3">
                                    <div className="bg-primary-100 p-2 rounded-full text-primary-600 mt-1">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-secondary-900">Booking Confirmed!</p>
                                        <p className="text-xs text-secondary-500 mt-0.5">Classic Cuts • Tomorrow, 10:00 AM</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Hero;
