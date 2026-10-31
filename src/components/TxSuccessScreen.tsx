import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, Check, Sparkles, PartyPopper, Clock, CheckCircle2 } from 'lucide-react';

interface TxSuccessScreenProps {
  message?: string;
  onBack: () => void;
}

export const TxSuccessScreen: React.FC<TxSuccessScreenProps> = ({ message, onBack }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; delay: number }>>([]);

  useEffect(() => {
    // Elegant celebratory sparkle particles in emerald, teal, and gold tones
    const colors = ['#10b981', '#059669', '#14b8a6', '#0d9488', '#f59e0b', '#34d399'];
    const newParticles = Array.from({ length: 18 }).map((_, i) => {
      const angle = (i / 18) * Math.PI * 2;
      const distance = 58 + Math.random() * 60;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        color: colors[i % colors.length],
        size: 5 + Math.random() * 5,
        delay: 0.1 + Math.random() * 0.2,
      };
    });
    setParticles(newParticles);
  }, []);

  return (
    <div
      id="success-screen-container"
      className="min-h-screen max-w-md mx-auto flex flex-col justify-between items-center p-5 sm:p-6 bg-[#f4f5f8] text-slate-900 text-center font-sans relative overflow-hidden"
    >
      {/* Top subtle light gradient accent */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-b from-emerald-100/70 via-teal-50/40 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Main Content Area */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-auto z-10 py-4">
        
        {/* Animated Success Badge with celebration particles */}
        <div className="relative flex items-center justify-center my-4">
          {/* Outer Pulsing Emerald Aura Rings */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.8, 1.45, 1.2], opacity: [0, 0.35, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute w-32 h-32 rounded-full bg-emerald-400/20 border border-emerald-500/30 pointer-events-none"
          />

          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.8, 1.6, 1.3], opacity: [0, 0.2, 0] }}
            transition={{ duration: 2.5, delay: 0.35, repeat: Infinity, ease: 'easeOut' }}
            className="absolute w-36 h-36 rounded-full bg-teal-400/20 border border-teal-500/25 pointer-events-none"
          />

          {/* Bursting Confetti / Sparkle Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{
                x: p.x,
                y: p.y,
                scale: [0, 1.2, 0.8, 0],
                opacity: [0, 1, 0.9, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 1.2,
                delay: p.delay,
                ease: [0.175, 0.885, 0.32, 1.275],
              }}
              style={{
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
              }}
              className="absolute rounded-full shadow-xs pointer-events-none z-10"
            />
          ))}

          {/* Central 3D Emerald Success Circle */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 18,
              delay: 0.05,
            }}
            className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-1 shadow-xl shadow-emerald-500/25 flex items-center justify-center z-20"
          >
            {/* Inner bevel ring */}
            <div className="w-full h-full rounded-full bg-emerald-500/30 border border-white/50 backdrop-blur-xs flex items-center justify-center relative overflow-hidden">
              {/* Shimmer effect */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12"
              />

              {/* Scale-in Crisp Checkmark */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.25, 1], opacity: 1 }}
                transition={{ delay: 0.22, duration: 0.45, ease: 'backOut' }}
                className="text-white drop-shadow-md flex items-center justify-center"
              >
                <Check className="w-12 h-12 stroke-[3.5]" />
              </motion.div>
            </div>

            {/* Floating Sparkle Accent Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1], rotate: [0, 15, 0] }}
              transition={{ delay: 0.4, duration: 0.35 }}
              className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 p-1.5 rounded-full border-2 border-white shadow-md z-30 flex items-center justify-center"
            >
              <Sparkles size={13} className="fill-amber-950 text-amber-950" />
            </motion.div>
          </motion.div>
        </div>

        {/* Headings with high contrast & crisp styling */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="space-y-2 mt-3 z-10 w-full"
        >
          <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-3.5 py-1 rounded-full shadow-xs">
            <PartyPopper size={13} className="text-emerald-700" />
            <span>Success Confirmed</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Request Submitted!
          </h2>
          
          <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-xs mx-auto leading-relaxed">
            {message || 'Your deposit request has been submitted successfully and is queued for verification.'}
          </p>
        </motion.div>

        {/* Transaction Security & Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}
          className="w-full bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl text-left space-y-3.5 mt-6 shadow-sm z-10"
        >
          {/* Live Status Row */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Live Status</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Clock size={11} className="text-emerald-600" />
              In Escrow Queue
            </span>
          </div>

          {/* Escrow Protection Info */}
          <div className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600">
              <ShieldCheck size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">Escrow Protection</span>
              <span>
                Your funds remain fully protected. Standard verification takes between <strong className="text-slate-900 font-bold">1 to 5 minutes</strong> during trading windows.
              </span>
            </div>
          </div>

          {/* Progress Tracking Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 font-mono bg-slate-50/80 rounded-xl px-3 py-2 border border-slate-100">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span>Track progress in your Wallet history tab anytime</span>
          </div>
        </motion.div>

      </div>

      {/* Modern Emerald Primary Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.4 }}
        className="w-full pt-4 pb-2 z-10"
      >
        <button
          id="back-to-wallet-dashboard"
          onClick={onBack}
          className="w-full relative group overflow-hidden flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 active:scale-[0.98] cursor-pointer"
        >
          {/* Subtle shimmer animation */}
          <div className="absolute inset-0 w-1/2 h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out" />
          
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to Dashboard</span>
        </button>
      </motion.div>

    </div>
  );
};

export default TxSuccessScreen;
