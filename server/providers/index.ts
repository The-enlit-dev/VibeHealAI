import type { ProviderConfigs } from "../config.js";
import { ProviderRegistry } from "../integrations/registry.js";
import { GitHubAdapter } from "./github/adapter.js";
import type { FetchLike } from "./github/client.js";
import { createPlannedAdapter } from "./planned-adapter.js";
import { PLANNED_PROVIDERS } from "./planned-catalog.js";

/** The approved provider order (DEC-19). The catalog is shown in this order. */
export const PROVIDER_ORDER = ["github", "vercel", "netlify", "supabase", "figma", "stripe", "shopify", "notion", "slack"] as const;

/**
 * Registers every first-party adapter (IN-1). Adding a provider means adding its adapter
 * here; the marketplace, connection manager and API need no changes.
 */
export function createProviderRegistry(options: { config: ProviderConfigs; fetch: FetchLike }): ProviderRegistry {
  const registry = new ProviderRegistry();
  const adapters = [new GitHubAdapter({ config: options.config.github, fetch: options.fetch }), ...PLANNED_PROVIDERS.map(createPlannedAdapter)];
  for (const id of PROVIDER_ORDER) {
    const adapter = adapters.find((candidate) => candidate.metadata.id === id);
    if (!adapter) throw new Error(`Missing adapter for approved provider "${id}"`);
    registry.register(adapter);
  }
  return registry;
}
