import type { BridgeResult, VibeHealBridge } from "../../shared/ipc.js";

declare global {
  interface Window {
    readonly vibeheal?: VibeHealBridge;
  }
}

/** The preload bridge, or null when the page is not running inside the VibeHeal desktop app. */
export function getBridge(): VibeHealBridge | null {
  return typeof window !== "undefined" && window.vibeheal ? window.vibeheal : null;
}

export function bridgeMissing<T>(): BridgeResult<T> {
  return {
    ok: false,
    error: { code: "backend_unreachable", message: "This page must run inside the VibeHeal desktop app." },
  };
}
