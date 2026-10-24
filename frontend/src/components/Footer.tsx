import { Shield, AlertTriangle, Lock } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#1E324D] bg-[#050D18] py-10 px-4 sm:px-6 lg:px-8 mt-16 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Prominent Mandatory Responsible AI Disclaimer Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0B1728] border border-amber-500/30 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-sm font-bold text-amber-300">
                Awareness aid, not a guarantee.
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                PayShield is an educational cybersecurity tool designed to highlight common phishing patterns and risky payment requests. 
                All demonstration datasets and sample scenarios are synthetic and fictitious. 
                PayShield never fetches, resolves, or connects to external URLs, nor does it interface directly with bank servers or UPI payment rails. 
                Automated security scores can produce false positives or false negatives; always independently verify critical banking requests through official banking apps or verified customer support lines.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Meta Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#1E324D]/60 text-slate-400">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-[#36D6D0]" />
            <span className="font-bold text-slate-300">PayShield</span>
            <span>— Digital Payment Fraud Awareness &amp; Detection</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="px-2.5 py-1 rounded-md bg-[#101F33] text-slate-300 border border-[#1E324D]">
              VIT AI Innovate-A-Thon • Question 18
            </span>
            <span className="flex items-center space-x-1 text-slate-400">
              <Lock className="w-3 h-3 text-[#36D6D0]" />
              <span>Offline Prototype</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
