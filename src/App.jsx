import React from 'react';
import Hero from './components/Hero';
import ProblemSection from './components/ProblemSection';
import HowItWorks from './components/HowItWorks';
import FeaturesSection from './components/FeaturesSection';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ProfileSettings from './components/dashboard/ProfileSettings';
import Clients from './pages/Clients';

// Marketing Website Layout
const MarketingSite = () => (
  <div className="min-h-screen bg-white">
    <main>
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <FeaturesSection />
    </main>
  </div>
);

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
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

          {/* Protected Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<div className="p-4">Bookings Page (Coming Soon)</div>} />
            <Route path="clients" element={<Clients />} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
