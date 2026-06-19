import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Truck, 
  Phone, 
  User, 
  ShieldCheck, 
  ChevronRight,
  Globe,
  MessageSquare,
  X,
  Clock,
  ShoppingBag,
  Loader2,
  Map as MapIcon,
  List
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { getGeocode } from 'use-places-autocomplete';

interface VehicleOwner {
  id: string;
  name: string;
  city: string;
  pincode: string;
  vehicleType: string;
  vehicleNumber: string;
  rentPrice?: string | number;
  phone: string;
  whatsapp: string;
  isVerified: boolean;
  lat?: number;
  lng?: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fix Leaflet default icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom component to update map view
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function VehicleOwners() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [owners, setOwners] = useState<VehicleOwner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [citySearch, setCitySearch] = useState(searchParams.get('city') || '');
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Booking Modal State
  const [selectedOwner, setSelectedOwner] = useState<VehicleOwner | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    name: '',
    whatsapp: '',
    city: '',
    address: '',
    medicines: '',
    deliveryType: 'express' as 'express' | 'standard',
    timeSlot: 'ASAP'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const resultsRef = React.useRef<HTMLDivElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setCitySuggestions([]);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&featuretype=city`);
      const data = await response.json();
      setCitySuggestions(data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCitySearch(value);
    setShowSuggestions(true);
    fetchSuggestions(value);
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const cityName = suggestion.display_name.split(',')[0];
    setCitySearch(cityName);
    setShowSuggestions(false);
    if (suggestion.lat && suggestion.lon) {
      setUserLocation({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) });
    }
  };

  const handleSearch = () => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGetCurrentLocation = (target: 'search' | 'booking') => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    const loadingToast = toast.loading("Fetching your location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        try {
          if (typeof (window as any).google === 'undefined' || !(window as any).google.maps) {
            toast.dismiss(loadingToast);
            toast.error("Google Maps is not loaded. Please check your connection.");
            setIsLocating(false);
            return;
          }

          const results = await getGeocode({ location: { lat: latitude, lng: longitude } });
          if (results[0]) {
            const address = results[0].formatted_address;
            
            // Extract address components
            const addressComponents = results[0].address_components;
            let city = '';
            let pincode = '';
            
            addressComponents.forEach(component => {
              if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                city = component.long_name;
              }
              if (component.types.includes('postal_code')) {
                pincode = component.long_name;
              }
            });

            if (target === 'search') {
              setCitySearch(city || address.split(',')[0]);
            } else {
              setBookingData(prev => ({
                ...prev,
                address: address,
                city: city || prev.city
              }));
            }
            
            toast.dismiss(loadingToast);
            toast.success("Location captured!");
          }
        } catch (error) {
          console.error("Error reverse geocoding: ", error);
          toast.dismiss(loadingToast);
          toast.error("Failed to identify your location");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error: ", error);
        toast.dismiss(loadingToast);
        toast.error("Please enable location access");
        setIsLocating(false);
      }
    );
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return;

    // Validation
    if (bookingData.address.trim().length < 5) {
      toast.error('Please enter a more detailed address');
      return;
    }

    if (bookingData.name.trim().length < 2) {
      toast.error('Please enter your full name');
      return;
    }
    
    setIsSubmitting(true);

    const message = `*Direct Booking Request for ${selectedOwner.name}*
--------------------------
*Customer:* ${bookingData.name}
*WhatsApp:* ${bookingData.whatsapp}
*Address:* ${bookingData.address}, ${bookingData.city}
--------------------------
*Delivery Type:* ${bookingData.deliveryType.toUpperCase()}
*Time Slot:* ${bookingData.timeSlot}
--------------------------
*Medicines:*
${bookingData.medicines}
--------------------------
Please confirm if you can fulfill this delivery.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${selectedOwner.whatsapp.replace(/\D/g, '')}?text=${encodedMessage}`;

    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
      setIsSubmitting(false);
      setSelectedOwner(null);
      toast.success('Booking request sent via WhatsApp!');
    }, 1500);
  };

  useEffect(() => {
    // Fetch all owners so users can see their own registrations even before verification
    const q = query(collection(db, 'vehicle_owners'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ownersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VehicleOwner[];
      setOwners(ownersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching vehicle owners:", error);
      toast.error("Failed to load vehicle owners. Please check your connection.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredOwners = citySearch.trim().length === 0 
    ? [] 
    : owners.filter(owner => {
        const name = owner.name || '';
        const vehicleType = owner.vehicleType || '';
        const city = owner.city || '';
        
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             vehicleType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCity = city.toLowerCase().includes(citySearch.toLowerCase());
        
        return matchesSearch && matchesCity;
      });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-12 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-800 mb-4 sm:mb-6"
          >
            <Truck className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Local Transport Network</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-4 sm:mb-6 leading-tight"
          >
            Find Reliable <br />
            <span className="text-emerald-600">Vehicle Owners.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl"
          >
            Connect with verified local vehicle owners for your healthcare transport and delivery needs.
          </motion.p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col space-y-4 mb-12">
          <div className="flex justify-center sm:justify-end">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'list' 
                    ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <List className="w-4 h-4" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={cn(
                  "flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'map' 
                    ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <MapIcon className="w-4 h-4" />
                <span>Map View</span>
              </button>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col lg:flex-row gap-4"
          >
          <div className="flex-1 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name or vehicle type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-8 py-4 sm:py-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-3xl border-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white font-medium text-sm sm:text-base"
            />
          </div>

          <div className="flex-1 relative group" ref={suggestionsRef}>
            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Enter City..."
              value={citySearch}
              onChange={handleCityChange}
              onFocus={() => citySearch.length >= 2 && setShowSuggestions(true)}
              className="w-full pl-16 pr-12 py-4 sm:py-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-3xl border-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white font-medium text-sm sm:text-base"
            />
            <button
              onClick={() => handleGetCurrentLocation('search')}
              disabled={isLocating}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
              title="Use Current Location"
            >
              {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
            </button>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && citySuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl z-[100] overflow-hidden"
                >
                  {citySuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full text-left px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-start space-x-3 border-b border-slate-50 dark:border-slate-800 last:border-none"
                    >
                      <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {suggestion.display_name.split(',')[0]}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {suggestion.display_name.split(',').slice(1).join(',').trim()}
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleSearch}
            className="px-8 py-4 sm:py-5 rounded-xl sm:rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center space-x-3 border-2 bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:border-emerald-700 active:scale-95"
          >
            <Search className="w-4 h-4" />
            <span>Find Vehicles</span>
          </button>
        </motion.div>
      </div>

        {/* Owners Grid */}
        <div ref={resultsRef} className="scroll-mt-32">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : citySearch.trim().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Search for a City</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md">
                Enter a city or place name above to find available vehicles in your area.
              </p>
            </div>
          ) : filteredOwners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <X className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No Vehicles Found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md">
                We couldn't find any vehicles in "{citySearch}". Try searching for a nearby city or check back later.
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredOwners.map((owner, index) => (
                  <motion.div
                    key={owner.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10"
                  >
                  <div className="flex items-start justify-between mb-6 sm:mb-8">
                    <div className="w-12 h-12 sm:w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl sm:rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 sm:w-8 h-8 text-emerald-600" />
                    </div>
                    {owner.isVerified && (
                      <div className="flex items-center space-x-1 bg-emerald-500/10 px-2 sm:px-3 py-1 rounded-full border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-500">Verified</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{owner.name}</h3>
                    <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 h-4" />
                      <span className="text-xs sm:text-sm font-bold">{owner.city}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                      <Truck className="w-3.5 h-3.5 sm:w-4 h-4" />
                      <span className="text-xs sm:text-sm font-bold">{owner.vehicleType}</span>
                    </div>
                    {owner.rentPrice && (
                      <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                        <span className="text-sm font-black">₹</span>
                        <span className="text-xs sm:text-sm font-black uppercase tracking-widest">Rent: ₹{owner.rentPrice}</span>
                      </div>
                    )}
                    {userLocation && owner.lat && owner.lng && (
                      <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                        <Globe className="w-3.5 h-3.5 sm:w-4 h-4" />
                        <span className="text-[10px] sm:text-sm font-black uppercase tracking-widest">
                          {calculateDistance(userLocation.lat, userLocation.lng, owner.lat, owner.lng).toFixed(1)} km away
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <a 
                        href={`tel:${owner.phone}`}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center space-x-2"
                      >
                        <Phone className="w-3.5 h-3.5 sm:w-4 h-4" />
                        <span>Call</span>
                      </a>
                      {owner.whatsapp && (
                        <a 
                          href={`https://wa.me/${owner.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-emerald-100 transition-all flex items-center justify-center space-x-2"
                        >
                          <MessageSquare className="w-3.5 h-3.5 sm:w-4 h-4" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOwner(owner);
                        setBookingData(prev => ({ ...prev, city: owner.city }));
                      }}
                      className="w-full bg-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Truck className="w-3.5 h-3.5 sm:w-4 h-4" />
                      <span>Book Delivery</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-[400px] sm:h-[600px] w-full rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xl relative z-10">
            <MapContainer 
              center={userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629]} 
              zoom={userLocation ? 12 : 5} 
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {userLocation && <ChangeView center={[userLocation.lat, userLocation.lng]} zoom={12} />}
              
              {filteredOwners.filter(o => o.lat && o.lng).map((owner) => (
                <Marker 
                  key={owner.id} 
                  position={[owner.lat!, owner.lng!]}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-black text-slate-900 dark:text-white">{owner.name}</h4>
                        {owner.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-xs text-slate-500">
                          <Truck className="w-3 h-3 mr-2" />
                          {owner.vehicleType}
                        </div>
                        <div className="flex items-center text-xs text-slate-500">
                          <MapPin className="w-3 h-3 mr-2" />
                          {owner.city}
                        </div>
                        {owner.rentPrice && (
                          <div className="text-xs font-black text-indigo-600">
                            Rent: ₹{owner.rentPrice}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedOwner(owner);
                          setBookingData(prev => ({ ...prev, city: owner.city }));
                        }}
                        className="w-full bg-emerald-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                      >
                        Book Now
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {!loading && owners.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No vehicle owners yet</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-sm mx-auto">Be the first to join our local transport network and help your community.</p>
            <Link 
              to="/register-vehicle"
              className="inline-flex bg-emerald-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 items-center space-x-3"
            >
              <Truck className="w-4 h-4" />
              <span>Register Your Vehicle</span>
            </Link>
          </div>
        )}

        {!loading && owners.length > 0 && filteredOwners.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No owners found</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Try adjusting your search or city filter.</p>
            {(searchTerm || citySearch) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCitySearch('');
                }}
                className="px-8 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
        </div>
        {/* Booking Modal */}
        <AnimatePresence>
          {selectedOwner && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedOwner(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Book {selectedOwner.name}</h3>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Direct Delivery Request</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedOwner(null)}
                    className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 max-h-[70vh] overflow-y-auto">
                  <form onSubmit={handleBookingSubmit} className="space-y-8">
                    {bookingStep === 1 ? (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Medicines Needed</label>
                          <textarea
                            required
                            value={bookingData.medicines}
                            onChange={(e) => setBookingData({...bookingData, medicines: e.target.value})}
                            rows={4}
                            placeholder="List your medicines here..."
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-emerald-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-slate-900 dark:text-white shadow-inner resize-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setBookingStep(2)}
                          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2"
                        >
                          <span>Next: Delivery Details</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Name</label>
                            <input
                              required
                              type="text"
                              value={bookingData.name}
                              onChange={(e) => setBookingData({...bookingData, name: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">WhatsApp (Optional)</label>
                            <input
                              type="tel"
                              value={bookingData.whatsapp}
                              onChange={(e) => setBookingData({...bookingData, whatsapp: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between ml-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Address</label>
                          </div>
                          <textarea
                            required
                            value={bookingData.address}
                            onChange={(e) => setBookingData({...bookingData, address: e.target.value})}
                            rows={2}
                            placeholder="Street name, landmark, etc."
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">City</label>
                          <input
                            required
                            type="text"
                            value={bookingData.city}
                            onChange={(e) => setBookingData({...bookingData, city: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setBookingStep(1)}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-600 py-4 rounded-xl font-black uppercase tracking-widest text-[10px]"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                          >
                            {isSubmitting ? 'Sending...' : 'Confirm Booking'}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
