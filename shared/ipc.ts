// The fixed API the desktop preload exposes to the renderer as window.brixo.
// The renderer has no other way to reach the main process or the network (WN-3).

import type {
  ActionResult,
  ActivityEntry,
  DisconnectResult,
  ProviderDetail,
  ProviderSummary,
  SafeError,
} from "./api.js";

export type BridgeResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: SafeError };

export interface BackendStatus {
  readonly reachable: boolean;
  readonly configured: boolean;
  readonly backendUrl: string;
}

export interface BrixoBridge {
  backendStatus(): Promise<BridgeResult<BackendStatus>>;
  listProviders(): Promise<BridgeResult<readonly ProviderSummary[]>>;
  getProvider(providerId: string): Promise<BridgeResult<ProviderDetail>>;
  /** Asks the backend for an authorization URL and opens it in the system browser. */
  connect(providerId: string): Promise<BridgeResult<{ readonly expiresAt: string }>>;
  disconnect(connectionId: string): Promise<BridgeResult<DisconnectResult>>;
  /** Runs one read-only capability. Write capabilities are not exposed yet (DEC-21). */
  runAction(connectionId: string, capabilityId: string, input: Readonly<Record<string, unknown>>): Promise<BridgeResult<ActionResult>>;
  listActivity(limit: number): Promise<BridgeResult<readonly ActivityEntry[]>>;
  /** Opens a provider web page (https, provider host only) in the system browser. */
  openProviderLink(providerId: string, url: string): Promise<BridgeResult<{ readonly opened: true }>>;
}

export const IPC_CHANNELS = {
  backendStatus: "brixo:backend-status",
  listProviders: "brixo:list-providers",
  getProvider: "brixo:get-provider",
  connect: "brixo:connect",
  disconnect: "brixo:disconnect",
  runAction: "brixo:run-action",
  listActivity: "brixo:list-activity",
  openProviderLink: "brixo:open-provider-link",
} as const satisfies Record<keyof BrixoBridge, string>;
