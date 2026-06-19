import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Heart, Users, Globe, Award } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const About: React.FC = () => {
  const [content, setContent] = useState({
    mission: 'To provide real-time, accurate price comparisons across all major online pharmacies, ensuring you never overpay for essential medications. We believe healthcare is a right, not a luxury.',
    vision: 'Our mission is to make healthcare affordable and accessible by providing transparent pricing information.'
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'content', 'about'), (doc) => {
      if (doc.exists()) {
        setContent(doc.data() as any);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 sm:mb-24"
      >
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 sm:mb-8 tracking-tighter leading-tight">
          Empowering Healthcare <br />
          <span className="text-rose-600">Transparency</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed px-4">
          QuickPill is India's leading medicine price comparison platform, dedicated to making healthcare affordable and accessible for everyone through technology and data.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-32">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-rose-500/5 transition-all duration-500 group"
        >
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">Our Mission</h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {content.mission}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-500 group"
        >
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">Our Vision</h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {content.vision}
          </p>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-slate-900 dark:bg-rose-600 rounded-[2.5rem] sm:rounded-[4rem] p-10 sm:p-16 md:p-24 text-white text-center relative overflow-hidden shadow-2xl"
      >
        <div className="relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 sm:mb-8 tracking-tight">Trusted by 10,000+ Users</h2>
          <p className="text-lg sm:text-xl text-slate-300 dark:text-rose-100 mb-12 sm:mb-16 max-w-2xl mx-auto font-medium">
            Join thousands of smart shoppers who save up to 40% on their monthly medicine bills using QuickPill.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <p className="text-5xl sm:text-6xl font-black mb-2 tracking-tighter">40%</p>
              <p className="text-[10px] sm:text-sm font-black uppercase tracking-widest text-slate-400 dark:text-rose-200">Avg. Savings</p>
            </div>
            <div className="text-center">
              <p className="text-5xl sm:text-6xl font-black mb-2 tracking-tighter">50+</p>
              <p className="text-[10px] sm:text-sm font-black uppercase tracking-widest text-slate-400 dark:text-rose-200">Cities Covered</p>
            </div>
            <div className="text-center">
              <p className="text-5xl sm:text-6xl font-black mb-2 tracking-tighter">4.8/5</p>
              <p className="text-[10px] sm:text-sm font-black uppercase tracking-widest text-slate-400 dark:text-rose-200">User Rating</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full -mr-64 -mt-64 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-400/10 rounded-full -ml-64 -mb-64 blur-3xl" />
      </motion.div>
    </div>
  );
};
