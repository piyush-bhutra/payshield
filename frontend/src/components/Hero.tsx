import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, ExternalLink } from "lucide-react";

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-8 pb-6 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-[#36D6D0]/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-3xl mx-auto flex flex-col items-center"
      >
        {/* Dimensional Shield Graphic */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#142842] via-[#101F33] to-[#0B1728] border border-[#36D6D0]/30 shadow-xl shadow-[#36D6D0]/15 flex items-center justify-center relative overflow-hidden group">
            {/* Subtle light sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
            <svg
              className="w-9 h-9 text-[#36D6D0]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          {/* Subtle outer ping ring */}
          <div className="absolute -inset-1 rounded-2xl border border-[#36D6D0]/20 pointer-events-none" />
        </div>

        {/* Hero Title & Pitch */}
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
          Pause before you <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D6D0] to-[#38BDF8]">pay</span>.
        </h1>

        <p className="text-base sm:text-lg text-slate-300 font-normal max-w-xl mx-auto mb-5 leading-relaxed">
          Understand suspicious SMS, WhatsApp alerts, and UPI payment requests before you click, pay, or share credentials.
        </p>

        {/* Trust Badges Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-400 bg-[#0B1728]/80 py-2 px-4 rounded-full border border-[#1E324D] shadow-sm">
          <span className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-[#36D6D0]" />
            <span>Synthetic Data Only</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Never Opens Suspicious Links</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="flex items-center space-x-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Offline Awareness Aid</span>
          </span>
        </div>
      </motion.div>
    </section>
  );
};
