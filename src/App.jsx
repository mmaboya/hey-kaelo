import React from 'react';
import Hero from './components/Hero';
import ProblemSection from './components/ProblemSection';
import HowItWorks from './components/HowItWorks';
import FeaturesSection from './components/FeaturesSection';
import PricingSection from './components/PricingSection';
import ChatWidget from './components/ChatWidget';
import WhatsNewSection from './components/WhatsNewSection';
import WorkstyleGuide from './components/WorkstyleGuide';
import Navbar from './components/Navbar';
import HelpDrawer from './components/HelpDrawer';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ProfileSettings from './components/dashboard/ProfileSettings';
import Clients from './pages/Clients';
import SignDocument from './pages/SignDocument';
import DocumentRepository from './components/dashboard/DocumentRepository';

// Marketing Website Layout
const MarketingSite = () => {
  const [viewMode, setViewMode] = React.useState('business'); // 'business' | 'customer'

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero viewMode={viewMode} setViewMode={setViewMode} />
        <ProblemSection />
        <WorkstyleGuide />
        <WhatsNewSection />
        <HowItWorks />
        <FeaturesSection />
        <PricingSection viewMode={viewMode} />
      </main>
      <ChatWidget />
    </div>
  );
};

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Setup from './pages/Setup';
import { Navigate } from 'react-router-dom';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Marketing Site */}
          <Route path="/" element={<MarketingSite />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/sign/:requestId" element={<SignDocument />} />

          {/* Protected Onboarding */}
          <Route path="/setup" element={
            <ProtectedRoute>
              <Setup />
            </ProtectedRoute>
          } />

          {/* Protected Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<div className="p-4">Bookings Page (Coming Soon)</div>} />
            <Route path="clients" element={<Clients />} />
            <Route path="documents" element={<ProtectedRoute><div className="p-8"><DocumentRepository businessId={useAuth().user?.id} /></div></ProtectedRoute>} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>
        </Routes>
        <HelpDrawer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
