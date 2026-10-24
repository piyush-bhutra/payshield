import React, { useState } from "react";
import { CheckSquare, Square, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import type { RiskLabel } from "../types/api";

interface AdviceChecklistProps {
  advice: string[];
  riskLabel: RiskLabel;
}

export const AdviceChecklist: React.FC<AdviceChecklistProps> = ({
  advice,
  riskLabel,
}) => {
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  const toggleCheck = (index: number) => {
    setCompleted((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const isHigh = riskLabel === "High";
  const isMed = riskLabel === "Medium";

  const config = {
    High: {
      border: "border-rose-500/40",
      headerBg: "bg-rose-500/15",
      badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      icon: ShieldAlert,
      title: "Urgent: Safe Next Steps",
      subtext: "Multiple warning signs were detected. Do not act until you verify independently.",
    },
    Medium: {
      border: "border-amber-500/40",
      headerBg: "bg-amber-500/15",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      icon: AlertTriangle,
      title: "Recommended Precautions",
      subtext: "Some warning signs were detected. Verify before acting.",
    },
    Low: {
      border: "border-emerald-500/30",
      headerBg: "bg-emerald-500/10",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      icon: CheckCircle2,
      title: "Standard Verification Guidelines",
      subtext: "No warning signs were found in this message. Still verify through the official app or number.",
    },
  }[riskLabel] || {
    border: "border-[#1E324D]",
    headerBg: "bg-[#101F33]",
    badge: "bg-[#101F33] text-slate-300 border-[#1E324D]",
    icon: CheckCircle2,
    title: "Safe Next Steps",
    subtext: "Always double-check unexpected payment requests.",
  };

  const Icon = config.icon;

  return (
    <div className={`surface-card rounded-2xl border ${config.border} overflow-hidden shadow-lg transition-all`}>
      {/* Header banner */}
      <div className={`p-4 ${config.headerBg} border-b border-[#1E324D] flex items-start space-x-3`}>
        <div className="w-8 h-8 rounded-xl bg-[#07111F] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#1E324D]">
          <Icon className={`w-4 h-4 ${isHigh ? "text-rose-400" : isMed ? "text-amber-400" : "text-emerald-400"}`} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            {config.title}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            {config.subtext}
          </p>
        </div>
      </div>

      {/* Checklist items */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
          <span>What to do now (tap to check off completed steps):</span>
          <span>{Object.values(completed).filter(Boolean).length} of {advice.length} done</span>
        </div>

        {advice.map((item, index) => {
          const isDone = Boolean(completed[index]);
          return (
            <button
              key={index}
              type="button"
              onClick={() => toggleCheck(index)}
              className={`w-full p-3 rounded-xl border text-left transition-all duration-200 flex items-start space-x-3 ${
                isDone
                  ? "bg-[#0B1728]/60 border-[#1E324D] opacity-60 line-through text-slate-400"
                  : isHigh
                  ? "bg-[#101F33] border-rose-500/20 text-slate-100 hover:border-rose-500/40 hover:bg-[#142842]"
                  : "bg-[#101F33] border-[#1E324D] text-slate-100 hover:border-[#2A4468] hover:bg-[#142842]"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36D6D0] cursor-pointer`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                )}
              </div>
              <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
                {item}
              </div>
            </button>
          );
        })}

        {/* Official helpline helper for high-risk */}
        {isHigh && (
          <div className="mt-3 p-3 rounded-xl bg-[#07111F] border border-rose-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-rose-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span>National Cybercrime Helpline: 1930</span>
            </div>
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#36D6D0] hover:underline flex items-center space-x-1"
            >
              <span>cybercrime.gov.in</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
