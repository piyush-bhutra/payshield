import React, { useState } from "react";
import {
  ShieldCheck,
  RotateCcw,
  Search,
  AlertCircle,
  FileText,
  User,
} from "lucide-react";
import type { MessageSample } from "../types/api";

interface MessageFormProps {
  text: string;
  sender: string;
  onTextChange: (text: string) => void;
  onSenderChange: (sender: string) => void;
  samples: MessageSample[];
  isAnalyzing: boolean;
  onAnalyze: (text: string, sender?: string) => Promise<void>;
  onClear: () => void;
}

export const MessageForm: React.FC<MessageFormProps> = ({
  text,
  sender,
  onTextChange,
  onSenderChange,
  samples,
  isAnalyzing,
  onAnalyze,
  onClear,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const maxChars = 2000;
  const charsRemaining = maxChars - text.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setValidationError("Please enter or paste a message to analyze.");
      return;
    }
    if (text.length > maxChars) {
      setValidationError(`Message exceeds the maximum limit of ${maxChars} characters.`);
      return;
    }
    setValidationError(null);
    onAnalyze(trimmed, sender.trim() || undefined);
  };

  const handleClear = () => {
    onTextChange("");
    onSenderChange("");
    setValidationError(null);
    onClear();
  };

  const handleSelectSample = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sampleId = e.target.value;
    if (!sampleId) return;
    const found = samples.find((s) => s.id === sampleId);
    if (found) {
      onTextChange(found.text);
      onSenderChange(found.sender || "");
      setValidationError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sample Loader and Clear Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <label htmlFor="sample-dropdown" className="text-xs font-medium text-slate-300 flex items-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-[#36D6D0] mr-1.5" />
            <span>Load Sample Message:</span>
          </label>
          <select
            id="sample-dropdown"
            onChange={handleSelectSample}
            defaultValue=""
            disabled={isAnalyzing}
            className="w-full sm:w-auto max-w-full text-xs bg-[#0B1728] border border-[#1E324D] rounded-lg px-2.5 py-1.5 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36D6D0] hover:border-[#2A4468] transition-colors cursor-pointer"
          >
            <option value="" disabled>
              Select a synthetic sample...
            </option>
            <optgroup label="Suspicious / Phishing Scenarios">
              {samples
                .filter((s) => s.label === "scam")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.id.toUpperCase()}] {s.text.slice(0, 48)}...
                  </option>
                ))}
            </optgroup>
            <optgroup label="Legitimate Alert Scenarios">
              {samples
                .filter((s) => s.label === "legit")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.id.toUpperCase()}] {s.text.slice(0, 48)}...
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        <button
          id="btn-clear-message"
          type="button"
          onClick={handleClear}
          disabled={isAnalyzing || (!text && !sender)}
          className="self-end sm:self-auto flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 py-1 px-2.5 rounded-lg hover:bg-[#101F33] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear form</span>
        </button>
      </div>

      {/* Message Textarea with Scanner Beam Effect */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="message-text"
            className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center space-x-1.5"
          >
            <span>Suspicious Message Content</span>
            <span className="text-rose-400" aria-hidden="true">
              *
            </span>
          </label>
          <span
            className={`text-xs font-mono ${
              charsRemaining < 100
                ? "text-rose-400 font-bold"
                : "text-slate-400"
            }`}
            aria-live="polite"
          >
            {text.length} / {maxChars} chars
          </span>
        </div>

        <div className="relative rounded-xl overflow-hidden">
          <textarea
            id="message-text"
            rows={5}
            value={text}
            onChange={(e) => {
              onTextChange(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Paste suspicious SMS, WhatsApp notice, reward alert, or KYC suspension message here (e.g. 'Dear customer, your SBI KYC expires today...')"
            disabled={isAnalyzing}
            maxLength={maxChars}
            className="w-full bg-[#0B1728] border border-[#1E324D] rounded-xl p-3.5 sm:p-4 text-base text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#36D6D0] focus:border-transparent transition-all resize-y font-sans leading-relaxed disabled:opacity-60"
            aria-required="true"
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? "message-validation-error" : undefined}
          />

          {/* Scanning sweep beam active during analysis */}
          {isAnalyzing && (
            <div className="scanner-overlay" aria-hidden="true">
              <div className="scanner-beam" />
              <div className="absolute inset-0 bg-[#36D6D0]/5 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex items-center space-x-2 bg-[#07111F]/90 px-3.5 py-2 rounded-xl border border-[#36D6D0]/40 text-xs font-semibold text-[#36D6D0] shadow-xl">
                  <Search className="w-4 h-4 animate-spin text-[#36D6D0]" />
                  <span>Checking for warning signs…</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div
            id="message-validation-error"
            className="flex items-center space-x-2 text-rose-400 text-xs mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Optional Sender Input */}
      <div>
        <label
          htmlFor="sender-input"
          className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center justify-between mb-1.5"
        >
          <span className="flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Sender ID or Phone Number</span>
            <span className="text-xs font-normal text-slate-400">
              (Optional)
            </span>
          </span>
          <span className="text-xs text-slate-400 font-normal">
            e.g. +919800000001 or VM-SBIINB
          </span>
        </label>
        <input
          id="sender-input"
          type="text"
          value={sender}
          onChange={(e) => onSenderChange(e.target.value)}
          placeholder="Enter phone number, header shortcode, or email (e.g. +919876543210)"
          disabled={isAnalyzing}
          maxLength={150}
          className="w-full bg-[#0B1728] border border-[#1E324D] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#36D6D0] focus:border-transparent transition-all disabled:opacity-60"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          id="btn-analyze-message"
          type="submit"
          disabled={isAnalyzing || !text.trim()}
          className="w-full sm:w-auto min-w-[200px] flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl font-display font-bold text-sm tracking-wide text-[#07111F] bg-gradient-to-r from-[#36D6D0] to-[#38BDF8] hover:from-[#32C5BF] hover:to-[#2FAFEA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36D6D0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] shadow-lg shadow-[#36D6D0]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <Search className="w-4 h-4 animate-spin" />
              <span>Analyzing Message…</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Analyze Message</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
