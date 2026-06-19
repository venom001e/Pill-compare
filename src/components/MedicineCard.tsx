import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { MedicinePrice } from '../types';
import { ExternalLink, CheckCircle, XCircle, Tag, ShoppingCart, Pill, Activity, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

interface Props {
  medicineName: string;
  prices: MedicinePrice[];
}

export const MedicineCard: React.FC<Props> = ({ medicineName, prices }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = (price: MedicinePrice) => {
    addToCart({
      id: `${medicineName}-${price.platform}`,
      name: medicineName,
      platform: price.platform,
      price: price.price
    });
    
    toast.success(`Added to Cart`, {
      description: `${medicineName} from ${price.platform}`,
      action: {
        label: 'View Cart',
        onClick: () => navigate('/cart')
      },
      duration: 4000,
      className: "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-sans",
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 relative"
    >
      <div className="p-5 md:p-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 mb-8 md:mb-12">
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-inner shrink-0">
              <Pill className="text-indigo-600 dark:text-indigo-400 w-7 h-7 md:w-10 md:h-10" />
            </div>
            <div>
              <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight md:leading-none mb-1 md:mb-2">{medicineName}</h3>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Price Comparison</span>
                <div className="hidden md:block w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span className="text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400">{prices.length} Platforms</span>
              </div>
            </div>
          </div>
          
          <div className="self-start md:self-auto flex items-center space-x-3 bg-accent-50 dark:bg-accent-500/10 px-4 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl border border-accent-100 dark:border-accent-500/20">
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-accent-500 rounded-full animate-pulse" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-accent-600 dark:text-accent-400">Live Prices</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {prices.length > 0 ? (
            prices.sort((a, b) => a.price - b.price).map((price, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group flex flex-col lg:flex-row items-center justify-between p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-50 dark:border-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all duration-500 gap-6"
              >
                <div className="flex items-center space-x-4 md:space-x-8 w-full lg:w-auto">
                  <div className="relative">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm group-hover:scale-110 transition-transform duration-500 shrink-0">
                      {price.logo ? (
                        <img src={price.logo} alt={price.platform} className="w-8 h-8 md:w-10 md:h-10 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{price.platform[0]}</span>
                      )}
                    </div>
                    {idx === 0 && (
                      <div className="absolute -top-3 -left-3 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg shadow-emerald-500/20 border border-emerald-400">
                        Best Deal
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white truncate">{price.platform}</p>
                      {price.rating && (
                        <div className="flex items-center space-x-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/30">
                          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">{price.rating}</span>
                          <Activity className="w-2.5 h-2.5 text-amber-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <span className={cn(
                        "text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 md:px-3 py-1 rounded-lg",
                        price.available 
                          ? "bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400" 
                          : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                      )}>
                        {price.available ? 'In Stock' : 'Out of Stock'}
                      </span>
                      {price.deliveryTime && (
                        <div className="flex items-center space-x-1.5 text-slate-400 dark:text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] md:text-xs font-bold">{price.deliveryTime}</span>
                        </div>
                      )}
                    </div>
                    {price.offers && price.offers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {price.offers.map((offer, i) => (
                          <div key={i} className="flex items-center space-x-1.5 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                            <Tag className="w-2.5 h-2.5 text-indigo-500" />
                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">{offer}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center space-x-0 sm:space-x-6 md:space-x-8 space-y-4 sm:space-y-0 w-full lg:w-auto">
                  <div className="text-center sm:text-right w-full sm:w-auto">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Best Price</p>
                    <p className="text-3xl md:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">₹{price.price}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full sm:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => price.available && handleAddToCart(price)}
                      className={cn(
                        "flex items-center justify-center space-x-2 md:space-x-3 px-6 md:px-8 py-4 md:py-5 rounded-xl md:rounded-2xl font-black transition-all w-full sm:w-auto group/cart",
                        price.available
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-indigo-600 hover:text-white border border-slate-200 dark:border-slate-700 hover:border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-900 text-slate-300 cursor-not-allowed"
                      )}
                    >
                      <ShoppingCart className="w-4 h-4 md:w-5 h-5 group-hover/cart:scale-110 transition-transform" />
                      <span className="text-xs md:text-sm uppercase tracking-widest">Add</span>
                    </motion.button>

                    <a
                      href={price.available ? price.link : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center justify-center space-x-2 md:space-x-3 px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-black transition-all active:scale-95 w-full sm:w-auto shadow-2xl",
                        price.available
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                      )}
                      onClick={(e) => !price.available && e.preventDefault()}
                    >
                      <span className="text-xs md:text-sm uppercase tracking-widest">Buy Now</span>
                      <ExternalLink className="w-4 h-4 md:w-5 h-5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
               <AlertCircle className="w-10 h-10 text-slate-300 mb-4" />
               <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No deals found for this specific medicine</p>
               <p className="text-[10px] text-slate-400 mt-2">Try refining the medicine name or checking back later.</p>
            </div>
          )}
        </div>

        {/* Express Delivery Segment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.02 }}
          className="mt-10 md:mt-16 p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] bg-slate-950 dark:bg-indigo-600 text-white relative overflow-hidden group cursor-pointer shadow-[0_40px_80px_rgba(0,0,0,0.15)] border border-white/5"
          onClick={() => window.location.href = '/express-delivery'}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-6 md:gap-10">
              <motion.div 
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-20 h-20 md:w-28 md:h-28 bg-white/10 backdrop-blur-3xl rounded-2xl md:rounded-[2.5rem] flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all duration-700 shadow-2xl shrink-0"
              >
                <Activity className="w-10 h-10 md:w-14 md:h-14 text-indigo-400 group-hover:text-white transition-colors animate-pulse" />
              </motion.div>
              <div>
                <div className="inline-flex items-center space-x-2 bg-indigo-500/20 px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-indigo-500/30 mb-3 md:mb-4">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-indigo-400 rounded-full animate-ping" />
                  <span className="text-[8px] md:text-xs font-black uppercase tracking-widest text-indigo-200">Priority Service</span>
                </div>
                <h4 className="text-2xl md:text-4xl font-black tracking-tighter mb-1 md:mb-2 leading-none">Express Delivery</h4>
                <p className="text-indigo-100/70 font-medium text-base md:text-xl">Medicines in under 1 hour!</p>
              </div>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05, x: 10 }}
              whileTap={{ scale: 0.95 }}
              animate={{ 
                boxShadow: [
                  "0 0 0px rgba(255,255,255,0)",
                  "0 0 40px rgba(255,255,255,0.4)",
                  "0 0 0px rgba(255,255,255,0)"
                ],
                y: [0, -2, 0]
              }}
              transition={{ 
                boxShadow: { duration: 2, repeat: Infinity },
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-full md:w-auto bg-white text-slate-950 px-10 md:px-14 py-4 md:py-6 rounded-xl md:rounded-[2rem] font-black text-sm md:text-lg uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-2xl flex items-center justify-center space-x-3 md:space-x-4 group/btn"
            >
              <span>Order Now</span>
              <ArrowRight className="w-5 h-5 md:w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
            </motion.button>
          </div>
          
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full -mr-250 -mt-250 blur-[120px] pointer-events-none" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
            className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full -ml-250 -mb-250 blur-[120px] pointer-events-none" 
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
