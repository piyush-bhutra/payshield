import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ExampleChips } from "./components/ExampleChips";
import { CheckerTabs, type CheckerTab } from "./components/CheckerTabs";
import { MessageForm } from "./components/MessageForm";
import { TransactionForm } from "./components/TransactionForm";
import { AnalysisResult } from "./components/AnalysisResult";
import { HowItWorks } from "./components/HowItWorks";
import { Footer } from "./components/Footer";
import { apiService } from "./services/apiClient";
import { LOCAL_SAMPLES } from "./data/samples";
import type {
  AnalysisResultState,
  MessageSample,
  SamplesResponse,
  TransactionRequest,
} from "./types/api";
import { AlertCircle, Cpu } from "lucide-react";

export const App: React.FC = () => {
  const [isMock, setIsMock] = useState<boolean>(apiService.isMockMode());
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [samples, setSamples] = useState<SamplesResponse>(LOCAL_SAMPLES);
  const [activeTab, setActiveTab] = useState<CheckerTab>("message");

  const [messageText, setMessageText] = useState<string>("");
  const [msgSender, setMsgSender] = useState<string>("");

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultState | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  // Check health and load samples on mount and whenever mode changes
  useEffect(() => {
    let isMounted = true;

    const checkBackend = async () => {
      if (isMock) {
        setApiHealthy(null);
        return;
      }
      try {
        const health = await apiService.getHealth();
        if (isMounted) {
          setApiHealthy(health.status === "ok");
        }
      } catch {
        if (isMounted) {
          setApiHealthy(false);
        }
      }
    };

    const loadSamplesData = async () => {
      try {
        const loaded = await apiService.getSamples();
        if (isMounted && loaded.messages && loaded.transactions) {
          setSamples(loaded);
        }
      } catch {
        if (isMounted) {
          setSamples(LOCAL_SAMPLES);
        }
      }
    };

    checkBackend();
    loadSamplesData();

    return () => {
      isMounted = false;
    };
  }, [isMock]);

  const handleToggleMock = (newMock: boolean) => {
    setIsMock(newMock);
    apiService.setMockMode(newMock);
    setServerError(null);
  };

  // Perform message analysis
  const executeMessageAnalysis = async (text: string, sender?: string) => {
    setIsAnalyzing(true);
    setServerError(null);
    setAnalysisResult(null);

    const minScanTime = new Promise((resolve) => setTimeout(resolve, 1100));

    try {
      const [response] = await Promise.all([
        apiService.analyzeMessage({ text, sender }),
        minScanTime,
      ]);

      setAnalysisResult({
        kind: "message",
        risk_label: response.data.risk_label,
        score: response.data.score,
        scam_type: response.data.scam_type,
        rule_score: response.data.rule_score,
        ml_probability: response.data.ml_probability,
        breakdown: response.data.breakdown,
        signals: response.data.signals,
        highlights: response.data.highlights,
        advice: response.data.advice,
        analyzedText: text,
        sender,
        isMock: response.isMock,
      });

      // Smooth scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during message analysis."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // One-click scenario from ExampleChips
  const handleSelectExampleChip = (sample: MessageSample) => {
    setActiveTab("message");
    setMessageText(sample.text);
    setMsgSender(sample.sender);
    executeMessageAnalysis(sample.text, sample.sender);
  };

  // Perform transaction analysis
  const executeTransactionAnalysis = async (req: TransactionRequest) => {
    setIsAnalyzing(true);
    setServerError(null);
    setAnalysisResult(null);

    const minScanTime = new Promise((resolve) => setTimeout(resolve, 900));

    try {
      const [response] = await Promise.all([
        apiService.analyzeTransaction(req),
        minScanTime,
      ]);

      setAnalysisResult({
        kind: "transaction",
        risk_label: response.data.risk_label,
        score: response.data.score,
        signals: response.data.signals,
        advice: response.data.advice,
        transactionDetails: req,
        isMock: response.isMock,
      });

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during transaction analysis."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setServerError(null);
    setMessageText("");
    setMsgSender("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07111F] text-slate-100 font-sans selection:bg-[#36D6D0]/30 selection:text-[#36D6D0]">
      {/* Header */}
      <Header
        isMock={isMock}
        onToggleMock={handleToggleMock}
        apiHealthy={apiHealthy}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <Hero />

        {/* Example Quick Chips */}
        <ExampleChips
          onSelectSample={handleSelectExampleChip}
          disabled={isAnalyzing}
        />

        {/* Checker Tabs & Container */}
        <div className="w-full max-w-4xl mx-auto mb-8">
          <CheckerTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Main Form Card */}
          <div className="surface-card rounded-2xl p-5 sm:p-7 border border-[#1E324D] shadow-2xl relative overflow-hidden transition-all">
            {/* Top ambient highlight */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#36D6D0]/50 to-transparent" />

            {/* Error Banner if Server Fails */}
            {serverError && (
              <div
                className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start justify-between gap-3"
                role="alert"
              >
                <div className="flex items-start space-x-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-semibold text-rose-200">Request Error</p>
                    <p className="mt-0.5 leading-relaxed">{serverError}</p>
                  </div>
                </div>

                {!isMock && (
                  <button
                    type="button"
                    onClick={() => handleToggleMock(true)}
                    className="flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#101F33] hover:bg-[#142842] border border-[#36D6D0]/40 text-[#36D6D0] text-xs font-semibold cursor-pointer transition-all"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Switch to Demo Mode</span>
                  </button>
                )}
              </div>
            )}

            {/* Tab 1: Message Form */}
            {activeTab === "message" && (
              <div id="panel-message" role="tabpanel" aria-labelledby="tab-message">
                <MessageForm
                  text={messageText}
                  sender={msgSender}
                  onTextChange={setMessageText}
                  onSenderChange={setMsgSender}
                  samples={samples.messages}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={executeMessageAnalysis}
                  onClear={handleReset}
                />
              </div>
            )}

            {/* Tab 2: Transaction Form */}
            {activeTab === "transaction" && (
              <div id="panel-transaction" role="tabpanel" aria-labelledby="tab-transaction">
                <TransactionForm
                  samples={samples.transactions}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={executeTransactionAnalysis}
                  onClear={handleReset}
                />
              </div>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div ref={resultRef} className="w-full max-w-4xl mx-auto mb-10">
          {/* Always-present live region so screen readers announce each new result */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {isAnalyzing
              ? "Analyzing…"
              : analysisResult && analysisResult.kind === activeTab
                ? `${analysisResult.risk_label} risk, score ${analysisResult.score} out of 100.${analysisResult.scam_type && analysisResult.risk_label !== "Low" ? ` Likely ${analysisResult.scam_type}.` : ""}`
                : ""}
          </p>
          {/* Only show the result that belongs to the active tab */}
          {analysisResult && analysisResult.kind === activeTab && (
            <AnalysisResult
              result={analysisResult}
              onReset={handleReset}
            />
          )}
        </div>

        {/* How It Works Strip */}
        <HowItWorks />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;
