import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Lightbulb, Tag } from "lucide-react";
import type { Signal } from "../types/api";

interface SignalListProps {
  signals: Signal[];
}

export const SignalList: React.FC<SignalListProps> = ({ signals }) => {
  if (!signals || signals.length === 0) {
    return (
      <div className="surface-subtle p-5 rounded-xl border border-emerald-500/20 text-center flex flex-col items-center justify-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <CheckCircle className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-emerald-300">
          No suspicious risk signals detected
        </p>
        <p className="text-xs text-slate-400 max-w-md">
          None of our phishing detection rules or known scam patterns triggered on this input. Remember to stay cautious with unexpected requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
          <span>Detected Warning Signals</span>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#101F33] text-[#36D6D0] border border-[#1E324D]">
            {signals.length}
          </span>
        </h3>
        <span className="text-[11px] text-slate-400">
          Ranked by severity weight
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {signals.map((signal, index) => {
          // Weight percentage calculation (capped at 100)
          const weightPercent = Math.min(100, Math.round((signal.weight / 40) * 100));

          return (
            <motion.div
              key={signal.id || index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              className="surface-card p-3.5 sm:p-4 rounded-xl border border-[#1E324D] hover:border-[#2A4468] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {signal.title}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      {signal.detail}
                    </p>
                  </div>
                </div>

                {/* Severity Badge */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/25">
                    +{signal.weight} pts
                  </span>
                </div>
              </div>

              {/* Weight Impact Bar */}
              <div className="w-full bg-[#07111F] h-1.5 rounded-full overflow-hidden my-2.5 border border-[#1E324D]/60">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${weightPercent}%` }}
                  transition={{ duration: 0.6, delay: 0.15 + index * 0.05 }}
                />
              </div>

              {/* Matched Phrases and Tip */}
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[#1E324D]/60 text-xs">
                {signal.matched && signal.matched.length > 0 && (
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 flex items-center">
                      <Tag className="w-3 h-3 mr-1 text-[#36D6D0]" />
                      Matched:
                    </span>
                    {signal.matched.map((m, mi) => (
                      <span
                        key={mi}
                        className="px-1.5 py-0.5 rounded bg-[#07111F] text-slate-300 font-mono text-[11px] border border-[#1E324D]"
                      >
                        "{m}"
                      </span>
                    ))}
                  </div>
                )}

                {signal.tip && (
                  <div className="w-full flex items-start space-x-1.5 mt-1 text-[11px] text-emerald-300/90 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Safety tip:</strong> {signal.tip}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
