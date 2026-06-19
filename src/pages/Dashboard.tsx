import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Prescription, SearchHistory } from '../types';
import { FileText, Search, Clock, Activity, ChevronRight, Shield } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const user = auth.currentUser;
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searches, setSearches] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
        try {
          const pPath = 'prescriptions';
          const sPath = 'searches';
          const pQuery = query(
            collection(db, pPath), 
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const sQuery = query(
            collection(db, sPath),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(5)
          );

          const [pSnap, sSnap] = await Promise.all([
            getDocs(pQuery).catch(err => handleFirestoreError(err, OperationType.LIST, pPath)),
            getDocs(sQuery).catch(err => handleFirestoreError(err, OperationType.LIST, sPath))
          ]);
          
          if (pSnap) setPrescriptions(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
          if (sSnap) setSearches(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        } catch (err) {
          console.error('Dashboard data fetch failed:', err);
        } finally {
          setLoading(false);
        }
    };

    fetchData();
  }, [user]);

  if (!user) return null;

  const isAdmin = user.email === 'amarjeetbth2@gmail.com';

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6">
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link 
            to="/admin"
            className="inline-flex items-center space-x-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-6 py-3 rounded-2xl border border-amber-100 dark:border-amber-800 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all font-black uppercase tracking-widest text-[10px]"
          >
            <Shield className="w-4 h-4" />
            <span>Access Admin Panel</span>
          </Link>
        </motion.div>
      )}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-24"
      >
        <div className="flex items-center space-x-10">
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-accent-400 rounded-[3rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <img 
              src={user.photoURL || ''} 
              alt="User" 
              className="relative w-32 h-32 rounded-[2.8rem] border-4 border-white dark:border-slate-900 shadow-2xl object-cover" 
            />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent-500 rounded-2xl flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-6xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter leading-none">
              Hello, <span className="text-indigo-600 dark:text-indigo-400">{user.displayName?.split(' ')[0]}</span>
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium tracking-tight">{user.email}</p>
          </div>
        </div>
        <div className="flex space-x-8">
          <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center min-w-[180px] group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10"
          >
            <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400 mb-2 tracking-tighter">{prescriptions.length}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black">Total Scans</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center min-w-[180px] group transition-all duration-500 hover:shadow-2xl hover:shadow-accent-500/10"
          >
            <p className="text-5xl font-black text-accent-600 dark:text-accent-400 mb-2 tracking-tighter">{searches.length}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black">Searches</p>
          </motion.div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Recent Prescriptions */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center space-x-5">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <FileText className="text-indigo-600 dark:text-indigo-400 w-7 h-7" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Recent Scans</h3>
            </div>
            <button className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] hover:underline decoration-2 underline-offset-8">View All</button>
          </div>
          
          <div className="space-y-8">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] animate-pulse" />)
            ) : prescriptions.length > 0 ? (
              prescriptions.map((p, idx) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (idx * 0.1) }}
                  className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex items-center justify-between hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 cursor-pointer group"
                >
                  <div className="flex items-center space-x-8">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <FileText className="text-slate-300 dark:text-slate-600 w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
                        {p.extractedMedicines.slice(0, 2).join(', ')}
                        {p.extractedMedicines.length > 2 && '...'}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] flex items-center">
                        <Clock className="w-3 h-3 mr-2 text-indigo-500" /> 
                        {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 group-hover:shadow-lg group-hover:shadow-indigo-500/30">
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-24 bg-slate-50/50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                  <FileText className="text-slate-200 dark:text-slate-700 w-10 h-10" />
                </div>
                <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">No prescriptions scanned yet</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Recent Searches */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center space-x-5">
              <div className="w-14 h-14 bg-accent-50 dark:bg-accent-500/10 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Search className="text-accent-600 dark:text-accent-400 w-7 h-7" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Search History</h3>
            </div>
            <button className="text-accent-600 dark:text-accent-400 text-[10px] font-black uppercase tracking-[0.2em] hover:underline decoration-2 underline-offset-8">View All</button>
          </div>

          <div className="space-y-8">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] animate-pulse" />)
            ) : searches.length > 0 ? (
              searches.map((s, idx) => (
                <motion.div 
                   key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (idx * 0.1) }}
                  className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex items-center justify-between hover:border-accent-200 dark:hover:border-accent-500/30 hover:shadow-2xl hover:shadow-accent-500/5 transition-all duration-500 cursor-pointer group"
                >
                  <div className="flex items-center space-x-8">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <Search className="text-slate-300 dark:text-slate-600 w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2">{s.query}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] flex items-center">
                        <Clock className="w-3 h-3 mr-2 text-accent-500" /> 
                        {formatDate(s.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-accent-600 group-hover:text-white transition-all duration-500 group-hover:shadow-lg group-hover:shadow-accent-500/30">
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-24 bg-slate-50/50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                  <Search className="text-slate-200 dark:text-slate-700 w-10 h-10" />
                </div>
                <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">No searches performed yet</p>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
};
