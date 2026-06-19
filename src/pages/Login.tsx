import React from 'react';
import { motion } from 'motion/react';
import { Pill, LogIn, Shield, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminLogin = searchParams.get('admin') === 'true';

  const [error, setError] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAdminPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Simple hardcoded check as requested for "username and password"
    // In a real app, this would use Firebase Auth email/password or a custom backend
    if (username === 'admin' && password === 'admin@123') {
      // We still need a Firebase user session for the rest of the app to work securely
      // But for this specific request, we'll simulate the admin session
      // or redirect to admin with a "bypass" flag (not recommended for production)
      
      // Better: Tell the user how to enable Email/Password in Firebase Console
      // For now, we'll just allow them to "sign in" locally for the demo
      localStorage.setItem('isAdminAuthenticated', 'true');
      toast.success('Admin authenticated successfully');
      navigate('/admin');
    } else {
      setError('Invalid admin credentials');
    }
    setIsSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      const user = await signInWithGoogle();
      
      // Create or update user profile
      const userRef = doc(db, 'users', user.uid);
      const path = `users/${user.uid}`;
      
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
      
      if (userSnap && !userSnap.exists()) {
        try {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else if (userSnap) {
        try {
          await setDoc(userRef, {
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      }

      if (isAdminLogin && user.email === 'amarjeetbth2@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError('Failed to sign in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-64 -left-64 w-[800px] h-[800px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-64 -right-64 w-[800px] h-[800px] bg-accent-500/5 dark:bg-accent-500/10 rounded-full blur-[120px]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[4rem] p-16 shadow-[0_50px_100px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 relative z-10 backdrop-blur-3xl"
      >
        <div className="text-center mb-16">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            className={cn(
              "w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl transition-all duration-700 shadow-indigo-500/20",
              isAdminLogin 
                ? "bg-amber-600 shadow-amber-500/20" 
                : "bg-indigo-600 shadow-indigo-500/20"
            )}
          >
            {isAdminLogin ? <Shield className="text-white w-12 h-12" /> : <Pill className="text-white w-12 h-12 animate-pulse" />}
          </motion.div>
          <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-none">
            {isAdminLogin ? "Admin Portal" : "Welcome Back"}
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {isAdminLogin 
              ? "Authorized personnel only. Please sign in to manage the platform." 
              : "Sign in to access your personalized dashboard and history."}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-[2rem] flex items-center space-x-4 border border-red-100 dark:border-red-900/30 shadow-sm shadow-red-500/5"
          >
            <AlertCircle className="w-6 h-6 shrink-0" />
            <span className="text-sm font-black uppercase tracking-widest">{error}</span>
          </motion.div>
        )}

        {isAdminLogin ? (
          <form onSubmit={handleAdminPasswordLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 ml-4">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin Username"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-amber-500 rounded-[2rem] px-8 py-5 outline-none transition-all font-bold text-slate-900 dark:text-white shadow-inner"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 ml-4">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-amber-500 rounded-[2rem] px-8 py-5 outline-none transition-all font-bold text-slate-900 dark:text-white shadow-inner"
                required
              />
            </div>
            <motion.button 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-500/20 hover:bg-amber-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Login to Admin Center"}
            </motion.button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-white dark:bg-slate-900 px-4 text-slate-400">Or</span>
              </div>
            </div>

            <motion.button 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center space-x-5 border-2 border-slate-100 dark:border-slate-800 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all duration-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
              <span>Sign in with Google</span>
            </motion.button>
          </form>
        ) : (
          <motion.button 
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-5 border-2 border-slate-100 dark:border-slate-800 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all duration-500 shadow-sm hover:shadow-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
            <span>Continue with Google</span>
          </motion.button>
        )}

        {!isAdminLogin && (
          <div className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800 text-center">
            <button 
              onClick={() => navigate('/login?admin=true')}
              className="text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center mx-auto uppercase tracking-[0.25em] group"
            >
              <Shield className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
              Access Admin Portal
            </button>
          </div>
        )}

        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-700 mt-12">
          Secure Authentication Powered by Google
        </p>
      </motion.div>
    </div>
  );
};

