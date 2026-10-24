import React, { useState } from "react";
import {
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  FileText,
  Clock,
  IndianRupee,
  User,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import type { TransactionRequest, TransactionSample } from "../types/api";

interface TransactionFormProps {
  samples: TransactionSample[];
  isAnalyzing: boolean;
  onAnalyze: (req: TransactionRequest) => Promise<void>;
  onClear: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  samples,
  isAnalyzing,
  onAnalyze,
  onClear,
}) => {
  const [amount, setAmount] = useState<string>("49999");
  const [payee, setPayee] = useState<string>("Rahul Traders");
  const [isNewPayee, setIsNewPayee] = useState<boolean>(true);
  const [hour, setHour] = useState<number>(2);
  const [type, setType] = useState<"pay" | "collect_request" | "transfer">("collect_request");
  const [recentCount, setRecentCount] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid transaction amount greater than ₹0.");
      return;
    }
    if (!payee.trim()) {
      setError("Please enter a payee name, VPA, or merchant ID.");
      return;
    }
    if (hour < 0 || hour > 23) {
      setError("Hour of day must be an integer between 0 and 23.");
      return;
    }
    if (recentCount < 0) {
      setError("Recent transactions count cannot be negative.");
      return;
    }

    setError(null);
    onAnalyze({
      amount: parsedAmount,
      payee: payee.trim(),
      is_new_payee: isNewPayee,
      hour,
      type,
      recent_txn_count_1h: recentCount,
    });
  };

  const handleClear = () => {
    setAmount("");
    setPayee("");
    setIsNewPayee(false);
    setHour(12);
    setType("pay");
    setRecentCount(0);
    setError(null);
    onClear();
  };

  const handleSelectSample = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sampleId = e.target.value;
    if (!sampleId) return;
    const found = samples.find((s) => s.id === sampleId);
    if (found) {
      setAmount(found.amount.toString());
      setPayee(found.payee);
      setIsNewPayee(found.is_new_payee);
      setHour(found.hour);
      setType(found.type);
      setRecentCount(found.recent_txn_count_1h);
      setError(null);
    }
  };

  // Helper text for hour
  const getHourDescriptor = (h: number) => {
    if (h >= 0 && h <= 5) return "🌙 Late Night (High Risk Window)";
    if (h >= 6 && h <= 11) return "🌅 Morning";
    if (h >= 12 && h <= 16) return "☀️ Afternoon";
    if (h >= 17 && h <= 21) return "🌆 Evening";
    return "🌃 Night";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sample Loader and Clear Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <label htmlFor="tx-sample-dropdown" className="text-xs font-medium text-slate-300 flex items-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-[#38BDF8] mr-1.5" />
            <span>Load Demo Scenario:</span>
          </label>
          <select
            id="tx-sample-dropdown"
            onChange={handleSelectSample}
            defaultValue=""
            disabled={isAnalyzing}
            className="w-full sm:w-auto max-w-full text-xs bg-[#0B1728] border border-[#1E324D] rounded-lg px-2.5 py-1.5 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36D6D0] hover:border-[#2A4468] transition-colors cursor-pointer"
          >
            <option value="" disabled>
              Select simulated transaction...
            </option>
            <optgroup label="Simulated Suspicious Scenarios">
              {samples
                .filter((s) => s.label === "scam")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    ₹{s.amount.toLocaleString("en-IN")} • {s.payee} ({s.type}, {s.hour}:00h)
                  </option>
                ))}
            </optgroup>
            <optgroup label="Simulated Normal Transactions">
              {samples
                .filter((s) => s.label === "legit")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    ₹{s.amount.toLocaleString("en-IN")} • {s.payee} ({s.type}, {s.hour}:00h)
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        <button
          id="btn-clear-transaction"
          type="button"
          onClick={handleClear}
          disabled={isAnalyzing}
          className="self-end sm:self-auto flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 py-1 px-2.5 rounded-lg hover:bg-[#101F33] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset inputs</span>
        </button>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <label
            htmlFor="tx-amount"
            className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center space-x-1.5 mb-1.5"
          >
            <IndianRupee className="w-3.5 h-3.5 text-[#36D6D0]" />
            <span>Transaction Amount (INR)</span>
            <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
              ₹
            </span>
            <input
              id="tx-amount"
              type="number"
              step="any"
              min="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 49999"
              disabled={isAnalyzing}
              className="w-full bg-[#0B1728] border border-[#1E324D] rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#36D6D0] font-mono transition-all"
              required
            />
          </div>
        </div>

        {/* Payee Name */}
        <div>
          <label
            htmlFor="tx-payee"
            className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center space-x-1.5 mb-1.5"
          >
            <User className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Payee Name or UPI ID</span>
            <span className="text-rose-400">*</span>
          </label>
          <input
            id="tx-payee"
            type="text"
            value={payee}
            onChange={(e) => {
              setPayee(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Rahul Traders or rahul@upi"
            disabled={isAnalyzing}
            className="w-full bg-[#0B1728] border border-[#1E324D] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#36D6D0] transition-all"
            required
          />
        </div>

        {/* Transaction Type */}
        <div>
          <label
            htmlFor="tx-type"
            className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center space-x-1.5 mb-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Transaction Type</span>
          </label>
          <select
            id="tx-type"
            value={type}
            onChange={(e) => setType(e.target.value as "pay" | "collect_request" | "transfer")}
            disabled={isAnalyzing}
            className="w-full bg-[#0B1728] border border-[#1E324D] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#36D6D0] cursor-pointer"
          >
            <option value="collect_request">collect_request (UPI Collect / Payment Request)</option>
            <option value="pay">pay (Standard Merchant / P2P QR Pay)</option>
            <option value="transfer">transfer (Direct Bank / Wallet Transfer)</option>
          </select>
        </div>

        {/* Is New Payee Toggle */}
        <div>
          <label className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center space-x-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Recipient Relationship</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="tx-btn-new-payee"
              type="button"
              onClick={() => setIsNewPayee(true)}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                isNewPayee
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
                  : "bg-[#0B1728] border-[#1E324D] text-slate-400 hover:text-slate-200"
              }`}
            >
              Yes, New Payee
            </button>
            <button
              id="tx-btn-known-payee"
              type="button"
              onClick={() => setIsNewPayee(false)}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                !isNewPayee
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                  : "bg-[#0B1728] border-[#1E324D] text-slate-400 hover:text-slate-200"
              }`}
            >
              Known Contact
            </button>
          </div>
        </div>

        {/* Hour of Day Slider / Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="tx-hour"
              className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center space-x-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Hour of Day (0–23)</span>
            </label>
            <span className="text-xs font-mono text-[#36D6D0] font-bold">
              {hour.toString().padStart(2, "0")}:00 hrs
            </span>
          </div>
          <input
            id="tx-hour"
            type="range"
            min="0"
            max="23"
            value={hour}
            onChange={(e) => setHour(parseInt(e.target.value, 10))}
            disabled={isAnalyzing}
            className="w-full accent-[#36D6D0] cursor-pointer bg-[#1E324D] rounded-lg h-2"
          />
          <div className="text-xs text-slate-400 mt-1">
            {getHourDescriptor(hour)}
          </div>
        </div>

        {/* Recent Transactions in 1 hour */}
        <div>
          <label
            htmlFor="tx-recent"
            className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center space-x-1.5 mb-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Transactions in Last 1 Hour</span>
          </label>
          <input
            id="tx-recent"
            type="number"
            min="0"
            max="100"
            value={recentCount}
            onChange={(e) => setRecentCount(parseInt(e.target.value, 10) || 0)}
            disabled={isAnalyzing}
            className="w-full bg-[#0B1728] border border-[#1E324D] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#36D6D0] font-mono transition-all"
            required
          />
          <div className="text-xs text-slate-400 mt-1">
            Detects burst behavior or repeated stress transfers
          </div>
        </div>
      </div>

      {/* Validation Error */}
      {error && (
        <div className="flex items-center space-x-2 text-rose-400 text-xs p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          id="btn-analyze-transaction"
          type="submit"
          disabled={isAnalyzing}
          className="w-full sm:w-auto min-w-[200px] flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl font-display font-bold text-sm tracking-wide text-[#07111F] bg-gradient-to-r from-[#38BDF8] to-[#36D6D0] hover:from-[#2FAFEA] hover:to-[#32C5BF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] shadow-lg shadow-[#38BDF8]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isAnalyzing ? "Evaluating Risk…" : "Analyze Transaction"}</span>
        </button>
      </div>
    </form>
  );
};
