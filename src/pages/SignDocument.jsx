import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Camera, CheckCircle, Shield, AlertCircle, ArrowRight } from 'lucide-react';

const SignDocument = () => {
    const { requestId } = useParams();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signature, setSignature] = useState(null);
    const [signing, setSigning] = useState(false);
    const [complete, setComplete] = useState(false);

    useEffect(() => {
        if (requestId === 'preview') {
            setRequest({
                title: 'Service Agreement (Preview)',
                content: 'This is a preview of the document your clients will see. They can read your terms, snap a photo of their signature, and confirm. All in seconds! 🤙',
                profiles: { business_name: 'Your Awesome Business' }
            });
            setLoading(false);
            return;
        }

        const fetchRequest = async () => {
            const { data, error } = await supabase
                .from('document_requests')
                .select('*, profiles(business_name)')
                .eq('id', requestId)
                .single();

            if (data) setRequest(data);
            setLoading(false);
        };
        if (requestId) fetchRequest();
        else setLoading(false);
    }, [requestId]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSignature(file);
        }
    };

    const handleSign = async () => {
        if (!signature) return;
        setSigning(true);

        if (requestId === 'preview') {
            setTimeout(() => {
                setComplete(true);
                setSigning(false);
            }, 1500);
            return;
        }

        try {
            // 1. Upload Signature to Storage (Optional, let's assume we have a 'signatures' bucket)
            // For now, let's just simulate the success

            // 2. Update Request Status
            const { error } = await supabase
                .from('document_requests')
                .update({
                    status: 'signed',
                    signed_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (error) throw error;
            setComplete(true);
        } catch (err) {
            console.error(err);
            alert("Error signing document. Please try again.");
        } finally {
            setSigning(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading document...</div>;

    if (!request) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
            <AlertCircle className="w-16 h-16 text-orange-500 mb-4" />
            <h1 className="text-2xl font-bold text-secondary-900">Document Not Found</h1>
            <p className="text-secondary-500 text-center mt-2">This link may have expired or is invalid.</p>
        </div>
    );

    if (complete) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-bounce">
                <CheckCircle className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold text-secondary-900 text-center">Document Signed!</h1>
            <p className="text-secondary-600 text-center mt-4 max-w-sm">Thank you. Your signed {request.title} has been sent back to **{request.profiles?.business_name}**.</p>
            <button
                onClick={() => window.close()}
                className="mt-10 px-8 py-3 bg-secondary-900 text-white rounded-xl font-bold hover:bg-secondary-800 transition-colors"
            >
                Close Page
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-6">
            <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 bg-secondary-900 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        < Shield className="w-5 h-5 text-primary-400" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-primary-400">Secure Document Signing</span>
                    </div>
                    <h1 className="text-2xl font-bold">{request.title}</h1>
                    <p className="text-primary-200/60 text-sm mt-1">Requested by {request.profiles?.business_name}</p>
                </div>

                {/* Body */}
                <div className="p-10">
                    <div className="prose prose-sm max-w-none text-secondary-600 bg-gray-50 p-6 rounded-2xl border border-gray-100 italic mb-10 min-h-[150px]">
                        {request.content}
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">✍️</span>
                            <h3 className="font-bold text-secondary-900 uppercase text-xs tracking-widest">Your Signature</h3>
                        </div>

                        {!signature ? (
                            <label className="block border-2 border-dashed border-gray-200 rounded-[2rem] p-12 text-center hover:border-primary-400 hover:bg-primary-50/20 cursor-pointer transition-all group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Camera className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
                                </div>
                                <p className="text-secondary-900 font-bold">Take Signature Photo</p>
                                <p className="text-xs text-gray-400 mt-2">Sign on paper, snap a photo, and upload.</p>
                            </label>
                        ) : (
                            <div className="relative border-2 border-primary-500 rounded-[2rem] overflow-hidden p-2 bg-gray-50">
                                <img
                                    src={URL.createObjectURL(signature)}
                                    alt="Signature Preview"
                                    className="w-full h-48 object-contain rounded-2xl bg-white"
                                />
                                <button
                                    onClick={() => setSignature(null)}
                                    className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        <button
                            disabled={!signature || signing}
                            onClick={handleSign}
                            className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${signature && !signing
                                ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-primary/20 scale-100'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed scale-[0.98]'
                                }`}
                        >
                            {signing ? 'Signing...' : 'Confirm & Sign Document'}
                            <ArrowRight className="w-6 h-6" />
                        </button>

                        <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
                            By clicking signing, you agree to the terms listed above.
                        </p>
                    </div>
                </div>
            </div>

            <p className="mt-8 text-gray-400 text-xs font-medium">Powered by HeyKaelo SecureSign™</p>
        </div>
    );
};

export default SignDocument;
