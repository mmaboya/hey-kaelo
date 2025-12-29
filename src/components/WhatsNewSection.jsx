import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Zap, Combine, TrendingUp } from 'lucide-react';

const WhatsNewSection = () => {
    const updates = [
        {
            icon: <Combine className="w-6 h-6 text-orange-500" />,
            title: "Introducing the Hybrid Flow",
            description: "Do you have a shop but also do house calls? HeyKaelo now handles both effortlessly. It knows when to check your calendar and when to ask for a job photo.",
            badge: "Big Update"
        },
        {
            icon: <TrendingUp className="w-6 h-6 text-green-500" />,
            title: "The Growth Plan",
            description: "We've renamed our Professional tier to the 'Growth Plan'. It's the same power, now with a name that fits your ambition—no matter your industry.",
            badge: "Pricing"
        },
        {
            icon: <Zap className="w-6 h-6 text-blue-500" />,
            title: "Smart Intent Detection",
            description: "HeyKaelo's AI brain is now sharper. It detects if a customer needs a quick quote or a formal booking and adjusts its tone and requirements automatically.",
            badge: "AI"
        }
    ];

    return (
        <section className="py-24 bg-secondary-900 text-white overflow-hidden relative">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-primary-400 text-xs font-bold uppercase tracking-wider mb-4 border border-white/5">
                            <Sparkles className="w-3 h-3" />
                            <span>What's New in HeyKaelo</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
                            Built for how you <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-orange-400">actually work.</span>
                        </h2>
                        <p className="text-lg text-white/90 leading-relaxed shadow-sm">
                            We’ve moved away from rigid labels. Whether you work from a studio, on the move, or both—HeyKaelo now adapts to your unique workflow seamlessly.
                        </p>
                    </div>
                    <div>
                        <Link to="/setup" className="group flex items-center gap-3 px-8 py-4 bg-primary text-secondary-900 font-bold rounded-2xl hover:bg-white transition-all shadow-xl hover:scale-105 active:scale-95">
                            Start My Trial
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Updates Grid */}
                <div className="grid gap-8 lg:grid-cols-3">
                    {updates.map((update, index) => (
                        <div
                            key={index}
                            className="p-10 rounded-[2.5rem] bg-white/10 backdrop-blur-md border border-white/20 hover:border-primary/50 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                {update.icon}
                            </div>
                            <div className="flex justify-between items-start mb-8">
                                <div className="p-4 rounded-2xl bg-primary/20 text-primary-400 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    {update.icon}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary-300 py-1.5 px-3 rounded-full bg-primary/10 border border-primary/20">
                                    {update.badge}
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-primary-300 transition-colors">
                                {update.title}
                            </h3>
                            <p className="text-gray-200 leading-relaxed text-base">
                                {update.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Bottom Call to Action */}
                <div className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-primary-600 to-primary-800 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                    <div className="text-center md:text-left">
                        <h4 className="text-2xl font-bold text-white mb-2">Ready to try the Hybrid Flow?</h4>
                        <p className="text-primary-100 italic text-sm">Update your workstyle in settings and watch HeyKaelo adapt.</p>
                    </div>
                    <Link to="/setup" className="px-10 py-4 bg-secondary-900 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl">
                        Switch to Hybrid
                    </Link>
                </div>

            </div>
        </section>
    );
};

export default WhatsNewSection;
