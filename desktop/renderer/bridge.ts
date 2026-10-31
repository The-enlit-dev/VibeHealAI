import type { BridgeResult, BrixoBridge } from "../../shared/ipc.js";

declare global {
  interface Window {
    readonly brixo?: BrixoBridge;
  }
}

/** The preload bridge, or null when the page is not running inside the BrixoAI desktop app. */
export function getBridge(): BrixoBridge | null {
  return typeof window !== "undefined" && window.brixo ? window.brixo : null;
}

export function bridgeMissing<T>(): BridgeResult<T> {
  return {
    ok: false,
    error: { code: "backend_unreachable", message: "This page must run inside the BrixoAI desktop app." },
  };
}
