import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Upload, ShieldCheck, Activity, ArrowRight, Zap, Clock, Truck, Pill, Users, Globe, MapPin, LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { toast } from 'sonner';

const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Activity,
  Zap,
  ShieldCheck,
  Truck,
  Users,
  MapPin,
  Pill,
  Clock
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState({
    heroTitle: 'Save Big on Your Medicines',
    heroSubtitle: 'The smartest way to buy medicines in India. Compare prices across top pharmacies and get delivered in under 60 minutes.'
  });

  const [cityStats, setCityStats] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'content', 'home'), (doc) => {
      if (doc.exists()) {
        setContent(doc.data() as any);
      }
    });

    // Fetch available cities and their stats
    const unsubCities = onSnapshot(collection(db, 'available_cities'), (citySnap) => {
      const cities = citySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      
      const unsubVehicles = onSnapshot(collection(db, 'vehicle_owners'), (snap) => {
        const owners = snap.docs.map(doc => doc.data());
        const stats = cities.map((city: any) => ({
          ...city,
          city: city.name, // For backward compatibility in rendering
          count: owners.filter(o => o.city?.toLowerCase().includes(city.name.toLowerCase())).length.toString() + '+'
        }));
        setCityStats(stats);
      });

      return () => unsubVehicles();
    });

    return () => {
      unsub();
      unsubCities();
    };
  }, []);

  return (
    <div className="pt-20 pb-12 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-32 text-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-full text-xs font-black uppercase tracking-[0.25em] mb-12 border border-indigo-100 dark:border-indigo-800/50 shadow-sm shadow-indigo-500/5"
        >
          <Activity className="w-4 h-4 animate-pulse" />
          <span>AI-Powered Price Comparison</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] font-black text-slate-900 dark:text-white mb-8 sm:mb-12 leading-[0.85] tracking-tight sm:tracking-[-0.04em]"
        >
          {content.heroTitle.split('Your Medicines')[0]} <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-accent-500 pb-2">
            {content.heroTitle.includes('Your Medicines') ? 'Your Medicines' : content.heroTitle.split(' ').slice(-2).join(' ')}
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-slate-600 dark:text-slate-400 mb-16 sm:mb-24 max-w-4xl mx-auto leading-relaxed font-medium px-4"
        >
          {content.heroSubtitle}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 max-w-2xl mx-auto mb-24 px-4"
        >
          <Link 
            to="/upload" 
            className="w-full sm:w-auto group bg-indigo-600 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-2xl sm:rounded-[2rem] font-black text-base sm:text-lg flex items-center justify-center space-x-4 hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/30 active:scale-95 hover:-translate-y-1"
          >
            <Upload className="w-6 h-6 sm:w-7 h-7" />
            <span>Scan Prescription</span>
            <ArrowRight className="w-5 h-5 sm:w-6 h-6 opacity-50 group-hover:translate-x-2 transition-transform" />
          </Link>
          
          <Link 
            to="/search" 
            className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 px-8 sm:px-12 py-5 sm:py-6 rounded-2xl sm:rounded-[2rem] font-black text-base sm:text-lg flex items-center justify-center space-x-4 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all active:scale-95 hover:-translate-y-1 shadow-xl shadow-black/5"
          >
            <Search className="w-6 h-6 sm:w-7 h-7 text-indigo-600" />
            <span>Search Manually</span>
          </Link>
        </motion.div>

        {/* Express Delivery Section - Simple Playful App Redesign */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-indigo-50/50 dark:bg-indigo-500/5 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-16 border border-indigo-100/50 dark:border-indigo-500/10 relative overflow-hidden group"
          >
            {/* Playful Background Shapes */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -right-20 w-96 h-96 bg-white dark:bg-slate-800 rounded-full blur-3xl opacity-50" 
              />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
              
              {/* Left: Content & Form */}
              <div className="flex-1 space-y-10 text-center lg:text-left">
                <div className="space-y-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    animate={{ 
                      y: [0, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="inline-flex items-center space-x-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-indigo-100 dark:border-indigo-800"
                  >
                    <Zap className="w-4 h-4 text-indigo-600 animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Fastest Delivery</span>
                  </motion.div>

                  <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                    Medicines at your <br />
                    <span className="text-indigo-600">Door in 60m.</span>
                  </h2>
                </div>

                <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-md">
                  Simple, fast, and reliable. We deliver your essential medicines within the hour, guaranteed.
                </p>

                <Link 
                  to="/express-delivery"
                  className="inline-flex bg-indigo-600 text-white px-12 py-6 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 items-center justify-center space-x-3 group/btn"
                >
                  <span>Order Now</span>
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </Link>

                <div className="flex flex-wrap justify-center lg:justify-start gap-8 pt-4">
                  {[
                    { icon: Clock, text: '60 Min', color: 'text-amber-500' },
                    { icon: ShieldCheck, text: 'Verified', color: 'text-emerald-500' },
                    { icon: Activity, text: 'Live Tracking', color: 'text-indigo-500' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <item.icon className={cn("w-4 h-4", item.color)} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Playful Graphic Illustration */}
              <div className="flex-1 relative w-full">
                <div className="relative w-full aspect-square max-w-[300px] sm:max-w-[400px] mx-auto">
                  {/* Animated Scooter/Truck Graphic */}
                  <motion.div
                    animate={{ 
                      y: [0, -20, 0],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 w-full h-full bg-white dark:bg-slate-800 rounded-[4rem] flex items-center justify-center overflow-hidden border border-indigo-100 dark:border-indigo-500/20 shadow-xl"
                  >
                    <Truck className="w-40 h-40 text-indigo-600 dark:text-indigo-400" />
                    
                    {/* Speed Lines */}
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          x: [-100, 400],
                          opacity: [0, 1, 0]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity, 
                          delay: i * 0.3,
                          ease: "linear"
                        }}
                        className="absolute h-1 bg-indigo-100 dark:bg-indigo-500/30 rounded-full"
                        style={{ 
                          top: `${20 + (i * 15)}%`,
                          width: `${60 + (i * 20)}px`,
                          left: '-100px'
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
              </div>

            </div>
          </motion.div>
        </section>

        {/* Vehicle Owners Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-20 border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)] relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-800">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Local Network</span>
                </div>
                
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  Connect with <br />
                  <span className="text-emerald-600">Local Vehicle Owners.</span>
                </h2>
                
                <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-md">
                  Need a reliable transport for your healthcare needs? Connect with registered vehicle owners in your city for safe and timely assistance.
                </p>

                <div className="space-y-4 max-w-md">
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                    <button 
                      onClick={() => navigate('/vehicle-owners')}
                      className="w-full sm:w-auto bg-emerald-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-3"
                    >
                      <Search className="w-4 h-4" />
                      <span>Find Owners</span>
                    </button>
                    
                    <Link 
                      to="/register-vehicle"
                      className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:border-emerald-500 transition-all flex items-center justify-center space-x-3"
                    >
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Register Vehicle</span>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-4 sm:gap-6">
                {cityStats.map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -10 }}
                    className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-700 text-center"
                  >
                    <div className="w-8 h-8 sm:w-12 h-12 bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm">
                      {(() => {
                        const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] || Globe;
                        return <Icon className="w-4 h-4 sm:w-6 h-6 text-emerald-600" />;
                      })()}
                    </div>
                    <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{item.count}</p>
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">{item.city}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Decorative Background Elements */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/4 right-0 translate-x-1/2 w-[800px] h-[800px] bg-accent-500/5 rounded-full blur-[150px] pointer-events-none" />
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {[
            {
              icon: ShieldCheck,
              title: "Verified Platforms",
              desc: "We only compare prices from licensed and trusted online pharmacies like Tata 1mg, Apollo, and Netmeds.",
              color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
              border: "border-indigo-100 dark:border-indigo-500/20",
              accent: "indigo"
            },
            {
              icon: Activity,
              title: "Real-time Tracking",
              desc: "Get the latest prices, exclusive offers, and stock availability instantly using our advanced AI engine.",
              color: "bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400",
              border: "border-accent-100 dark:border-accent-500/20",
              accent: "accent"
            }
          ].map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className={cn(
                "bg-white dark:bg-slate-900 p-12 rounded-[3rem] border shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden",
                feature.border,
                feature.accent === 'indigo' ? 'hover:shadow-indigo-500/10' : 'hover:shadow-accent-500/10'
              )}
            >
              <div className={cn("w-16 h-16 md:w-20 h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-8 md:mb-10 group-hover:scale-110 transition-transform duration-500 shadow-sm", feature.color)}>
                <feature.icon className="w-8 h-8 md:w-10 h-10" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 md:mb-6 tracking-tight">{feature.title}</h3>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
              
              <div className={cn(
                "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500",
                feature.accent === 'indigo' ? 'bg-indigo-500' : 'bg-accent-500'
              )} />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
