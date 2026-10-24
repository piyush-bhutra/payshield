import React, { useEffect, useState } from "react";
import type { RiskLabel } from "../types/api";

interface RiskGaugeProps {
  score: number;
  riskLabel: RiskLabel;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, riskLabel }) => {
  // Check prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [animatedScore, setAnimatedScore] = useState(prefersReducedMotion ? score : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    let start = 0;
    const duration = 1000; // 1s count-up
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = score / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score, prefersReducedMotion]);

  // Color mappings
  const colorMap = {
    Low: {
      stroke: "#10B981", // emerald-500
      glow: "rgba(16, 185, 129, 0.35)",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    Medium: {
      stroke: "#F59E0B", // amber-500
      glow: "rgba(245, 158, 11, 0.35)",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/30",
    },
    High: {
      stroke: "#EF4444", // rose-500
      glow: "rgba(239, 68, 68, 0.4)",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/30",
    },
  };

  const colors = colorMap[riskLabel] || colorMap.Low;

  // Arc Gauge Geometry (Semi-circle from 180° to 0°)
  const radius = 54;
  const strokeWidth = 9;
  const circumference = Math.PI * radius; // Half-circle length
  const progressPercent = Math.min(100, Math.max(0, animatedScore)) / 100;
  const strokeDashoffset = circumference * (1 - progressPercent);

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative w-44 h-28 flex items-end justify-center">
        <svg
          className="w-44 h-28 overflow-visible"
          viewBox="0 0 130 75"
        >
          {/* Background Track Arc */}
          <path
            d="M 11 70 A 54 54 0 0 1 119 70"
            fill="none"
            stroke="#1E324D"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Animated Value Arc */}
          <path
            d="M 11 70 A 54 54 0 0 1 119 70"
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: prefersReducedMotion ? "none" : "stroke-dashoffset 0.8s ease-out",
              filter: `drop-shadow(0 0 6px ${colors.glow})`,
            }}
          />
        </svg>

        {/* Center Score Readout */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline space-x-0.5">
            <span className="font-display text-3xl font-extrabold tracking-tight text-white leading-none">
              {animatedScore}
            </span>
            <span className="text-xs font-semibold text-slate-400">/100</span>
          </div>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mt-0.5">
            Risk Score
          </span>
        </div>
      </div>
    </div>
  );
};
