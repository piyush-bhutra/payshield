import React from "react";
import { AlertCircle, CheckCircle2, HelpCircle, Sparkles } from "lucide-react";
import type { MessageSample } from "../types/api";

interface ExampleChipsProps {
  onSelectSample: (sample: MessageSample) => void;
  disabled?: boolean;
}

export const ExampleChips: React.FC<ExampleChipsProps> = ({
  onSelectSample,
  disabled = false,
}) => {
  const chips = [
    {
      id: "chip-kyc",
      label: "Fake KYC Alert",
      sublabel: "High Risk Example",
      icon: AlertCircle,
      accentClass: "text-rose-400 bg-rose-500/10 border-rose-500/30 hover:border-rose-400/60 hover:bg-rose-500/15",
      dotClass: "bg-rose-400",
      sample: {
        id: "m1",
        label: "scam" as const,
        text: "Dear customer, your SBI KYC expires today. Click bit.ly/sbi-kyc-upd now to avoid account block.",
        sender: "+919800000001",
      },
    },
    {
      id: "chip-legit",
      label: "Legitimate Bank Alert",
      sublabel: "Low Risk Example",
      icon: CheckCircle2,
      accentClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/15",
      dotClass: "bg-emerald-400",
      sample: {
        id: "m2",
        label: "legit" as const,
        text: "Rs 1,250.00 debited from A/c XX4821 on 24-10-26 to UPI merchant SWIGGY. Avl bal Rs 18,430.55. Not you? Call 1800-000-0000. -SBI",
        sender: "VM-SBIINB",
      },
    },
    {
      id: "chip-tricky",
      label: "Tricky Reward Points",
      sublabel: "Medium / Ambiguous",
      icon: HelpCircle,
      accentClass: "text-amber-400 bg-amber-500/10 border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-500/15",
      dotClass: "bg-amber-400",
      sample: {
        id: "m3",
        label: "scam" as const,
        text: "Your HDFC Bank reward points expire soon. Redeem them at hdfc-rewards-points.in before 31 Oct.",
        sender: "AD-HDFCBK",
      },
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mb-6 px-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#36D6D0]" />
          <span>One-Click Test Scenarios:</span>
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline">
          Click to load &amp; analyze instantly
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              id={chip.id}
              key={chip.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectSample(chip.sample)}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36D6D0] ${
                chip.accentClass
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${chip.dotClass}`} />
                <div className="truncate">
                  <div className="text-xs sm:text-sm font-semibold tracking-tight text-white truncate">
                    {chip.label}
                  </div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                    {chip.sublabel}
                  </div>
                </div>
              </div>
              <Icon className="w-4 h-4 flex-shrink-0 ml-2 opacity-80" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
