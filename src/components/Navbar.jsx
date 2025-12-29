import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md py-4 shadow-sm' : 'bg-transparent py-6'}`}>
            <div className="container mx-auto px-6 flex items-center justify-between">

                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                        <span className="font-black text-xl italic">K</span>
                    </div>
                    <span className="text-2xl font-black tracking-tight text-secondary-900">
                        HeyKaelo<span className="text-primary-500">.</span>
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-10">
                    <a href="#workstyles" className="text-sm font-bold text-secondary-700 hover:text-primary-600 transition-colors uppercase tracking-wider">Features</a>
                    <a href="#how-it-works" className="text-sm font-bold text-secondary-700 hover:text-primary-600 transition-colors uppercase tracking-wider">How it works</a>
                    <a href="#pricing" className="text-sm font-bold text-secondary-700 hover:text-primary-600 transition-colors uppercase tracking-wider">Pricing</a>
                </div>

                {/* Desktop Auth */}
                <div className="hidden md:flex items-center gap-6">
                    <Link to="/login" className="text-sm font-black text-secondary-900 hover:text-primary-600 transition-colors uppercase tracking-widest">
                        Login
                    </Link>
                    <Link to="/setup" className="bg-secondary-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-500 transition-all shadow-xl hover:shadow-primary/20 flex items-center gap-2 group">
                        Sign Up
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-secondary-900"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 p-6 shadow-2xl animate-in slide-in-from-top duration-300">
                    <div className="flex flex-col gap-6">
                        <a href="#workstyles" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-secondary-900">Features</a>
                        <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-secondary-900">How it works</a>
                        <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-secondary-900">Pricing</a>
                        <hr className="border-gray-100" />
                        <Link to="/login" className="text-lg font-bold text-secondary-900">Login</Link>
                        <Link to="/setup" className="bg-primary-500 text-white p-4 rounded-xl font-bold text-center">
                            Sign Up Free
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
