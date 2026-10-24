import { LOCAL_SAMPLES } from "../data/samples";
import type {
  HealthResponse,
  MessageRequest,
  MessageResponse,
  SamplesResponse,
  TransactionRequest,
  TransactionResponse,
} from "../types/api";
import { DEFAULT_API_BASE_URL, DEFAULT_USE_MOCK } from "./config";
import { mockAnalyzeMessage, mockAnalyzeTransaction } from "./mockEngine";

export class ApiService {
  private baseUrl: string;
  private useMock: boolean;

  constructor() {
    this.baseUrl = DEFAULT_API_BASE_URL;
    this.useMock = DEFAULT_USE_MOCK;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, "");
  }

  public isMockMode(): boolean {
    return this.useMock;
  }

  public setMockMode(val: boolean) {
    this.useMock = val;
  }

  public async getHealth(): Promise<HealthResponse> {
    if (this.useMock) {
      return { status: "ok", model_loaded: false };
    }
    const res = await fetch(`${this.baseUrl}/api/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    return (await res.json()) as HealthResponse;
  }

  public async getSamples(): Promise<SamplesResponse> {
    if (this.useMock) {
      return LOCAL_SAMPLES;
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/samples`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        throw new Error(`Failed to load samples (HTTP ${res.status})`);
      }
      return (await res.json()) as SamplesResponse;
    } catch {
      // In live mode if samples endpoint fails, we return local fallback samples with a note
      return LOCAL_SAMPLES;
    }
  }

  public async analyzeMessage(req: MessageRequest): Promise<{ data: MessageResponse; isMock: boolean }> {
    if (this.useMock) {
      // Intentional short scan simulation to feel deliberate per PRD 11.1
      await new Promise((r) => setTimeout(r, 600));
      return {
        data: mockAnalyzeMessage(req),
        isMock: true,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/analyze/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(req),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        let errMessage = `Server returned status ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.error) {
            errMessage = errJson.error;
          } else if (errJson.detail) {
            errMessage = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
          }
        } catch {
          // fallback
        }
        throw new Error(errMessage);
      }

      const data = (await res.json()) as MessageResponse;
      return { data, isMock: false };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      throw new Error(
        message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("fetch failed")
          ? "Could not reach the PayShield server. Is the backend running?"
          : message
      );
    }
  }

  public async analyzeTransaction(
    req: TransactionRequest
  ): Promise<{ data: TransactionResponse; isMock: boolean }> {
    if (this.useMock) {
      await new Promise((r) => setTimeout(r, 500));
      return {
        data: mockAnalyzeTransaction(req),
        isMock: true,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/analyze/transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(req),
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 404) {
        throw new Error(
          "Transaction analysis endpoint (/api/analyze/transaction) is not yet implemented on the live backend branch. Switch to Demo Mode above to test transaction detection with synthetic data."
        );
      }

      if (!res.ok) {
        let errMessage = `Server error ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.error) errMessage = errJson.error;
          else if (errJson.detail) errMessage = JSON.stringify(errJson.detail);
        } catch {
          // fallback
        }
        throw new Error(errMessage);
      }

      const data = (await res.json()) as TransactionResponse;
      return { data, isMock: false };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      if (message.includes("not yet implemented")) {
        throw err;
      }
      throw new Error(
        message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("fetch failed")
          ? "Could not reach the PayShield server. Is the backend running?"
          : message
      );
    }
  }
}

export const apiService = new ApiService();
