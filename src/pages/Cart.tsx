import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Trash2, ArrowRight, Minus, Plus, ShoppingBag, ArrowLeft, Pill } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export const Cart: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
  const navigate = useNavigate();

  const handleUpdateQuantity = (id: string, delta: number) => {
    updateQuantity(id, delta);
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-[#FDFDFD] dark:bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link to="/" className="flex items-center space-x-3 text-slate-500 hover:text-indigo-600 transition-colors mb-6 font-black uppercase tracking-widest text-xs group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
              <span>Back to Shopping</span>
            </Link>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center space-x-4 sm:space-x-6">
              <div className="w-10 h-10 sm:w-16 h-16 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                <ShoppingBag className="w-5 h-5 sm:w-8 h-8 text-white" />
              </div>
              <span>Your Cart</span>
            </h1>
          </motion.div>

          {cart.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearCart}
              className="px-8 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all border border-slate-200 dark:border-slate-700 hover:border-red-100 dark:hover:border-red-900/30"
            >
              Clear Entire Cart
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="popLayout">
              {cart.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-slate-900 rounded-[2.5rem] sm:rounded-[4rem] p-10 sm:p-20 text-center border border-slate-100 dark:border-slate-800 shadow-xl"
                >
                  <div className="w-20 h-20 sm:w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-[1.5rem] sm:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 sm:mb-10">
                    <ShoppingCart className="w-10 h-10 sm:w-16 h-16 text-indigo-200 dark:text-indigo-800" />
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4 sm:mb-6 tracking-tight">Your cart is empty</h2>
                  <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-medium mb-8 sm:mb-12 max-w-sm mx-auto leading-relaxed">
                    Looks like you haven't added any medicines yet. Start comparing prices to find the best deals!
                  </p>
                  <Link 
                    to="/search"
                    className="inline-flex items-center space-x-3 sm:space-x-4 bg-indigo-600 text-white px-8 sm:px-12 py-4 sm:py-6 rounded-2xl sm:rounded-[2rem] font-black text-base sm:text-lg uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/30"
                  >
                    <span>Start Searching</span>
                    <ArrowRight className="w-5 h-5 sm:w-6 h-6" />
                  </Link>
                </motion.div>
              ) : (
                cart.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 relative z-10">
                      <div className="w-20 h-20 sm:w-28 h-28 bg-indigo-50 dark:bg-indigo-900/20 rounded-[1.5rem] sm:rounded-[2.5rem] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                        <div className="relative">
                          <Pill className="w-10 h-10 sm:w-14 h-14 text-indigo-600 dark:text-indigo-400" />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 h-5 bg-accent-500 rounded-full border-2 border-white dark:border-slate-900"
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 w-full">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
                          <div className="text-center md:text-left">
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 group-hover:text-indigo-600 transition-colors">{item.name}</h3>
                            <div className="flex items-center justify-center md:justify-start space-x-3 sm:space-x-4">
                              <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30">
                                {item.platform}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500">Unit: ₹{item.price}</span>
                            </div>
                          </div>
                          <div className="text-center md:text-right">
                            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Subtotal</p>
                            <p className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">₹{item.price * item.quantity}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 pt-6 sm:pt-8 border-t border-slate-50 dark:border-slate-800/50">
                          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-[1.5rem] p-1.5 sm:p-2 border border-slate-100 dark:border-slate-700/50 shadow-sm">
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="w-10 h-10 sm:w-12 h-12 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded-lg sm:rounded-2xl transition-all text-slate-500 hover:text-indigo-600 active:scale-90"
                            >
                              <Minus className="w-4 h-4 sm:w-5 h-5" />
                            </button>
                            <span className="w-12 sm:w-16 text-center text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="w-10 h-10 sm:w-12 h-12 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded-lg sm:rounded-2xl transition-all text-slate-500 hover:text-indigo-600 active:scale-90"
                            >
                              <Plus className="w-4 h-4 sm:w-5 h-5" />
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="flex items-center space-x-2 sm:space-x-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] group/remove"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 h-5 group-hover/remove:scale-110 transition-transform" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Background Accent */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950 dark:bg-indigo-600 rounded-[2.5rem] sm:rounded-[4rem] p-8 sm:p-12 text-white shadow-[0_40px_80px_rgba(0,0,0,0.2)] sticky top-32 overflow-hidden group border border-white/5"
            >
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-black mb-8 sm:mb-10 tracking-tighter">Summary</h2>
                
                <div className="space-y-6 sm:space-y-8 mb-10 sm:mb-12">
                  <div className="flex justify-between text-indigo-100/70 font-bold text-lg sm:text-xl">
                    <span>Subtotal</span>
                    <span className="text-white font-black">₹{totalPrice}</span>
                  </div>
                  <div className="flex justify-between text-indigo-100/70 font-bold text-lg sm:text-xl">
                    <span>Delivery</span>
                    <span className="text-accent-400 font-black">FREE</span>
                  </div>
                  <div className="h-px bg-white/10 my-8 sm:my-10" />
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-200 mb-1">Total Amount</p>
                      <p className="text-4xl sm:text-5xl font-black tracking-tighter">₹{totalPrice}</p>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/express-delivery')}
                  disabled={cart.length === 0}
                  className="w-full bg-white text-slate-950 py-5 sm:py-7 rounded-2xl sm:rounded-[2rem] font-black text-lg sm:text-xl uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-2xl flex items-center justify-center space-x-3 sm:space-x-4 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-6 h-6 sm:w-7 h-7 group-hover/btn:translate-x-2 transition-transform" />
                </motion.button>
                
                <p className="text-center mt-10 text-xs font-black uppercase tracking-widest text-indigo-200/30">
                  Secure SSL Encrypted
                </p>
              </div>

              {/* Background Glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-40 blur-[100px] group-hover:bg-white/10 transition-colors" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-400/10 rounded-full -ml-40 -mb-40 blur-[100px]" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
