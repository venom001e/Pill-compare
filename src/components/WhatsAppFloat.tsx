import React from 'react';
import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';

export const WhatsAppFloat: React.FC = () => {
  const whatsappNumber = '917992269620';
  const message = 'Hello QuickPill Support, I need help with...';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-8 right-8 z-[60] w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:bg-emerald-600 transition-colors group"
      title="Chat with QuickPill Support"
    >
      <MessageCircle className="w-8 h-8" />
      <span className="absolute right-full mr-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Chat with Support
      </span>
    </motion.a>
  );
};
