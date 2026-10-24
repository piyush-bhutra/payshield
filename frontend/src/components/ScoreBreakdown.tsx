import React, { useState } from "react";
import { ChevronDown, ChevronUp, Calculator, ShieldCheck, Binary, Info, Activity } from "lucide-react";
import type { Breakdown } from "../types/api";

interface ScoreBreakdownProps {
  kind?: "message" | "transaction";
  score: number;
  ruleScore?: number;
  mlProbability?: number;
  breakdown?: Breakdown;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  kind = "message",
  score,
  ruleScore = 0,
  mlProbability = 0,
  breakdown,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const isTx = kind === "transaction";
  const ruleWeight = breakdown?.rule_weight ?? 0.6;
  const mlWeight = breakdown?.ml_weight ?? 0.4;
  const safetyFloorApplied = breakdown?.safety_floor_applied ?? false;
  const isRuleOnly = mlWeight === 0;
  // Score before the safety floor, same formula as the backend (PRD 7.3)
  const preFloorScore = isRuleOnly
    ? Math.min(100, ruleScore)
    : Math.min(100, Math.round(ruleWeight * ruleScore + mlWeight * mlProbability * 100));
  const scoreText = safetyFloorApplied && preFloorScore !== score
    ? `${preFloorScore}, raised to ${score} by the safety floor`
    : `${score}`;

  return (
    <div className="surface-card rounded-xl border border-[#1E324D] overflow-hidden transition-all">
      <button
        id="btn-why-this-score"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="score-breakdown-details"
        className="w-full px-4 py-3 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-slate-200 hover:text-white hover:bg-[#142842]/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36D6D0]"
      >
        <span className="flex items-center space-x-2">
          <Calculator className="w-4 h-4 text-[#36D6D0]" />
          <span>
            {isTx
              ? "Why this score? (Transaction Risk Calculation)"
              : "Why this score? (Score Breakdown & Decision Logic)"}
          </span>
        </span>
        <div className="flex items-center space-x-2 text-slate-400">
          <span className="text-xs font-mono font-medium">{score}/100</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div id="score-breakdown-details" className="p-4 border-t border-[#1E324D] bg-[#0B1728]/70 space-y-4">
          {isTx ? (
            /* Transaction Score Breakdown */
            <>
              <div className="surface-subtle p-3 rounded-xl border border-[#1E324D]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 font-medium flex items-center">
                    <Activity className="w-3.5 h-3.5 text-[#38BDF8] mr-1.5" />
                    Transaction Rule Engine
                  </span>
                  <span className="text-xs font-bold font-mono text-white">
                    {score} / 100
                  </span>
                </div>
                <div className="text-xs text-slate-400 leading-tight">
                  Score = sum of signal weights, capped at 100
                </div>
              </div>

              <div className="surface-subtle p-3.5 rounded-xl border border-[#1E324D] text-xs space-y-2">
                <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-[#36D6D0]" />
                  <span>Rule Formula</span>
                </div>
                <div className="bg-[#07111F] p-2.5 rounded-lg border border-[#1E324D] font-mono text-xs text-[#36D6D0] overflow-x-auto">
                  <code>Score = sum of signal weights, capped at 100 (score: {score})</code>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Transaction risk is evaluated deterministically by testing payment parameters against high-risk conditions: collect requests from new payees, high amounts, odd hours (00:00–05:00), and rapid transaction bursts.
                </p>
              </div>
            </>
          ) : (
            /* Message Score Breakdown */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rule Engine Component */}
                <div className="surface-subtle p-3 rounded-xl border border-[#1E324D]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 font-medium flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#36D6D0] mr-1.5" />
                      Rule Engine Score
                    </span>
                    <span className="text-xs font-bold font-mono text-white">
                      {ruleScore} / 100
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 leading-tight">
                    Sum of triggered security weights (Weight: {(ruleWeight * 100).toFixed(0)}%)
                  </div>
                </div>

                {/* ML Classifier Component */}
                <div className="surface-subtle p-3 rounded-xl border border-[#1E324D]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 font-medium flex items-center">
                      <Binary className="w-3.5 h-3.5 text-[#38BDF8] mr-1.5" />
                      ML Scam Probability
                    </span>
                    <span className="text-xs font-bold font-mono text-white">
                      {isRuleOnly ? "Inactive" : `${(mlProbability * 100).toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 leading-tight">
                    {isRuleOnly
                      ? "Rule-only mode (ML model not loaded)"
                      : `TF-IDF + Logistic Regression (Weight: ${(mlWeight * 100).toFixed(0)}%)`}
                  </div>
                </div>
              </div>

              {/* Fusion Formula Explanation */}
              <div className="surface-subtle p-3.5 rounded-xl border border-[#1E324D] text-xs space-y-2">
                <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-[#36D6D0]" />
                  <span>Score Fusion Equation</span>
                </div>
                <div className="bg-[#07111F] p-2.5 rounded-lg border border-[#1E324D] font-mono text-xs text-[#36D6D0] overflow-x-auto">
                  {isRuleOnly ? (
                    <code>final_score = rule_score = {scoreText}</code>
                  ) : (
                    <code>
                      final_score = min(100, round({ruleWeight} * {ruleScore} + {mlWeight} * {(mlProbability * 100).toFixed(1)})) = {scoreText}
                    </code>
                  )}
                </div>

                {safetyFloorApplied && (
                  <div className="flex items-start space-x-2 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-amber-300 text-xs">
                    <span className="font-bold">🛡️ Safety Floor Triggered:</span>
                    <span>
                      Both a credential request and a suspicious link fired together. By design, the safety floor ensures the score is raised to at least 70 to protect the user.
                    </span>
                  </div>
                )}

                <p className="text-xs text-slate-400 leading-relaxed">
                  PayShield fuses explicit deterministic security rules (such as OTP theft, phishing links, and threat keywords) with probabilistic text scoring. Scores below 35 are Low Risk, 35 to 65 are Medium Risk (Review Carefully), and above 65 are High Risk.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
