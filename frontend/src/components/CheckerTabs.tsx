import React from "react";
import { motion } from "framer-motion";
import { MessageSquareText, ArrowLeftRight } from "lucide-react";

export type CheckerTab = "message" | "transaction";

interface CheckerTabsProps {
  activeTab: CheckerTab;
  onTabChange: (tab: CheckerTab) => void;
}

export const CheckerTabs: React.FC<CheckerTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="flex justify-center mb-6">
      <div
        role="tablist"
        aria-label="Analysis type selection"
        className="inline-flex p-1.5 rounded-2xl bg-[#0B1728] border border-[#1E324D] shadow-inner"
      >
        <button
          id="tab-message"
          role="tab"
          type="button"
          aria-selected={activeTab === "message"}
          aria-controls="panel-message"
          tabIndex={activeTab === "message" ? 0 : -1}
          onClick={() => onTabChange("message")}
          className={`relative px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36D6D0] ${
            activeTab === "message" ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {activeTab === "message" && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-0 bg-gradient-to-r from-[#101F33] to-[#142842] rounded-xl border border-[#36D6D0]/40 shadow-sm shadow-[#36D6D0]/10"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center space-x-2">
            <MessageSquareText className="w-4 h-4 text-[#36D6D0]" />
            <span>Check a Message</span>
          </span>
        </button>

        <button
          id="tab-transaction"
          role="tab"
          type="button"
          aria-selected={activeTab === "transaction"}
          aria-controls="panel-transaction"
          tabIndex={activeTab === "transaction" ? 0 : -1}
          onClick={() => onTabChange("transaction")}
          className={`relative px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36D6D0] ${
            activeTab === "transaction" ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {activeTab === "transaction" && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-0 bg-gradient-to-r from-[#101F33] to-[#142842] rounded-xl border border-[#36D6D0]/40 shadow-sm shadow-[#36D6D0]/10"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center space-x-2">
            <ArrowLeftRight className="w-4 h-4 text-[#38BDF8]" />
            <span>Check a Transaction</span>
          </span>
        </button>
      </div>
    </div>
  );
};
