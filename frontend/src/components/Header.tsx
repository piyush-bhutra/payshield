import { Shield, Cpu, Wifi, WifiOff, Sparkles } from "lucide-react";

interface HeaderProps {
  isMock: boolean;
  onToggleMock: (val: boolean) => void;
  apiHealthy: boolean | null;
}

export const Header: React.FC<HeaderProps> = ({
  isMock,
  onToggleMock,
  apiHealthy,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1E324D]/80 bg-[#07111F]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#101F33] to-[#0B1728] border border-[#36D6D0]/40 shadow-lg shadow-[#36D6D0]/10">
            <Shield className="w-6 h-6 text-[#36D6D0]" strokeWidth={2.2} />
            <div className="absolute inset-0 rounded-xl bg-[#36D6D0]/10 blur-sm -z-10" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display text-2xl font-bold tracking-tight text-white">
                Pay<span className="text-[#36D6D0]">Shield</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold tracking-wider uppercase rounded-full bg-[#36D6D0]/15 text-[#36D6D0] border border-[#36D6D0]/30">
                Awareness Aid
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden md:block">
              Check before you click, pay or share
            </p>
          </div>
        </div>

        {/* Operating Mode & Privacy Badges */}
        <div className="flex items-center space-x-3">
          {/* Privacy badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#101F33]/80 border border-[#1E324D] text-xs text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-[#36D6D0]" />
            <span>100% Private &amp; Offline</span>
          </div>

          {/* Mode Switcher pill */}
          <div className="flex items-center space-x-2 bg-[#0B1728] p-1 rounded-xl border border-[#1E324D]">
            <button
              type="button"
              onClick={() => onToggleMock(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isMock
                  ? "bg-[#101F33] text-[#36D6D0] border border-[#36D6D0]/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Run offline with synthetic demo engine"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Demo Mode</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleMock(false)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !isMock
                  ? "bg-[#101F33] text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Connect to live local FastAPI server at http://localhost:8000"
            >
              {apiHealthy ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>Live API</span>
              {!isMock && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiHealthy ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                  }`}
                  aria-label={apiHealthy ? "API Online" : "API Offline"}
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
