/**
 * Application Runtime Configuration
 */

const envApiBase = import.meta.env.VITE_API_BASE_URL;
const envUseMock = import.meta.env.VITE_USE_MOCK;

export const DEFAULT_API_BASE_URL = envApiBase || "http://127.0.0.1:8000";

// Default to live mode when no env is set; enable mock only if VITE_USE_MOCK is explicitly "true"
export const DEFAULT_USE_MOCK = envUseMock === "true" ? true : false;

