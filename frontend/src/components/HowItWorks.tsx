import React from "react";
import { ClipboardCopy, Cpu, ShieldAlert } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: "01",
      title: "Paste",
      desc: "Enter a suspicious SMS, email, WhatsApp notice, or simulated transaction details.",
      icon: ClipboardCopy,
      color: "text-[#36D6D0]",
      border: "border-[#36D6D0]/30",
      bg: "bg-[#36D6D0]/10",
    },
    {
      step: "02",
      title: "Analyse",
      desc: "PayShield tests against verified phishing rules, suspicious link heuristics, and model weights.",
      icon: Cpu,
      color: "text-[#38BDF8]",
      border: "border-[#38BDF8]/30",
      bg: "bg-[#38BDF8]/10",
    },
    {
      step: "03",
      title: "Act",
      desc: "Read plain-language explanations of triggered signals and follow the verified next steps.",
      icon: ShieldAlert,
      color: "text-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <section className="w-full max-w-5xl mx-auto my-12 px-4 sm:px-6">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-white mb-2">
          How PayShield Protects You
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          An intuitive, privacy-preserving workflow designed to help you verify payments without exposing private credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="surface-card p-5 rounded-2xl border border-[#1E324D] relative overflow-hidden group hover:border-[#2A4468] transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-xl ${item.bg} ${item.border} border flex items-center justify-center ${item.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-display text-2xl font-extrabold text-slate-700 select-none">
                  {item.step}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-1.5 tracking-tight">
                {item.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
