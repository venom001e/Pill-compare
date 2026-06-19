import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Mail,
  Car,
  MessageCircle
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function RegisterVehicle() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    city: '',
    pincode: '',
    vehicleType: '',
    vehicleNumber: '',
    rentPrice: '',
    lat: null as number | null,
    lng: null as number | null
  });

  const [gettingLocation, setGettingLocation] = useState(false);
  const [highlightFields, setHighlightFields] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    const loadingToast = toast.loading('Fetching your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lng: longitude
        }));

        try {
          // Use Nominatim for free reverse geocoding
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await response.json();
          
          toast.dismiss(loadingToast);

          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.state_district || '';
            const pincode = data.address.postcode || '';
            
            setFormData(prev => ({
              ...prev,
              city: city || prev.city,
              pincode: pincode || prev.pincode
            }));
            
            setHighlightFields(true);
            setTimeout(() => setHighlightFields(false), 2000);

            if (city || pincode) {
              toast.success(`Location detected: ${city}${pincode ? `, ${pincode}` : ''}`);
            } else {
              toast.success('Coordinates captured successfully!');
            }
          } else {
            toast.success('Coordinates captured successfully!');
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          toast.dismiss(loadingToast);
          toast.success('Coordinates captured, but could not determine address.');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.dismiss(loadingToast);
        setGettingLocation(false);
        toast.error('Failed to get location. Please ensure location permissions are granted.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Please login to register your vehicle');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'vehicle_owners'), {
        ...formData,
        uid: auth.currentUser.uid,
        isVerified: false,
        createdAt: serverTimestamp()
      });
      toast.success('Registration submitted successfully! Our team will verify your details.');
      navigate('/vehicle-owners');
    } catch (error) {
      console.error('Error registering vehicle:', error);
      toast.error('Failed to submit registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left Side: Info */}
          <div className="space-y-12">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-800 mb-6"
              >
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Join Our Network</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-6 sm:mb-8 leading-tight"
              >
                Register Your <br />
                <span className="text-emerald-600">Vehicle.</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-xl"
              >
                Earn by helping your community. Register your vehicle to provide local transport and delivery services for healthcare needs.
              </motion.p>
            </div>

            <div className="space-y-8">
              {[
                { title: 'Verified Network', desc: 'Join a trusted community of local transport providers.', icon: ShieldCheck },
                { title: 'Flexible Hours', desc: 'Work on your own schedule and help when you can.', icon: CheckCircle2 },
                { title: 'Direct Connection', desc: 'Connect directly with users in your city who need help.', icon: ArrowRight }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  className="flex items-start space-x-6 group"
                >
                  <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 group-hover:border-emerald-500/50 transition-all">
                    <item.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{item.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Side: Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 p-6 sm:p-12 md:p-16 rounded-[2rem] sm:rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none"
          >
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">Full Name</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <User className="w-full h-full" />
                    </div>
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="John Doe"
                      className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">Email Address</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <Mail className="w-full h-full" />
                    </div>
                    <input 
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="john@example.com"
                      className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">Phone Number</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <Phone className="w-full h-full" />
                    </div>
                    <input 
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+91 98765 43210"
                      className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">WhatsApp Number</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <MessageCircle className="w-full h-full" />
                    </div>
                    <input 
                      required
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                      placeholder="+91 98765 43210"
                      className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">City</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <MapPin className="w-full h-full" />
                    </div>
                    <input 
                      required
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Mumbai"
                      className={cn(
                        "w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600",
                        highlightFields && "ring-4 ring-emerald-500/20 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">Pin Code</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <MapPin className="w-full h-full" />
                    </div>
                    <input 
                      required
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                      placeholder="400001"
                      className={cn(
                        "w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600",
                        highlightFields && "ring-4 ring-emerald-500/20 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">Vehicle Type</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <Car className="w-full h-full" />
                    </div>
                    <input 
                      required
                      type="text"
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                      placeholder="Bike / Car / Van"
                      className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">Vehicle Number</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <Truck className="w-full h-full" />
                    </div>
                    <input 
                      required
                      type="text"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})}
                      placeholder="MH 01 AB 1234"
                      className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">Rent Price (per km/trip)</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400 group-focus-within:text-emerald-500 transition-colors">₹</div>
                    <input 
                      required
                      type="number"
                      value={formData.rentPrice}
                      onChange={(e) => setFormData({...formData, rentPrice: e.target.value})}
                      placeholder="500"
                      className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-4">Location (For Nearby Search)</label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={gettingLocation}
                      className={cn(
                        "flex-1 py-5 rounded-[2rem] font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center space-x-3 border-2 active:scale-95",
                        formData.lat 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800" 
                          : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-600 shadow-sm"
                      )}
                    >
                      {gettingLocation ? (
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      ) : formData.lat ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                      <span>{gettingLocation ? 'Capturing...' : formData.lat ? 'Location Captured' : 'Get Current Location'}</span>
                    </button>
                    {formData.lat && (
                      <div className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-tighter text-center sm:text-left">
                        {formData.lat.toFixed(6)}, {formData.lng?.toFixed(6)}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 ml-4 font-medium italic leading-relaxed">
                    Capturing your accurate location allows nearby patients to find and contact you quickly during emergencies.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-start space-x-5">
                <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                  <AlertCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  By submitting this form, you confirm that your vehicle is in good condition and all information provided is accurate. Our compliance team will review your application within 24-48 hours.
                </p>
              </div>

              <button 
                disabled={loading}
                type="submit"
                className="w-full bg-emerald-600 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-4 active:scale-[0.98] group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
