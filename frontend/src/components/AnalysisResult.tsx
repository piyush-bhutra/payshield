import React from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
} from "lucide-react";
import type { AnalysisResultState } from "../types/api";
import { RiskGauge } from "./RiskGauge";
import { HighlightedMessage } from "./HighlightedMessage";
import { SignalList } from "./SignalList";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { AdviceChecklist } from "./AdviceChecklist";

interface AnalysisResultProps {
  result: AnalysisResultState;
  onReset: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({
  result,
  onReset,
}) => {
  const isHigh = result.risk_label === "High";
  const isMed = result.risk_label === "Medium";
  const isLow = result.risk_label === "Low";

  const riskBadgeConfig = {
    High: {
      bg: "bg-rose-500/15",
      border: "border-rose-500/40",
      text: "text-rose-400",
      icon: ShieldAlert,
      label: "High Risk Detected",
      interpretation:
        "Multiple warning signs were detected. Do not act until you verify independently.",
      badgeGlow: "glow-high-risk",
    },
    Medium: {
      bg: "bg-amber-500/15",
      border: "border-amber-500/40",
      text: "text-amber-400",
      icon: AlertTriangle,
      label: "Medium Risk (Review Carefully)",
      interpretation:
        "Some warning signs were detected. Verify before acting.",
      badgeGlow: "",
    },
    Low: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/40",
      text: "text-emerald-400",
      icon: ShieldCheck,
      label: "Low Risk",
      interpretation:
        result.signals.length === 0
          ? "No warning signs were found in this message. Still verify through the official app or number."
          : "Few warning signs were detected. Stay alert.",
      badgeGlow: "",
    },
  }[result.risk_label] || {
    bg: "bg-[#101F33]",
    border: "border-[#1E324D]",
    text: "text-slate-300",
    icon: ShieldCheck,
    label: "Assessment Complete",
    interpretation: "Review the signals below before proceeding.",
    badgeGlow: "",
  };

  const Icon = riskBadgeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="surface-card rounded-2xl p-5 sm:p-7 border border-[#1E324D] shadow-2xl relative overflow-hidden"
    >
      {/* Background ambient corner glow */}
      <div
        className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none -z-10 ${
          isHigh ? "bg-rose-500/10" : isMed ? "bg-amber-500/10" : "bg-emerald-500/10"
        }`}
      />

      {/* Top Banner: Risk Label, Scam Type Chip, and Mode Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-[#1E324D]">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Risk Level Badge */}
          <div
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border ${riskBadgeConfig.bg} ${riskBadgeConfig.border} ${riskBadgeConfig.text} ${riskBadgeConfig.badgeGlow}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2.2} />
            <span className="font-display font-bold text-sm tracking-tight">
              {riskBadgeConfig.label}
            </span>
          </div>

          {/* Scam Type Chip (if applicable and not None) */}
          {result.scam_type && result.scam_type !== "None" && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#142842] border border-[#36D6D0]/40 text-[#36D6D0] text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>Type: {result.scam_type}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {result.isMock ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#0B1728] border border-[#1E324D] text-xs font-medium text-slate-400">
              <Sparkles className="w-3 h-3 text-[#36D6D0] mr-1.5" />
              Demo Engine
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Live Backend
            </span>
          )}

          <button
            id="btn-new-check"
            type="button"
            onClick={onReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#101F33] hover:bg-[#142842] border border-[#1E324D] text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36D6D0]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Check</span>
          </button>
        </div>
      </div>

      {/* Hero Result Section: Gauge & Plain-English Interpretation */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center bg-[#0B1728]/70 p-5 rounded-2xl border border-[#1E324D] mb-6">
        <div className="md:col-span-5 flex justify-center">
          <RiskGauge score={result.score} riskLabel={result.risk_label} />
        </div>

        <div className="md:col-span-7 space-y-2 text-center md:text-left">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Assessment Verdict
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
            {riskBadgeConfig.interpretation}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
            {isHigh &&
              "This message demonstrates clear indicators commonly associated with digital fraud, such as urgency threats, disguised URLs, or unauthorized requests for financial secrets."}
            {isMed &&
              "This message contains ambiguous elements. Scammers often use subtle phrasing to deceive victims. We strongly recommend independent verification."}
            {isLow &&
              "Few standard risk signals were detected in this message. However, no automated tool can guarantee absolute authenticity. Exercise regular safety vigilance."}
          </p>
        </div>
      </div>

      {/* Main Analysis Details */}
      <div className="space-y-6">
        {/* Highlighted original text (for message kind) */}
        {result.kind === "message" && result.analyzedText && (
          <HighlightedMessage
            text={result.analyzedText}
            highlights={result.highlights}
            signals={result.signals}
          />
        )}

        {/* Transaction details card (for transaction kind) */}
        {result.kind === "transaction" && result.transactionDetails && (
          <div className="surface-subtle p-4 rounded-xl border border-[#1E324D] space-y-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Analyzed Transaction Parameters
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#07111F] p-2.5 rounded-lg border border-[#1E324D]">
                <span className="text-slate-400 block text-xs">Amount</span>
                <span className="font-bold font-mono text-white text-sm">
                  ₹{result.transactionDetails.amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-[#07111F] p-2.5 rounded-lg border border-[#1E324D]">
                <span className="text-slate-400 block text-xs">Payee</span>
                <span className="font-bold text-slate-100 truncate block">
                  {result.transactionDetails.payee}
                </span>
              </div>
              <div className="bg-[#07111F] p-2.5 rounded-lg border border-[#1E324D]">
                <span className="text-slate-400 block text-xs">Recipient Status</span>
                <span className={`font-semibold ${result.transactionDetails.is_new_payee ? "text-amber-400" : "text-emerald-400"}`}>
                  {result.transactionDetails.is_new_payee ? "New Payee" : "Existing Contact"}
                </span>
              </div>
              <div className="bg-[#07111F] p-2.5 rounded-lg border border-[#1E324D]">
                <span className="text-slate-400 block text-xs">Time &amp; Type</span>
                <span className="font-semibold text-slate-200">
                  {result.transactionDetails.hour.toString().padStart(2, "0")}:00 hrs • {result.transactionDetails.type}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Triggered Signals List */}
        <SignalList signals={result.signals} />

        {/* Score Breakdown Disclosure */}
        <ScoreBreakdown
          kind={result.kind}
          score={result.score}
          ruleScore={result.rule_score}
          mlProbability={result.ml_probability}
          breakdown={result.breakdown}
        />

        {/* What To Do Now Checklist */}
        <AdviceChecklist
          advice={result.advice}
          riskLabel={result.risk_label}
        />

        {/* Responsible AI Disclaimer Banner */}
        <div className="p-3.5 rounded-xl bg-[#07111F]/80 border border-[#1E324D] text-center text-xs text-slate-400">
          <strong className="text-slate-300">Awareness aid, not a guarantee.</strong>{" "}
          PayShield is designed to assist your judgment. It uses synthetic benchmark data and does not interact with financial institutions. Always independently verify suspicious requests.
        </div>
      </div>
    </motion.div>
  );
};
