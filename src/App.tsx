import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { Navbar } from './components/Navbar';
import { TrafficTracker } from './components/TrafficTracker';
import { WhatsAppFloat } from './components/WhatsAppFloat';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Search } from './pages/Search';
import { Upload } from './pages/Upload';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import VehicleOwners from './pages/VehicleOwners';
import RegisterVehicle from './pages/RegisterVehicle';
import { ExpressDelivery } from './pages/ExpressDelivery';
import { Cart } from './pages/Cart';
import { Loader2, Pill, Instagram, Linkedin, Twitter, Facebook } from 'lucide-react';

import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { About } from './pages/About';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white dark:bg-[#0F172A]">
      <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  
  if (adminOnly && user.email !== 'amarjeetbth2@gmail.com') {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default function App() {
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    linkedin: '',
    twitter: '',
    facebook: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'social'), (doc) => {
      if (doc.exists()) {
        setSocialLinks(doc.data().socialLinks || { instagram: '', linkedin: '', twitter: '', facebook: '' });
      }
    });
    return () => unsub();
  }, []);

  return (
    <ThemeProvider>
      <Toaster position="top-center" expand={true} richColors closeButton />
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-mesh text-gray-900 dark:text-white font-sans selection:bg-rose-100 selection:text-rose-900 transition-colors">
            <Navbar />
            <TrafficTracker />
            <WhatsAppFloat />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/search" element={<Search />} />
                <Route path="/upload" element={<Upload />} />
                <Route 
                  path="/dashboard" 
                  element={<Dashboard />} 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute adminOnly>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/cart" element={<Cart />} />
                <Route path="/express-delivery" element={<ExpressDelivery />} />
                <Route path="/vehicle-owners" element={<VehicleOwners />} />
                <Route path="/register-vehicle" element={<RegisterVehicle />} />
              </Routes>
            </main>
            
            <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/50 py-20">
              <div className="max-w-7xl mx-auto px-6 text-center">
                <div className="flex items-center justify-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <Pill className="text-white w-5 h-5" />
                  </div>
                  <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">QuickPill</span>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium max-w-md mx-auto mb-10">
                  Empowering patients with professional healthcare price transparency and smart prescription analysis.
                </p>
                
                <div className="flex items-center justify-center space-x-6 mb-12">
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:scale-110 transition-all duration-300 border border-slate-100 dark:border-slate-800 shadow-sm">
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition-all duration-300 border border-slate-100 dark:border-slate-800 shadow-sm">
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:scale-110 transition-all duration-300 border border-slate-100 dark:border-slate-800 shadow-sm">
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-700 hover:scale-110 transition-all duration-300 border border-slate-100 dark:border-slate-800 shadow-sm">
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <p className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-[0.5em] mb-4">
                    QuickPill
                  </p>
                  <p className="text-slate-300 dark:text-slate-700 text-[10px] font-bold uppercase tracking-widest">
                    © 2026 QuickPill. All rights reserved.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}
