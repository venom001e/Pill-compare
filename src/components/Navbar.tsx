import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Pill, X, Moon, Sun, Info, Home, Search, Upload, MoreVertical, Shield, MessageCircle, ShoppingCart, Truck, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { auth, logout } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  const isAdmin = user?.email === 'amarjeetbth2@gmail.com' || localStorage.getItem('isAdminAuthenticated') === 'true';

  const menuItems = [
    { icon: Home, label: 'Home', path: '/', color: 'text-indigo-500', hoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-500/10', hoverText: 'hover:text-indigo-600 dark:hover:text-indigo-400' },
    { icon: Search, label: 'Search', path: '/search', color: 'text-emerald-500', hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10', hoverText: 'hover:text-emerald-600 dark:hover:text-emerald-400' },
    { icon: Upload, label: 'Scan Prescription', path: '/upload', color: 'text-amber-500', hoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-500/10', hoverText: 'hover:text-amber-600 dark:hover:text-amber-400' },
    { icon: Truck, label: 'Find Vehicles', path: '/vehicle-owners', color: 'text-rose-500', hoverBg: 'hover:bg-rose-50 dark:hover:bg-rose-500/10', hoverText: 'hover:text-rose-600 dark:hover:text-rose-400' },
  ];

  if (isAdmin) {
    menuItems.push({ icon: Shield, label: 'Admin', path: '/admin', color: 'text-violet-500', hoverBg: 'hover:bg-violet-50 dark:hover:bg-violet-500/10', hoverText: 'hover:text-violet-600 dark:hover:text-violet-400' });
  }

  menuItems.push({ icon: Info, label: 'About Us', path: '/about', color: 'text-sky-500', hoverBg: 'hover:bg-sky-50 dark:hover:bg-sky-500/10', hoverText: 'hover:text-sky-600 dark:hover:text-sky-400' });

  const handleHelpClick = () => {
    window.open('https://wa.me/917992269620', '_blank');
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('isAdminAuthenticated');
      navigate('/');
      setIsOpen(false);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 sm:w-11 h-11 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 dark:shadow-none transition-all"
          >
            <Pill className="text-white w-5 h-5 sm:w-6 h-6" />
          </motion.div>
          <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">QuickPill</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-8">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center space-x-2 text-slate-600 dark:text-slate-400 transition-all font-bold group",
                item.hoverText
              )}
            >
              <motion.div
                whileHover={{ y: -3, scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <item.icon className={cn("w-5 h-5", item.color)} />
              </motion.div>
              <span className="text-sm uppercase tracking-widest">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleTheme()}
            className="hidden md:flex p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700/50"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5 sm:w-6 h-6" /> : <Sun className="w-5 h-5 sm:w-6 h-6" />}
          </motion.button>

          {!user ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="hidden md:flex px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-indigo-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
            >
              Login
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="hidden md:flex px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700/50"
            >
              Logout
            </motion.button>
          )}

          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/cart')}
              className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700/50 relative"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 h-5 bg-indigo-600 text-white text-[8px] sm:text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 animate-in zoom-in">
                  {totalItems}
                </span>
              )}
            </motion.button>
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(!isOpen)}
            className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700/50"
          >
            {isOpen ? <X className="w-5 h-5 sm:w-6 h-6" /> : <MoreVertical className="w-5 h-5 sm:w-6 h-6" />}
          </motion.button>
        </div>
      </div>
    </nav>

    {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white dark:bg-[#0F172A] z-[70] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Decorative Background Colors */}
              <div className="absolute top-0 right-0 w-full h-64 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-tr from-accent-500/5 via-transparent to-transparent pointer-events-none" />

              <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <Pill className="text-white w-4 h-4" />
                    </div>
                    <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Menu</span>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

              <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {menuItems.map((item) => (
                  <motion.div
                    key={item.path}
                    whileHover={{ x: 8 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 p-4 rounded-2xl text-slate-600 dark:text-slate-400 transition-all font-bold group",
                        item.hoverBg,
                        item.hoverText
                      )}
                    >
                      <motion.div
                        whileHover={{ rotate: 5, scale: 1.1, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        className={cn("transition-transform", item.color)}
                      >
                        <item.icon className="w-5 h-5" />
                      </motion.div>
                      <span>{item.label}</span>
                    </Link>
                  </motion.div>
                ))}

                <motion.div
                  whileHover={{ x: 8 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    onClick={handleHelpClick}
                    className="w-full flex items-center space-x-3 p-4 rounded-2xl hover:bg-accent-50 dark:hover:bg-accent-900/20 text-slate-600 dark:text-slate-400 hover:text-accent-600 dark:hover:text-accent-400 transition-all font-bold group"
                  >
                    <motion.div
                      whileHover={{ rotate: 5, scale: 1.1, y: -2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="transition-transform"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </motion.div>
                    <span>Help & Support</span>
                  </button>
                </motion.div>

                <motion.div
                  whileHover={{ x: 8 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    onClick={() => { toggleTheme(); setIsOpen(false); }}
                    className="w-full flex items-center space-x-3 p-4 rounded-2xl hover:bg-sky-50 dark:hover:bg-sky-900/20 text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-all font-bold group"
                  >
                    <motion.div
                      whileHover={{ rotate: 5, scale: 1.1, y: -2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="transition-transform text-sky-500"
                    >
                      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </motion.div>
                    <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                  </button>
                </motion.div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                {!user ? (
                  <button 
                    onClick={() => { navigate('/login?admin=true'); setIsOpen(false); }}
                    className="w-full flex items-center space-x-3 p-4 rounded-2xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all text-xs font-bold group"
                  >
                    <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Admin Access</span>
                  </button>
                ) : (
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 p-4 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all text-xs font-bold group"
                  >
                    <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Logout</span>
                  </button>
                )}
                <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
                  QuickPill v2.0
                </p>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
