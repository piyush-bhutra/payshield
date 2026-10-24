/**
 * API Type Definitions for PayShield
 * Strictly preserving backend schema field names per PRD Section 8 and backend/app/schemas.py.
 */

export type RiskLabel = "Low" | "Medium" | "High";

export interface Signal {
  id: string;
  title: string;
  detail: string;
  weight: number;
  matched: string[];
  tip?: string | null;
}

export interface Highlight {
  start: number;
  end: number;
  signal_id: string;
}

export interface Breakdown {
  rule_weight: number;
  ml_weight: number;
  safety_floor_applied: boolean;
}

export interface MessageRequest {
  text: string;
  sender?: string | null;
}

export interface MessageResponse {
  risk_label: RiskLabel;
  score: number;
  scam_type: string;
  rule_score: number;
  ml_probability: number;
  breakdown: Breakdown;
  signals: Signal[];
  highlights: Highlight[];
  advice: string[];
}

export interface TransactionRequest {
  amount: number;
  payee: string;
  is_new_payee: boolean;
  hour: number;
  type: "pay" | "collect_request" | "transfer";
  recent_txn_count_1h: number;
}

export interface TransactionResponse {
  risk_label: RiskLabel;
  score: number;
  signals: Signal[];
  advice: string[];
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
}

export interface MessageSample {
  id: string;
  label: "scam" | "legit";
  text: string;
  sender: string;
}

export interface TransactionSample {
  id: string;
  label: "scam" | "legit";
  amount: number;
  payee: string;
  is_new_payee: boolean;
  hour: number;
  type: "pay" | "collect_request" | "transfer";
  recent_txn_count_1h: number;
}

export interface SamplesResponse {
  messages: MessageSample[];
  transactions: TransactionSample[];
}

export interface ErrorResponse {
  error: string;
}

/**
 * Unified UI Analysis Result representation (handles both message and transaction results)
 */
export interface AnalysisResultState {
  kind: "message" | "transaction";
  risk_label: RiskLabel;
  score: number;
  scam_type?: string;
  rule_score?: number;
  ml_probability?: number;
  breakdown?: Breakdown;
  signals: Signal[];
  highlights?: Highlight[];
  advice: string[];
  analyzedText?: string;
  sender?: string | null;
  transactionDetails?: TransactionRequest;
  isMock: boolean;
}
