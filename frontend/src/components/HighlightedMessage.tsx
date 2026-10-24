import React from "react";
import type { Highlight, Signal } from "../types/api";

interface HighlightedMessageProps {
  text: string;
  highlights?: Highlight[];
  signals?: Signal[];
}

export const HighlightedMessage: React.FC<HighlightedMessageProps> = ({
  text,
  highlights = [],
  signals = [],
}) => {
  if (!text) return null;

  // Build a lookup map from signal_id to Signal object
  const signalMap = new Map<string, Signal>();
  signals.forEach((s) => signalMap.set(s.id, s));

  // If no highlights, render original text cleanly
  if (!highlights || highlights.length === 0) {
    return (
      <div className="surface-subtle p-4 rounded-xl text-sm leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-words border border-[#1E324D]">
        {text}
      </div>
    );
  }

  // Defensive bounds checks and sorting of highlights
  const validHighlights = highlights
    .filter((h) => h.start >= 0 && h.end <= text.length && h.start < h.end)
    .sort((a, b) => a.start - b.start);

  const elements: React.ReactNode[] = [];
  let currentIndex = 0;

  validHighlights.forEach((hl, i) => {
    // If there is gap between current pointer and highlight start
    if (hl.start > currentIndex) {
      elements.push(
        <span key={`plain-${currentIndex}`}>
          {text.slice(currentIndex, hl.start)}
        </span>
      );
    }

    const matchedChunk = text.slice(hl.start, hl.end);
    const signal = signalMap.get(hl.signal_id);
    const signalTitle = signal?.title || hl.signal_id.replace(/_/g, " ");

    elements.push(
      <mark
        key={`hl-${i}-${hl.start}`}
        tabIndex={0}
        aria-label={`Flagged as suspicious: ${signalTitle} (${matchedChunk})`}
        className="group relative inline cursor-help bg-rose-500/25 text-rose-200 border-b-2 border-rose-400 px-1 py-0.5 rounded font-medium transition-all hover:bg-rose-500/40 focus:outline-none focus:ring-2 focus:ring-rose-400"
      >
        <span>{matchedChunk}</span>
        {/* Tooltip on hover/focus */}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus:block z-30 w-max max-w-xs px-2.5 py-1.5 text-xs font-sans text-white bg-[#101F33] border border-rose-500/50 rounded-lg shadow-xl shadow-black/60">
          <span className="font-semibold text-rose-400 block mb-0.5">
            ⚠️ {signalTitle}
          </span>
          <span className="text-[11px] text-slate-300 font-normal leading-tight block">
            {signal?.detail || "Matched suspicious pattern"}
          </span>
        </span>
      </mark>
    );

    currentIndex = hl.end;
  });

  // Trailing text after last highlight
  if (currentIndex < text.length) {
    elements.push(
      <span key={`plain-${currentIndex}`}>
        {text.slice(currentIndex)}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-300">Message Analysis &amp; Highlighted Signals:</span>
        <span className="text-[11px] text-slate-400">
          Hover or focus highlights to view warning signals
        </span>
      </div>
      <div className="surface-subtle p-4 rounded-xl text-sm leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-words border border-[#1E324D] shadow-inner">
        {elements}
      </div>
    </div>
  );
};
