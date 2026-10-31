import type { ProviderMetadata } from "../../shared/providers.js";
import type { ProviderAdapter } from "../integrations/adapter.js";
import { IntegrationError } from "../integrations/errors.js";

/**
 * Placeholder adapter for providers that appear in the catalog but are not built yet.
 * It cannot connect or run anything, so it can never pretend to work (IN-8).
 */
export function createPlannedAdapter(metadata: ProviderMetadata): ProviderAdapter {
  if (metadata.implementation !== "planned") throw new Error("createPlannedAdapter requires planned metadata");
  const unavailable = (): never => {
    throw new IntegrationError("not_available", `${metadata.name} is not available yet.`);
  };
  return {
    metadata,
    configuration: () => ({ configured: false, missing: [] }),
    beginConnect: async () => unavailable(),
    completeConnect: async () => unavailable(),
    revoke: async () => ({ outcome: "not_applicable", message: "Nothing to revoke." }),
    capabilities: [],
  };
}
