import type { Availability } from "../../shared/api.js";
import type { ProviderAdapter } from "./adapter.js";
import type { ConnectionRecord } from "./records.js";

/**
 * The honest availability label for one provider (IN-8):
 * planned → Coming soon; missing config → Not configured; failed connection → Error;
 * verified connection → Connected; otherwise Available.
 */
export function computeAvailability(adapter: ProviderAdapter, connection: ConnectionRecord | undefined): Availability {
  if (adapter.metadata.implementation === "planned") return "coming_soon";
  if (!adapter.configuration().configured) return "not_configured";
  if (connection?.status === "error") return "error";
  if (connection?.status === "connected") return "connected";
  return "available";
}
