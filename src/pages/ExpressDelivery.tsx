import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Upload, MapPin, Phone, User, ClipboardList, 
  ArrowLeft, CheckCircle2, ArrowRight, Activity, 
  Clock, ShieldCheck, Truck, Zap, Info, AlertCircle,
  FileText, Smartphone, Sparkles, Package, ShoppingBag,
  CreditCard, Timer, Search, X
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';


const FeatureCard = ({ icon: Icon, title, desc, delay }: { icon: any, title: string, desc: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    className="bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 hover:border-indigo-500/30 transition-all group"
  >
    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-sm">
      <Icon className="w-6 h-6 text-indigo-600" />
    </div>
    <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">{title}</h4>
    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
  </motion.div>
);

const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{ 
        scale: [1, 1.2, 1],
        x: [0, 100, 0],
        y: [0, 50, 0],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px]"
    />
    <motion.div
      animate={{ 
        scale: [1.2, 1, 1.2],
        x: [0, -100, 0],
        y: [0, -50, 0],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-accent-500/5 dark:bg-accent-500/10 rounded-full blur-[120px]"
    />
  </div>
);

const FloatingElement = ({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    animate={{ 
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0]
    }}
    transition={{ 
      duration: 6, 
      repeat: Infinity, 
      ease: "easeInOut",
      delay 
    }}
    className={cn("absolute pointer-events-none opacity-20 dark:opacity-10", className)}
  >
    {children}
  </motion.div>
);

export const ExpressDelivery: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cart, totalPrice } = useCart();
  const deliveryFee = totalPrice >= 999 ? 0 : 50;
  const finalTotal = totalPrice + deliveryFee;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    city: '',
    address: '',
    pincode: '',
    medicines: searchParams.get('medicine') || '',
    deliveryType: 'express' as 'express' | 'standard',
    timeSlot: 'ASAP',
    paymentMethod: 'qr' as 'qr' | 'upi'
  });
  const [prescription, setPrescription] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'selection' | 'processing' | 'success'>('selection');
  const [hasConfirmedPayment, setHasConfirmedPayment] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    upiId: 'a7992269620@axl',
    merchantName: 'HealthSave',
    qrImageBase64: ''
  });

  useEffect(() => {
    const unsubPayment = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPaymentSettings({
          upiId: data.upiId || 'a7992269620@axl',
          merchantName: data.merchantName || 'HealthSave',
          qrImageBase64: data.qrImageBase64 || ''
        });
      }
    });

    return () => unsubPayment();
  }, []);

  useEffect(() => {
    if (cart.length > 0 && !searchParams.get('medicine')) {
      const cartMedicines = cart.map(item => `${item.name} (${item.platform}) x${item.quantity} - ₹${item.price * item.quantity}`).join('\n');
      setFormData(prev => ({
        ...prev,
        medicines: cartMedicines
      }));
    }
  }, [cart, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPrescription(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.address.trim().length < 10) {
      toast.error('Please enter a more detailed full address');
      return;
    }

    setIsSubmitting(true);
    setStep(3);
    setIsSubmitting(false);
  };

  const handleFinalConfirm = () => {
    setIsSubmitting(true);
    setPaymentStep('processing');

    setTimeout(() => {
      setPaymentStep('success');
      
      const message = `*Order Confirmed & Paid*
--------------------------
*Payment Status:* PAID (via ${formData.paymentMethod.toUpperCase()})
*Name:* ${formData.name}
*WhatsApp:* ${formData.whatsapp || 'Not provided'}
*Address:* ${formData.address}, ${formData.city} - ${formData.pincode}
--------------------------
*Delivery Type:* ${formData.deliveryType.toUpperCase()}
*Time Slot:* ${formData.timeSlot}
--------------------------
*Order Details:*
${formData.medicines}
--------------------------
*Subtotal:* ₹${totalPrice}
*Delivery Fee:* ${deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
*Total Amount Paid:* ₹${finalTotal}
${prescription ? `*Prescription:* Attached (User will send image next)` : '*Prescription:* Not provided'}
--------------------------
Please process my order for ${formData.deliveryType === 'express' ? '1-hour express' : 'standard'} delivery.`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/917647873420?text=${encodedMessage}`;

      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        setIsSubmitting(false);
        toast.success('Order placed successfully!');
      }, 1500);
    }, 2000);
  };

  const steps = [
    { id: 1, label: 'Order', icon: ClipboardList },
    { id: 2, label: 'Delivery', icon: MapPin },
    { id: 3, label: 'Payment', icon: CreditCard },
  ];

  return (
    <div className="relative min-h-screen pt-32 pb-24 overflow-hidden bg-slate-50/50 dark:bg-[#0B0F1A]">
      <AnimatedBackground />
      
      {/* Background Decorations */}
      <FloatingElement className="top-40 left-[5%]" delay={0}>
        <Zap className="w-24 h-24 text-indigo-500" />
      </FloatingElement>
      <FloatingElement className="bottom-40 right-[5%]" delay={2}>
        <Clock className="w-32 h-32 text-accent-500" />
      </FloatingElement>
      <FloatingElement className="top-60 right-[10%]" delay={1}>
        <Truck className="w-20 h-20 text-indigo-400" />
      </FloatingElement>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Left Side: Info & Features */}
          <div className="lg:w-1/3 space-y-12">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate(-1)}
              className="flex items-center space-x-3 text-slate-500 hover:text-indigo-600 transition-all font-black uppercase tracking-widest text-[10px] group"
            >
              <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors border border-slate-100 dark:border-slate-700">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
              <span>Back to Home</span>
            </motion.button>

            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center space-x-3 bg-white dark:bg-slate-900/50 backdrop-blur-xl px-5 py-2.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5"
              >
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Live Priority Status</span>
              </motion.div>

              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl sm:text-7xl font-black tracking-tighter leading-[0.85] text-slate-900 dark:text-white"
                >
                  Need it <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-accent-500">Fast?</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed max-w-sm"
                >
                  Our express network is built for emergencies. Get your prescription medicines in under 60 minutes.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group"
              >
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-4">
                    <Timer className="w-5 h-5 text-indigo-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Delivery Guarantee</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tighter mb-2">60 Minutes</h2>
                  <p className="text-indigo-100/70 text-xs font-bold leading-relaxed">If we're late, your delivery is on us. That's our commitment to your health.</p>
                </div>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"
                />
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FeatureCard 
                icon={ShieldCheck} 
                title="Verified Rx" 
                desc="Pharmacist-led verification for every single order."
                delay={0.4}
              />
              <FeatureCard 
                icon={Smartphone} 
                title="Direct Chat" 
                desc="Talk directly to your delivery partner via WhatsApp."
                delay={0.5}
              />
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="lg:w-2/3">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col md:flex-row"
            >
              {/* Form Content */}
              <div className="flex-1 p-6 sm:p-10 md:p-14 border-r border-slate-50 dark:border-slate-800/50">
                {/* Progress Bar */}
                <div className="mb-10 sm:mb-14">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
                    <motion.div 
                      className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 shadow-[0_0_15px_rgba(79,70,229,0.5)]"
                      initial={{ width: '0%' }}
                      animate={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                    />
                    {steps.map((s) => (
                      <div key={s.id} className="relative z-10 flex flex-col items-center">
                        <motion.button
                          onClick={() => setStep(s.id)}
                          animate={{ 
                            scale: step === s.id ? 1.1 : 1,
                            backgroundColor: step >= s.id ? 'var(--color-indigo-600)' : 'var(--color-slate-100)',
                          }}
                          className={cn(
                            "w-8 h-8 sm:w-10 h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-500",
                            step >= s.id ? "text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 dark:bg-slate-800"
                          )}
                        >
                          <s.icon className="w-3.5 h-3.5 sm:w-4 h-4" />
                        </motion.button>
                        <span className={cn(
                          "text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-3 sm:mt-4 transition-colors duration-500",
                          step >= s.id ? "text-indigo-600" : "text-slate-400"
                        )}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                      >
                        <div className="space-y-2">
                          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">What do you need?</h3>
                          <p className="text-slate-500 text-sm font-medium">List the medicines you want to order.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-2">Medicine Names & Quantities</label>
                            <div className="relative group">
                              <ClipboardList className="absolute left-6 top-6 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                              <textarea
                                required
                                name="medicines"
                                value={formData.medicines}
                                onChange={handleChange}
                                rows={5}
                                placeholder="Example:&#10;Paracetamol 500mg - 2 strips&#10;Vitamin C - 1 bottle"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] sm:rounded-[2rem] pl-16 pr-8 py-6 outline-none transition-all font-bold text-slate-900 dark:text-white shadow-inner resize-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-2">Prescription (Optional but recommended)</label>
                            <div className="relative group/upload">
                              <input
                                type="file"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                accept="image/*,.pdf"
                              />
                              <div className={cn(
                                "w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed transition-all rounded-[2rem] p-8 text-center shadow-inner",
                                prescription ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200 dark:border-slate-700 group-hover/upload:border-indigo-500"
                              )}>
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm transition-all duration-500",
                                  prescription ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 group-hover/upload:scale-110 group-hover/upload:text-indigo-600"
                                )}>
                                  {prescription ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                                </div>
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  prescription ? "text-emerald-600" : "text-slate-600 dark:text-slate-400"
                                )}>
                                  {prescription ? prescription.name : 'Upload Prescription'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setStep(2)}
                          className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 dark:shadow-indigo-500/20"
                        >
                          <span>Continue to Delivery Details</span>
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                      >
                        <div className="space-y-2">
                          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Where should we deliver?</h3>
                          <p className="text-slate-500 text-sm font-medium">Enter your contact and address details.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-2">Full Name</label>
                              <input
                                required
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] px-8 py-5 outline-none transition-all font-bold text-slate-900 dark:text-white shadow-inner"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-2">Phone / WhatsApp (Optional)</label>
                              <input
                                name="whatsapp"
                                value={formData.whatsapp}
                                onChange={handleChange}
                                placeholder="WhatsApp number"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] px-8 py-5 outline-none transition-all font-bold text-slate-900 dark:text-white shadow-inner"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-2">City</label>
                              <input
                                required
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="Your city"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] px-8 py-5 outline-none transition-all font-bold text-slate-900 dark:text-white shadow-inner"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-2">Pin Code</label>
                              <input
                                required
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                                placeholder="6-digit PIN"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] px-8 py-5 outline-none transition-all font-bold text-slate-900 dark:text-white shadow-inner"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 ml-2">Full Delivery Address</label>
                            <textarea
                              required
                              name="address"
                              value={formData.address}
                              onChange={handleChange}
                              placeholder="House No, Street, Landmark, Area..."
                              rows={4}
                              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-[1.5rem] sm:rounded-[2rem] px-8 py-6 outline-none transition-all font-bold text-lg text-slate-900 dark:text-white shadow-xl shadow-indigo-500/5 resize-none"
                            />
                          </div>
                        </div>

                        {/* Delivery Options Section */}
                        <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-2">Delivery Method</label>
                                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                                  <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Select One</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, deliveryType: 'express', timeSlot: 'ASAP' })}
                                  className={cn(
                                    "relative p-6 rounded-[2rem] border-2 transition-all text-left group overflow-hidden",
                                    formData.deliveryType === 'express'
                                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-xl shadow-indigo-500/10"
                                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200"
                                  )}
                                >
                                  <div className="relative z-10">
                                    <div className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
                                      formData.deliveryType === 'express' ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600"
                                    )}>
                                      <Zap className="w-5 h-5" />
                                    </div>
                                    <h4 className={cn(
                                      "text-sm font-black uppercase tracking-tight mb-1",
                                      formData.deliveryType === 'express' ? "text-indigo-600" : "text-slate-900 dark:text-white"
                                    )}>Express Delivery</h4>
                                    <p className="text-[10px] text-slate-500 font-bold">Within 60 minutes</p>
                                  </div>
                                  {formData.deliveryType === 'express' && (
                                    <motion.div 
                                      layoutId="active-delivery"
                                      className="absolute top-4 right-4"
                                    >
                                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                    </motion.div>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, deliveryType: 'standard', timeSlot: 'Morning (9 AM - 12 PM)' })}
                                  className={cn(
                                    "relative p-6 rounded-[2rem] border-2 transition-all text-left group overflow-hidden",
                                    formData.deliveryType === 'standard'
                                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-xl shadow-indigo-500/10"
                                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200"
                                  )}
                                >
                                  <div className="relative z-10">
                                    <div className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
                                      formData.deliveryType === 'standard' ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600"
                                    )}>
                                      <Package className="w-5 h-5" />
                                    </div>
                                    <h4 className={cn(
                                      "text-sm font-black uppercase tracking-tight mb-1",
                                      formData.deliveryType === 'standard' ? "text-indigo-600" : "text-slate-900 dark:text-white"
                                    )}>Standard Delivery</h4>
                                    <p className="text-[10px] text-slate-500 font-bold">Scheduled time slots</p>
                                  </div>
                                  {formData.deliveryType === 'standard' && (
                                    <motion.div 
                                      layoutId="active-delivery"
                                      className="absolute top-4 right-4"
                                    >
                                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                    </motion.div>
                                  )}
                                </button>
                              </div>
                            </div>

                            <AnimatePresence mode="wait">
                              {formData.deliveryType === 'standard' && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="space-y-4 pt-4"
                                >
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-2">Select Preferred Time Slot</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                      'Morning (9 AM - 12 PM)',
                                      'Afternoon (12 PM - 4 PM)',
                                      'Evening (4 PM - 8 PM)',
                                      'Night (8 PM - 11 PM)'
                                    ].map((slot) => (
                                      <button
                                        key={slot}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, timeSlot: slot })}
                                        className={cn(
                                          "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all text-center flex items-center justify-center space-x-3",
                                          formData.timeSlot === slot
                                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                                            : "border-slate-100 dark:border-slate-800 text-slate-400 hover:border-indigo-200"
                                        )}
                                      >
                                        <Clock className="w-3 h-3" />
                                        <span>{slot}</span>
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                          >
                            Back
                          </button>
                          <motion.button
                            type="submit"
                            disabled={isSubmitting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "flex-[2] bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-sm flex items-center justify-center space-x-4 shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50 group",
                              isSubmitting && "animate-pulse"
                            )}
                          >
                            {isSubmitting ? (
                              <span className="uppercase tracking-widest">Processing...</span>
                            ) : (
                              <>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                <span className="uppercase tracking-widest">Proceed to Payment</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                      >
                        <div className="space-y-2">
                          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Choose Payment</h3>
                          <p className="text-slate-500 text-sm font-medium">Select your preferred payment method.</p>
                        </div>

                        <AnimatePresence mode="wait">
                          {paymentStep === 'selection' ? (
                            <motion.div 
                              key="selection"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="grid grid-cols-1 gap-4"
                            >
                              {[
                                { id: 'qr', name: 'Scan QR Code', icon: Smartphone, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: 'Instant Scan & Pay' },
                                { id: 'upi', name: 'UPI ID Transfer', icon: Smartphone, color: 'text-violet-600', bg: 'bg-violet-50', sub: paymentSettings.upiId },
                              ].map((method) => (
                                <button
                                  key={method.id}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, paymentMethod: method.id as any })}
                                  className={cn(
                                    "relative p-6 rounded-[2rem] border-2 transition-all text-left flex items-center space-x-6 group overflow-hidden",
                                    formData.paymentMethod === method.id
                                      ? "border-indigo-600 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-500/10"
                                      : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-200"
                                  )}
                                >
                                  <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                                    formData.paymentMethod === method.id ? method.bg + " " + method.color : "bg-white dark:bg-slate-800 text-slate-400 group-hover:scale-110"
                                  )}>
                                    <method.icon className="w-7 h-7" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className={cn(
                                      "text-base font-black uppercase tracking-tight",
                                      formData.paymentMethod === method.id ? "text-indigo-600" : "text-slate-900 dark:text-white"
                                    )}>{method.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                      {method.sub}
                                    </p>
                                  </div>
                                  {formData.paymentMethod === method.id && (
                                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                      <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                </button>
                              ))}

                              {/* Payment Details Display */}
                              <div className="mt-4 p-6 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 text-center space-y-4">
                                {formData.paymentMethod === 'qr' ? (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Scan with GPay / PhonePe / Paytm</p>
                                    <div className="bg-white p-6 rounded-3xl inline-block shadow-xl border-4 border-white">
                                      {paymentSettings.qrImageBase64 ? (
                                        <img 
                                          src={paymentSettings.qrImageBase64} 
                                          alt="Payment QR Code" 
                                          className="w-[200px] h-[200px] object-contain rounded-xl mx-auto"
                                        />
                                      ) : (
                                        <QRCodeCanvas 
                                          value={`upi://pay?pa=${paymentSettings.upiId}&pn=${paymentSettings.merchantName}&am=${finalTotal}&cu=INR`}
                                          size={200}
                                          level="H"
                                          includeMargin={false}
                                        />
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Or Pay to UPI ID</p>
                                      <div className="flex items-center justify-center space-x-2">
                                        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                          <span className="text-sm font-black text-slate-900 dark:text-white select-all">{paymentSettings.upiId}</span>
                                        </div>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(paymentSettings.upiId);
                                            toast.success('UPI ID Copied!');
                                          }}
                                          className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                                        >
                                          <Smartphone className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Amount: ₹{finalTotal}</p>
                                  </div>
                                ) : (
                                  <div className="space-y-4 py-8">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Copy UPI ID below</p>
                                    <div className="bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl inline-block border-2 border-indigo-200 dark:border-indigo-800 shadow-sm">
                                      <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight select-all">{paymentSettings.upiId}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pay ₹{finalTotal} & upload screenshot on WhatsApp</p>
                                  </div>
                                )}

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                                  <label className="flex items-start space-x-4 cursor-pointer group p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="relative mt-1">
                                      <input
                                        type="checkbox"
                                        checked={hasConfirmedPayment}
                                        onChange={(e) => setHasConfirmedPayment(e.target.checked)}
                                        className="peer sr-only"
                                      />
                                      <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 rounded-lg group-hover:border-indigo-400 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight text-left">I have completed the payment</p>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-left mt-1">I have the transaction screenshot ready to upload on WhatsApp for verification</p>
                                    </div>
                                  </label>
                                </div>
                              </div>

                              <div className="flex gap-4 pt-4">
                                <button
                                  type="button"
                                  onClick={() => setStep(2)}
                                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                                >
                                  Back
                                </button>
                                <motion.button
                                  type="button"
                                  onClick={handleFinalConfirm}
                                  disabled={!hasConfirmedPayment}
                                  whileHover={hasConfirmedPayment ? { scale: 1.02 } : {}}
                                  whileTap={hasConfirmedPayment ? { scale: 0.98 } : {}}
                                  className={cn(
                                    "flex-[2] py-6 rounded-[2rem] font-black text-sm flex items-center justify-center space-x-4 shadow-xl transition-all group",
                                    hasConfirmedPayment 
                                      ? "bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700" 
                                      : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                                  )}
                                >
                                  <Sparkles className={cn("w-5 h-5 transition-transform", hasConfirmedPayment && "group-hover:rotate-12")} />
                                  <span className="uppercase tracking-widest">Confirm & Send Order</span>
                                </motion.button>
                              </div>
                            </motion.div>
                          ) : paymentStep === 'processing' ? (
                            <motion.div 
                              key="processing"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-center py-20 space-y-8"
                            >
                              <div className="relative mx-auto w-32 h-32">
                                <motion.div 
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="absolute inset-0 border-[6px] border-indigo-100 dark:border-indigo-900 border-t-indigo-600 rounded-full"
                                />
                                <div className="absolute inset-4 bg-indigo-50 dark:bg-indigo-900/40 rounded-full flex items-center justify-center">
                                  <ShieldCheck className="w-12 h-12 text-indigo-600 animate-pulse" />
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase tracking-widest">Securely Processing</h3>
                                <p className="text-slate-500 font-medium text-sm max-w-xs mx-auto">Please do not refresh or close this window while we verify your payment with the gateway.</p>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="success"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-center py-20 space-y-8"
                            >
                              <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white shadow-2xl shadow-emerald-500/40">
                                <CheckCircle2 className="w-12 h-12" />
                              </div>
                              <div className="space-y-4">
                                <h3 className="text-[2.5rem] font-black text-slate-900 dark:text-white tracking-tighter leading-tight">Payment Successful!</h3>
                                <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">Redirecting you to WhatsApp to track your delivery partner...</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </div>

              {/* Sidebar Summary */}
              <div className="md:w-72 bg-slate-50/50 dark:bg-slate-950/30 p-6 sm:p-10 md:p-12 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-50 dark:border-slate-800/50">
                <div className="space-y-6 sm:space-y-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 h-10 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                      <ShoppingBag className="w-4 h-4 sm:w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Order Total</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">₹{totalPrice}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery</span>
                        <span className={cn(
                          "text-sm font-black uppercase tracking-widest",
                          deliveryFee === 0 ? "text-emerald-500" : "text-slate-900 dark:text-white"
                        )}>
                          {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</div>
                      <div className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">₹{finalTotal}</div>
                    </div>

                    <div className="flex items-center space-x-2 text-emerald-500">
                      <Zap className="w-3 h-3 fill-current" />
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                        {deliveryFee === 0 ? 'Order > ₹999: Free Delivery Applied' : 'Order more for Free Delivery'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-3 text-slate-400">
                      <Package className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{cart.length} Items in Cart</span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-400">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {formData.paymentMethod === 'qr' ? 'QR Code Scan' : 'UPI ID Payment'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-12 space-y-6">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center space-x-3 mb-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Secure Order</span>
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold leading-relaxed">Your data is encrypted and sent directly to our pharmacy team.</p>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4 grayscale opacity-30">
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                  <Activity className="w-6 h-6 text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Real-time Tracking</h5>
                  <p className="text-[10px] text-slate-400 font-bold">Follow your order live on WhatsApp</p>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 hidden md:block" />
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">24/7 Support</h5>
                  <p className="text-[10px] text-slate-400 font-bold">Help is just a message away</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
