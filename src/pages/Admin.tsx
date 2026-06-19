import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, getDocs, limit, updateDoc, doc, onSnapshot, setDoc, deleteDoc, getCountFromServer, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { TrafficLog, UserProfile } from '../types';
import { Activity, Users, Globe, Clock, BarChart3, Shield, User as UserIcon, TrendingUp, Instagram, Linkedin, Twitter, Facebook, Settings as SettingsIcon, Save, Layout, FileText, Edit3, Truck, MapPin, Trash2, Search, X, Plus, Zap, ShieldCheck, Pill, Upload, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<TrafficLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [todayVisits, setTodayVisits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'traffic' | 'users' | 'settings' | 'content' | 'vehicles' | 'cities' | 'payment'>('traffic');
  const [paymentSettings, setPaymentSettings] = useState({
    upiId: 'a7992269620@axl',
    merchantName: 'HealthSave',
    qrImageBase64: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [cityForm, setCityForm] = useState({ name: '', icon: 'Globe', order: 0 });
  const [isAddingCity, setIsAddingCity] = useState(false);

  useEffect(() => {
    const isAdmin = auth.currentUser?.email === 'amarjeetbth2@gmail.com' || localStorage.getItem('isAdminAuthenticated') === 'true';
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/login?admin=true');
    }
  }, [navigate]);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', email: '' });

  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [vehicleEditForm, setVehicleEditForm] = useState({ 
    name: '', 
    city: '', 
    pincode: '', 
    vehicleType: '', 
    vehicleNumber: '',
    rentPrice: '',
    phone: '',
    whatsapp: ''
  });

  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    linkedin: '',
    twitter: '',
    facebook: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [siteContent, setSiteContent] = useState({
    home: {
      heroTitle: 'Professional Healthcare Price Transparency',
      heroSubtitle: 'Empowering patients with smart prescription analysis and real-time pharmacy price comparison.'
    },
    about: {
      mission: 'Our mission is to make healthcare affordable and accessible by providing transparent pricing information.',
      vision: 'We envision a world where no patient overpays for essential medicines due to lack of information.'
    }
  });
  const [savingContent, setSavingContent] = useState(false);

  useEffect(() => {
    const trafficPath = 'traffic';
    const usersPath = 'users';
    const settingsPath = 'settings';
    const contentPath = 'content';
    const vehiclesPath = 'vehicle_owners';
    const citiesPath = 'available_cities';

    const trafficQ = query(collection(db, trafficPath), orderBy('timestamp', 'desc'), limit(100));
    const usersQ = query(collection(db, usersPath), orderBy('createdAt', 'desc'));
    const vehiclesQ = query(collection(db, vehiclesPath), orderBy('createdAt', 'desc'));
    const citiesQ = query(collection(db, citiesPath), orderBy('order', 'asc'));

    // Real-time traffic
    const unsubTraffic = onSnapshot(trafficQ, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, trafficPath));

    // Real-time users
    const unsubUsers = onSnapshot(usersQ, (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, usersPath));

    // Real-time vehicles
    const unsubVehicles = onSnapshot(vehiclesQ, (snap) => {
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, vehiclesPath));

    // Real-time cities
    const unsubCities = onSnapshot(citiesQ, (snap) => {
      setCities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, citiesPath));

    // Get real traffic stats from client-side Firestore secure queries
    const fetchTrafficStats = async () => {
      try {
        const trafficColl = collection(db, 'traffic');
        
        // Total visits (docs count)
        const totalSnapshot = await getCountFromServer(trafficColl);
        setTotalVisits(totalSnapshot.data().count);

        // Today's visits (docs count from start of today client timezone)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySnapshot = await getCountFromServer(query(trafficColl, where('timestamp', '>=', today)));
        setTodayVisits(todaySnapshot.data().count);
      } catch (err) {
        console.error("Error fetching traffic stats from Firestore directly:", err);
        setTotalVisits(0);
        setTodayVisits(0);
      }
    };
    fetchTrafficStats();

    // Refresh stats every 30 seconds
    const statsInterval = setInterval(fetchTrafficStats, 30000);

    // Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'social'), (doc) => {
      if (doc.exists()) {
        setSocialLinks(doc.data().socialLinks || { instagram: '', linkedin: '', twitter: '', facebook: '' });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/social'));

    // Payment Settings
    const unsubPayment = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPaymentSettings({
          upiId: data.upiId || 'a7992269620@axl',
          merchantName: data.merchantName || 'HealthSave',
          qrImageBase64: data.qrImageBase64 || ''
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/payment'));

    // Content
    const unsubContent = onSnapshot(collection(db, contentPath), (snap) => {
      const content: any = { ...siteContent };
      snap.docs.forEach(doc => {
        content[doc.id] = doc.data();
      });
      setSiteContent(content);
    }, (err) => handleFirestoreError(err, OperationType.LIST, contentPath));

    return () => {
      unsubTraffic();
      unsubUsers();
      unsubSettings();
      unsubPayment();
      unsubContent();
      unsubVehicles();
      unsubCities();
      clearInterval(statsInterval);
    };
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const path = 'settings/social';
    try {
      await setDoc(doc(db, 'settings', 'social'), { socialLinks });
      toast.success('Social media links updated successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      toast.error('Failed to update social media links');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSavePayment = async () => {
    setSavingPayment(true);
    const path = 'settings/payment';
    try {
      await setDoc(doc(db, 'settings', 'payment'), paymentSettings);
      toast.success('Payment gateway settings updated successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      toast.error('Failed to update payment settings');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveContent = async (pageId: 'home' | 'about') => {
    setSavingContent(true);
    const path = `content/${pageId}`;
    try {
      await setDoc(doc(db, 'content', pageId), siteContent[pageId]);
      toast.success(`${pageId.charAt(0).toUpperCase() + pageId.slice(1)} content updated successfully`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      toast.error(`Failed to update ${pageId} content`);
    } finally {
      setSavingContent(false);
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUserId(user.uid);
    setEditForm({ displayName: user.displayName, email: user.email });
  };

  const handleSaveEdit = async (userId: string) => {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { 
        displayName: editForm.displayName,
        email: editForm.email 
      });
      setUsers(users.map(u => u.uid === userId ? { ...u, ...editForm } : u));
      setEditingUserId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };
 
  const handleToggleVehicleVerification = async (vehicleId: string, currentStatus: boolean) => {
    const path = `vehicle_owners/${vehicleId}`;
    try {
      await updateDoc(doc(db, 'vehicle_owners', vehicleId), { isVerified: !currentStatus });
      toast.success(`Vehicle ${!currentStatus ? 'verified' : 'unverified'} successfully`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      toast.error('Failed to update vehicle status');
    }
  };

  const handleEditVehicleClick = (v: any) => {
    setEditingVehicleId(v.id);
    setVehicleEditForm({
      name: v.name,
      city: v.city,
      pincode: v.pincode || '',
      vehicleType: v.vehicleType,
      vehicleNumber: v.vehicleNumber,
      rentPrice: v.rentPrice || '',
      phone: v.phone,
      whatsapp: v.whatsapp || ''
    });
  };

  const handleSaveVehicleEdit = async (vehicleId: string) => {
    const path = `vehicle_owners/${vehicleId}`;
    try {
      await updateDoc(doc(db, 'vehicle_owners', vehicleId), vehicleEditForm);
      toast.success('Vehicle details updated successfully');
      setEditingVehicleId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      toast.error('Failed to update vehicle details');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!window.confirm('Are you sure you want to delete this vehicle registration?')) return;
    
    const path = `vehicle_owners/${vehicleId}`;
    try {
      await deleteDoc(doc(db, 'vehicle_owners', vehicleId));
      toast.success('Vehicle registration deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      toast.error('Failed to delete vehicle registration');
    }
  };

  const handleAddCity = async () => {
    if (!cityForm.name) {
      toast.error('City name is required');
      return;
    }
    const cityId = cityForm.name.toLowerCase().replace(/\s+/g, '-');
    const path = `available_cities/${cityId}`;
    try {
      await setDoc(doc(db, 'available_cities', cityId), cityForm);
      toast.success('City added successfully');
      setCityForm({ name: '', icon: 'Globe', order: cities.length + 1 });
      setIsAddingCity(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      toast.error('Failed to add city');
    }
  };

  const handleEditCityClick = (city: any) => {
    setEditingCityId(city.id);
    setCityForm({ name: city.name, icon: city.icon, order: city.order || 0 });
  };

  const handleSaveCityEdit = async (cityId: string) => {
    const path = `available_cities/${cityId}`;
    try {
      await updateDoc(doc(db, 'available_cities', cityId), cityForm);
      toast.success('City updated successfully');
      setEditingCityId(null);
      setCityForm({ name: '', icon: 'Globe', order: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      toast.error('Failed to update city');
    }
  };

  const handleDeleteCity = async (cityId: string) => {
    if (!window.confirm('Are you sure you want to delete this city? This will affect the home page display.')) return;
    const path = `available_cities/${cityId}`;
    try {
      await deleteDoc(doc(db, 'available_cities', cityId));
      toast.success('City deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      toast.error('Failed to delete city');
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to delete ALL traffic logs? This action cannot be undone and will reset your statistics.')) return;
    
    setIsClearingLogs(true);
    try {
      // We'll delete them in batches
      const trafficRef = collection(db, 'traffic');
      const q = query(trafficRef, limit(500));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      toast.success(`Successfully cleared ${snapshot.docs.length} logs. If there are more, please click again.`);
      
      // Refresh stats
      const trafficColl = collection(db, 'traffic');
      const totalSnapshot = await getCountFromServer(trafficColl);
      setTotalVisits(totalSnapshot.data().count);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySnapshot = await getCountFromServer(query(trafficColl, where('timestamp', '>=', today)));
      setTodayVisits(todaySnapshot.data().count);
    } catch (err) {
      console.error("Error clearing logs:", err);
      toast.error('Failed to clear traffic logs');
    } finally {
      setIsClearingLogs(false);
    }
  };

  // Process data for chart
  const chartData = logs.reduce((acc: any[], log) => {
    const date = formatDate(log.timestamp, 'HH:mm');
    const existing = acc.find(item => item.time === date);
    if (existing) {
      existing.visits += 1;
    } else {
      acc.push({ time: date, visits: 1 });
    }
    return acc;
  }, []).reverse().slice(-20);

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 sm:gap-12 mb-12 sm:mb-20"
      >
        <div>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter leading-none">Admin <span className="text-indigo-600 dark:text-indigo-400">Center</span></h2>
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-medium tracking-tight">Manage users, monitor traffic, and analyze platform growth.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-inner backdrop-blur-xl overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('traffic')}
            className={cn(
              "px-6 sm:px-10 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap", 
              activeTab === 'traffic' 
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-[0_10px_30px_rgba(0,0,0,0.1)]" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Traffic
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-6 sm:px-10 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap", 
              activeTab === 'users' 
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-[0_10px_30px_rgba(0,0,0,0.1)]" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-6 sm:px-10 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap", 
              activeTab === 'settings' 
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-[0_10px_30px_rgba(0,0,0,0.1)]" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Settings
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            className={cn(
              "px-6 sm:px-10 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap", 
              activeTab === 'content' 
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-[0_10px_30px_rgba(0,0,0,0.1)]" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Content
          </button>
          <button 
            onClick={() => setActiveTab('vehicles')}
            className={cn(
              "px-6 sm:px-10 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap", 
              activeTab === 'vehicles' 
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-[0_10px_30px_rgba(0,0,0,0.1)]" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Vehicles
          </button>
          <button 
            onClick={() => setActiveTab('cities')}
            className={cn(
              "px-6 sm:px-10 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap", 
              activeTab === 'cities' 
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-[0_10px_30px_rgba(0,0,0,0.1)]" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Cities
          </button>
          <button 
            onClick={() => setActiveTab('payment')}
            className={cn(
              "px-6 sm:px-10 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap", 
              activeTab === 'payment' 
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-[0_10px_30px_rgba(0,0,0,0.1)]" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Payment
          </button>
        </div>
      </motion.div>

      {activeTab === 'traffic' ? (
        <div className="space-y-16">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
            {[
              { label: "Total Visits", value: totalVisits, icon: Globe, color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" },
              { label: "Today's Visits", value: todayVisits, icon: Clock, color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
              { label: "Active Users", value: users.length, icon: Users, color: "bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400" },
              { label: "Verified Owners", value: vehicles.filter(v => v.isVerified).length, icon: Shield, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" }
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.02)] hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 group"
              >
                <div className={cn("w-16 h-16 sm:w-20 h-20 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform duration-700 shadow-inner", stat.color)}>
                  <stat.icon className="w-8 h-8 sm:w-10 h-10" />
                </div>
                <p className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">{stat.value}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Analytics Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 p-6 sm:p-12 rounded-[2rem] sm:rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)]"
          >
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-8 sm:mb-12 flex items-center tracking-tighter">
              <Activity className="w-8 h-8 sm:w-10 h-10 mr-4 sm:mr-5 text-indigo-600 dark:text-indigo-400" /> Traffic Velocity
            </h3>
            <div className="h-[300px] sm:h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} 
                  />
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '32px', 
                      border: 'none', 
                      boxShadow: '0 50px 100px -12px rgb(0 0 0 / 0.25)',
                      padding: '24px',
                      backgroundColor: '#0f172a',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#818cf8', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.2em' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="#4f46e5" 
                    strokeWidth={6} 
                    fillOpacity={1} 
                    fill="url(#colorVisits)" 
                    animationDuration={2500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Logs Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)] overflow-hidden"
          >
            <div className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Live Traffic Stream</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time data tracked via API</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleClearLogs}
                  disabled={isClearingLogs}
                  className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 dark:border-red-500/20 hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isClearingLogs ? 'Clearing...' : 'Clear All Logs'}
                </button>
                <div className="flex items-center space-x-3 sm:space-x-4 px-4 sm:px-6 py-2 sm:py-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl sm:rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                  <div className="w-2 h-2 sm:w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Real-time Stream</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-8 sm:px-12 py-6 sm:py-8">Timestamp</th>
                    <th className="px-8 sm:px-12 py-6 sm:py-8">User Identity</th>
                    <th className="px-8 sm:px-12 py-6 sm:py-8">Target Path</th>
                    <th className="px-8 sm:px-12 py-6 sm:py-8">Device Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {logs.map((log, idx) => (
                    <motion.tr 
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300 group"
                    >
                      <td className="px-8 sm:px-12 py-6 sm:py-8 text-xs sm:text-sm font-black text-slate-600 dark:text-slate-400">
                        {formatDate(log.timestamp, 'HH:mm:ss')}
                      </td>
                      <td className="px-8 sm:px-12 py-6 sm:py-8">
                        <div className="flex flex-col">
                          <span className="text-[9px] sm:text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm shadow-indigo-500/5 w-fit">
                            {log.userId === 'anonymous' ? 'Guest User' : log.userId?.substring(0, 8)}
                          </span>
                          {(log as any).userEmail && (log as any).userEmail !== 'anonymous' && (
                            <span className="text-[8px] font-bold text-slate-400 mt-1 ml-1">{(log as any).userEmail}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 sm:px-12 py-6 sm:py-8">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black tracking-[0.1em] uppercase border border-slate-200 dark:border-slate-700">
                          {log.path}
                        </span>
                      </td>
                      <td className="px-8 sm:px-12 py-6 sm:py-8 text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-xs font-black uppercase tracking-widest">
                        {(log as any).platform || 'Unknown'} • {log.userAgent.includes('Chrome') ? 'Chrome' : log.userAgent.includes('Firefox') ? 'Firefox' : log.userAgent.includes('Safari') ? 'Safari' : 'Browser'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      ) : activeTab === 'users' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          <div className="p-12 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">User Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="px-12 py-8">User Profile</th>
                  <th className="px-12 py-8">Access Level</th>
                  <th className="px-12 py-8">Registration</th>
                  <th className="px-12 py-8">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {users.map((u, idx) => (
                  <motion.tr 
                    key={u.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300"
                  >
                    <td className="px-12 py-8">
                      <div className="flex items-center space-x-6">
                        <div className="relative group/avatar">
                          <img src={u.photoURL} alt="" className="w-16 h-16 rounded-[1.5rem] border-4 border-white dark:border-slate-800 shadow-xl group-hover/avatar:scale-110 transition-transform duration-500" />
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 shadow-lg",
                            u.role === 'admin' ? "bg-amber-500" : "bg-indigo-500"
                          )} />
                        </div>
                        {editingUserId === u.uid ? (
                          <div className="space-y-3 min-w-[250px]">
                            <input 
                              type="text" 
                              value={editForm.displayName}
                              onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                              className="text-sm font-black bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-3 w-full focus:border-indigo-500 outline-none transition-all shadow-inner"
                            />
                            <input 
                              type="email" 
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="text-xs font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-3 w-full focus:border-indigo-500 outline-none transition-all shadow-inner"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">{u.displayName}</p>
                            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{u.email}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-12 py-8">
                      <span className={cn(
                        "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
                        u.role === 'admin' 
                          ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 shadow-amber-500/5" 
                          : "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 shadow-indigo-500/5"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-12 py-8 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex items-center space-x-4">
                        {editingUserId === u.uid ? (
                          <>
                            <button 
                              onClick={() => handleSaveEdit(u.uid)}
                              className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                            >
                              Save Changes
                            </button>
                            <button 
                              onClick={() => setEditingUserId(null)}
                              className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-8 py-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <select 
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.uid, e.target.value as any)}
                              className="text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-inner"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button 
                              onClick={() => {
                                setEditingUserId(u.uid);
                                setEditForm({ displayName: u.displayName, email: u.email });
                              }}
                              className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-8 py-4 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all active:scale-95 border-2 border-indigo-100 dark:border-indigo-500/20 shadow-sm shadow-indigo-500/5 group/edit"
                            >
                              <span className="group-hover:tracking-[0.3em] transition-all">Edit Profile</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : activeTab === 'vehicles' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          <div className="p-12 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Vehicle Approvals</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Manage and verify delivery partner vehicles.</p>
            </div>
            <div className="relative group w-full md:w-96">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search by name, city, or vehicle #..."
                value={vehicleSearchQuery}
                onChange={(e) => setVehicleSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-2xl pl-16 pr-6 py-4 outline-none transition-all font-bold text-sm shadow-inner"
              />
              {vehicleSearchQuery && (
                <button 
                  onClick={() => setVehicleSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="px-12 py-8">Owner & Vehicle</th>
                  <th className="px-12 py-8">Location</th>
                  <th className="px-12 py-8">Status</th>
                  <th className="px-12 py-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {vehicles
                  .filter(v => {
                    const query = vehicleSearchQuery.toLowerCase();
                    return (
                      v.name?.toLowerCase().includes(query) ||
                      v.city?.toLowerCase().includes(query) ||
                      v.vehicleNumber?.toLowerCase().includes(query) ||
                      v.vehicleType?.toLowerCase().includes(query)
                    );
                  })
                  .map((v, idx) => (
                  <motion.tr 
                    key={v.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300"
                  >
                    <td className="px-12 py-8">
                      {editingVehicleId === v.id ? (
                        <div className="space-y-4">
                          <input 
                            type="text"
                            value={vehicleEditForm.name}
                            onChange={(e) => setVehicleEditForm({...vehicleEditForm, name: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
                            placeholder="Owner Name"
                          />
                          <input 
                            type="text"
                            value={vehicleEditForm.vehicleType}
                            onChange={(e) => setVehicleEditForm({...vehicleEditForm, vehicleType: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
                            placeholder="Vehicle Type"
                          />
                          <input 
                            type="text"
                            value={vehicleEditForm.vehicleNumber}
                            onChange={(e) => setVehicleEditForm({...vehicleEditForm, vehicleNumber: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
                            placeholder="Vehicle Number"
                          />
                          <input 
                            type="text"
                            value={vehicleEditForm.whatsapp}
                            onChange={(e) => setVehicleEditForm({...vehicleEditForm, whatsapp: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
                            placeholder="WhatsApp Number"
                          />
                          <input 
                            type="number"
                            value={vehicleEditForm.rentPrice}
                            onChange={(e) => setVehicleEditForm({...vehicleEditForm, rentPrice: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
                            placeholder="Rent Price"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-6">
                          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
                            <Truck className="w-8 h-8 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">{v.name}</p>
                            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{v.vehicleType} • {v.vehicleNumber}</p>
                            {v.rentPrice && (
                              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">Rent: ₹{v.rentPrice}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-12 py-8">
                      {editingVehicleId === v.id ? (
                        <div className="space-y-4">
                          <input 
                            type="text"
                            value={vehicleEditForm.city}
                            onChange={(e) => setVehicleEditForm({...vehicleEditForm, city: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
                            placeholder="City"
                          />
                          <input 
                            type="text"
                            value={vehicleEditForm.pincode}
                            onChange={(e) => setVehicleEditForm({...vehicleEditForm, pincode: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
                            placeholder="Pin Code"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm font-black uppercase tracking-widest">{v.city} {v.pincode && `(${v.pincode})`}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-12 py-8">
                      <span className={cn(
                        "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
                        v.isVerified 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shadow-emerald-500/5" 
                          : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 shadow-amber-500/5"
                      )}>
                        {v.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex items-center space-x-4">
                        {editingVehicleId === v.id ? (
                          <>
                            <button 
                              onClick={() => handleSaveVehicleEdit(v.id)}
                              className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-all active:scale-95"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingVehicleId(null)}
                              className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-6 py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleToggleVehicleVerification(v.id, v.isVerified)}
                              className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95 border-2 shadow-sm",
                                v.isVerified
                                  ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                  : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                              )}
                            >
                              {v.isVerified ? 'Revoke' : 'Approve'}
                            </button>
                            <button 
                              onClick={() => handleEditVehicleClick(v)}
                              className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all active:scale-95"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteVehicle(v.id)}
                              className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : activeTab === 'cities' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          <div className="p-12 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Available Cities</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Manage cities where QuickPill services are available.</p>
            </div>
            <button 
              onClick={() => {
                setIsAddingCity(true);
                setCityForm({ name: '', icon: 'Globe', order: cities.length });
              }}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all active:scale-95 flex items-center shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Add City
            </button>
          </div>

          {isAddingCity && (
            <div className="p-12 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City Name</label>
                  <input 
                    type="text"
                    value={cityForm.name}
                    onChange={(e) => setCityForm({...cityForm, name: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                    placeholder="e.g. Pune"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Icon</label>
                  <select 
                    value={cityForm.icon}
                    onChange={(e) => setCityForm({...cityForm, icon: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="Globe">Globe</option>
                    <option value="Activity">Activity</option>
                    <option value="Zap">Zap</option>
                    <option value="ShieldCheck">Shield</option>
                    <option value="Truck">Truck</option>
                    <option value="MapPin">Map Pin</option>
                    <option value="Pill">Pill</option>
                    <option value="Clock">Clock</option>
                  </select>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={handleAddCity}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all"
                  >
                    Save City
                  </button>
                  <button 
                    onClick={() => setIsAddingCity(false)}
                    className="px-6 py-4 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="px-12 py-8">Order</th>
                  <th className="px-12 py-8">City</th>
                  <th className="px-12 py-8">Icon</th>
                  <th className="px-12 py-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {cities.map((city, idx) => (
                  <motion.tr 
                    key={city.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300"
                  >
                    <td className="px-12 py-8">
                      {editingCityId === city.id ? (
                        <input 
                          type="number"
                          value={cityForm.order}
                          onChange={(e) => setCityForm({...cityForm, order: parseInt(e.target.value)})}
                          className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold"
                        />
                      ) : (
                        <span className="text-sm font-black text-slate-400">{city.order}</span>
                      )}
                    </td>
                    <td className="px-12 py-8">
                      {editingCityId === city.id ? (
                        <input 
                          type="text"
                          value={cityForm.name}
                          onChange={(e) => setCityForm({...cityForm, name: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold"
                        />
                      ) : (
                        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{city.name}</span>
                      )}
                    </td>
                    <td className="px-12 py-8">
                      {editingCityId === city.id ? (
                        <select 
                          value={cityForm.icon}
                          onChange={(e) => setCityForm({...cityForm, icon: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold"
                        >
                          <option value="Globe">Globe</option>
                          <option value="Activity">Activity</option>
                          <option value="Zap">Zap</option>
                          <option value="ShieldCheck">Shield</option>
                          <option value="Truck">Truck</option>
                          <option value="MapPin">Map Pin</option>
                          <option value="Pill">Pill</option>
                          <option value="Clock">Clock</option>
                        </select>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                            {(() => {
                              const ICON_MAP: any = { Globe, Activity, Zap, ShieldCheck, Truck, MapPin, Pill, Clock };
                              const Icon = ICON_MAP[city.icon] || Globe;
                              return <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
                            })()}
                          </div>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{city.icon}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex items-center space-x-4">
                        {editingCityId === city.id ? (
                          <>
                            <button 
                              onClick={() => handleSaveCityEdit(city.id)}
                              className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-all active:scale-95"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingCityId(null)}
                              className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-6 py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleEditCityClick(city)}
                              className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all active:scale-95"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCity(city.id)}
                              className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : activeTab === 'settings' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)] p-12"
        >
          <div className="mb-12">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center">
              <SettingsIcon className="w-10 h-10 mr-5 text-indigo-600 dark:text-indigo-400" /> Platform Settings
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Configure global application parameters and social media presence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Social Media Links</h4>
              
              <div className="space-y-6">
                {[
                  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-rose-500' },
                  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
                  { id: 'twitter', label: 'Twitter (X)', icon: Twitter, color: 'text-slate-900 dark:text-white' },
                  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-700' }
                ].map((social) => (
                  <div key={social.id} className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2">
                      <social.icon className={cn("w-5 h-5", social.color)} />
                    </div>
                    <input 
                      type="url" 
                      placeholder={`${social.label} URL`}
                      value={(socialLinks as any)[social.id]}
                      onChange={(e) => setSocialLinks({ ...socialLinks, [social.id]: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl pl-16 pr-8 py-5 text-sm font-bold focus:border-indigo-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                ))}
              </div>

              <button 
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
              >
                {savingSettings ? (
                  <Clock className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-3" /> Save All Settings
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] p-10 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] flex items-center justify-center mb-6">
                <Shield className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Admin Security</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                These settings are global and affect all users. Ensure all URLs are valid and secure (HTTPS).
              </p>
            </div>
          </div>
        </motion.div>
      ) : activeTab === 'payment' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)] p-12"
        >
          <div className="mb-12">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center">
              <QrCode className="w-10 h-10 mr-5 text-indigo-600 dark:text-indigo-400" /> Payment Gateway Settings
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Manage the payment gateway details, UPI ID and custom QR code image.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-4">UPI ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. yourname@upi"
                  value={paymentSettings.upiId}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, upiId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl px-8 py-5 text-sm font-bold focus:border-indigo-500 outline-none transition-all shadow-inner font-mono text-slate-700 dark:text-slate-350"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-4">Merchant / Display Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. HealthSave"
                  value={paymentSettings.merchantName}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, merchantName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl px-8 py-5 text-sm font-bold focus:border-indigo-500 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-4">Upload Custom QR Code (Optional)</label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-[2rem] p-8 text-center cursor-pointer transition-all relative group bg-slate-50/50 dark:bg-slate-800/10">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setPaymentSettings({ ...paymentSettings, qrImageBase64: event.target.result as string });
                            toast.success('Custom QR code uploaded successfully (local preview)');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-600 transition-colors mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Drag and drop or click to upload</p>
                  <p className="text-xs text-slate-400 mt-1">Supports JPEG, PNG, WEBP (stored securely as tiny payload)</p>
                </div>
              </div>

              <button 
                onClick={handleSavePayment}
                disabled={savingPayment}
                className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {savingPayment ? (
                  <Clock className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-3" /> Save Gateway Settings
                  </>
                )}
              </button>
            </div>

            <div className="space-y-8 flex flex-col items-center justify-center">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm w-full max-w-sm flex flex-col items-center text-center">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-6">User-Facing Payment Preview</span>
                
                <div className="bg-white p-6 rounded-3xl inline-block shadow-lg border-4 border-slate-50 dark:border-slate-800 mb-6">
                  {paymentSettings.qrImageBase64 ? (
                    <div className="relative group">
                      <img 
                        src={paymentSettings.qrImageBase64} 
                        alt="Uploaded QR Code" 
                        className="w-[150px] h-[150px] object-contain rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentSettings({ ...paymentSettings, qrImageBase64: '' });
                          toast.info('Reverted to system-generated dynamic QR code');
                        }}
                        className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors cursor-pointer"
                        title="Remove custom QR and use dynamic generator"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <QRCodeCanvas 
                      value={`upi://pay?pa=${paymentSettings.upiId || 'a7992269620@axl'}&pn=${paymentSettings.merchantName || 'HealthSave'}&am=100&cu=INR`}
                      size={150}
                      level="H"
                      includeMargin={false}
                    />
                  )}
                </div>

                <div className="w-full space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Configured Gateway</p>
                    <p className="text-base font-black text-slate-900 dark:text-white tracking-tight">{paymentSettings.merchantName || 'HealthSave'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">UPI ID</p>
                    <span className="bg-slate-150 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-xs font-black tracking-tight border border-slate-250 dark:border-slate-700/50 break-all select-all block max-w-full truncate font-mono">
                      {paymentSettings.upiId || 'a7992269620@axl'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic mt-2">
                    {paymentSettings.qrImageBase64 ? "Using custom uploaded static QR code Image" : "Dynamically generating custom merchant QR code"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Home Page Content */}
          <div className="bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)] p-12">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center">
                  <Layout className="w-10 h-10 mr-5 text-indigo-600 dark:text-indigo-400" /> Home Page Content
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Edit the main hero section and landing page text.</p>
              </div>
              <button 
                onClick={() => handleSaveContent('home')}
                disabled={savingContent}
                className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center disabled:opacity-50"
              >
                {savingContent ? <Clock className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-3" /> Save Home</>}
              </button>
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-4">Hero Title</label>
                <input 
                  type="text" 
                  value={siteContent.home.heroTitle}
                  onChange={(e) => setSiteContent({ ...siteContent, home: { ...siteContent.home, heroTitle: e.target.value } })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl px-8 py-5 text-lg font-black tracking-tight focus:border-indigo-500 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-4">Hero Subtitle</label>
                <textarea 
                  rows={3}
                  value={siteContent.home.heroSubtitle}
                  onChange={(e) => setSiteContent({ ...siteContent, home: { ...siteContent.home, heroSubtitle: e.target.value } })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl px-8 py-5 text-sm font-medium focus:border-indigo-500 outline-none transition-all shadow-inner resize-none"
                />
              </div>
            </div>
          </div>

          {/* About Page Content */}
          <div className="bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.05)] p-12">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center">
                  <FileText className="w-10 h-10 mr-5 text-indigo-600 dark:text-indigo-400" /> About Page Content
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Manage your mission, vision, and company narrative.</p>
              </div>
              <button 
                onClick={() => handleSaveContent('about')}
                disabled={savingContent}
                className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center disabled:opacity-50"
              >
                {savingContent ? <Clock className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-3" /> Save About</>}
              </button>
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-4">Our Mission</label>
                <textarea 
                  rows={4}
                  value={siteContent.about.mission}
                  onChange={(e) => setSiteContent({ ...siteContent, about: { ...siteContent.about, mission: e.target.value } })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl px-8 py-5 text-sm font-medium focus:border-indigo-500 outline-none transition-all shadow-inner resize-none"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-4">Our Vision</label>
                <textarea 
                  rows={4}
                  value={siteContent.about.vision}
                  onChange={(e) => setSiteContent({ ...siteContent, about: { ...siteContent.about, vision: e.target.value } })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl px-8 py-5 text-sm font-medium focus:border-indigo-500 outline-none transition-all shadow-inner resize-none"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
</div>
  );
};
