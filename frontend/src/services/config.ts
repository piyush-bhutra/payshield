/**
 * Application Runtime Configuration
 */

const envApiBase = import.meta.env.VITE_API_BASE_URL;
const envUseMock = import.meta.env.VITE_USE_MOCK;

export const DEFAULT_API_BASE_URL = envApiBase || "http://localhost:8000";

// If VITE_USE_MOCK is explicitly "false", default to false; otherwise default to true for safe local demo
export const DEFAULT_USE_MOCK = envUseMock === "false" ? false : true;
