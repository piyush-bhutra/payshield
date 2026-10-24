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

const SERVER_UNREACHABLE = "Could not reach the PayShield server. Is the backend running?";

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

    const data = await this.postJson<MessageResponse>("/api/analyze/message", req);
    return { data, isMock: false };
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

    const data = await this.postJson<TransactionResponse>("/api/analyze/transaction", req);
    return { data, isMock: false };
  }

  /**
   * POST JSON to the live API. Every failure (network error, 8 s timeout, any non-2xx
   * status such as HTTP 500) becomes the same friendly message for the error banner.
   */
  private async postJson<T>(path: string, body: unknown): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch {
      throw new Error(SERVER_UNREACHABLE);
    }
  }
}

export const apiService = new ApiService();
