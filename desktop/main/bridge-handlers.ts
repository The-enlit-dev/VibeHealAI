import type { ActionResult, ActivityEntry, ConnectStartResult, DisconnectResult, ProviderDetail, ProviderSummary } from "../../shared/api.js";
import type { BackendStatus, BridgeResult, VibeHealBridge } from "../../shared/ipc.js";
import { CAPABILITY_ID_PATTERN, PROVIDER_ID_PATTERN, RESOURCE_ID_PATTERN } from "../../shared/validation.js";
import type { BackendClient } from "./backend-client.js";
import { isAllowedAuthorizationUrl, isAllowedProviderLink } from "./links.js";

// Main-process implementations of window.vibeheal. Every argument from the renderer is
// validated here before it is used, because the renderer is treated as untrusted.

type Handlers = { [K in keyof VibeHealBridge]: (...args: unknown[]) => ReturnType<VibeHealBridge[K]> };

const invalid = <T>(): BridgeResult<T> => ({ ok: false, error: { code: "bad_request", message: "Invalid request from the window." } });
const isString = (value: unknown, pattern: RegExp): value is string => typeof value === "string" && pattern.test(value);

export function createBridgeHandlers(deps: { client: BackendClient; openExternal: (url: string) => Promise<void> }): Handlers {
  const { client } = deps;

  const getProvider = async (providerId: string): Promise<BridgeResult<ProviderDetail>> => {
    const result = await client.request<{ provider: ProviderDetail }>("GET", `/v1/providers/${providerId}`);
    return result.ok ? { ok: true, data: result.data.provider } : result;
  };

  return {
    async backendStatus(): Promise<BridgeResult<BackendStatus>> {
      return { ok: true, data: { reachable: await client.health(), configured: client.configured, backendUrl: client.backendUrl } };
    },

    async listProviders(): Promise<BridgeResult<readonly ProviderSummary[]>> {
      const result = await client.request<{ providers: ProviderSummary[] }>("GET", "/v1/providers");
      return result.ok ? { ok: true, data: result.data.providers } : result;
    },

    async getProvider(providerId) {
      if (!isString(providerId, PROVIDER_ID_PATTERN)) return invalid();
      return getProvider(providerId);
    },

    async connect(providerId) {
      if (!isString(providerId, PROVIDER_ID_PATTERN)) return invalid();
      const provider = await getProvider(providerId);
      if (!provider.ok) return provider;
      const started = await client.request<ConnectStartResult>("POST", `/v1/providers/${providerId}/connect`);
      if (!started.ok) return started;
      if (!isAllowedAuthorizationUrl(started.data.authorizationUrl, provider.data.authorizationHosts)) {
        return { ok: false, error: { code: "forbidden", message: "Blocked an authorization link to an unexpected website." } };
      }
      await deps.openExternal(started.data.authorizationUrl);
      return { ok: true, data: { expiresAt: started.data.expiresAt } };
    },

    async disconnect(connectionId) {
      if (!isString(connectionId, RESOURCE_ID_PATTERN)) return invalid();
      return client.request<DisconnectResult>("DELETE", `/v1/connections/${connectionId}`);
    },

    async runAction(connectionId, capabilityId, input) {
      if (!isString(connectionId, RESOURCE_ID_PATTERN) || !isString(capabilityId, CAPABILITY_ID_PATTERN)) return invalid();
      if (typeof input !== "object" || input === null || Array.isArray(input)) return invalid();
      if (JSON.stringify(input).length > 16_384) return invalid();
      return client.request<ActionResult>("POST", `/v1/connections/${connectionId}/actions/${capabilityId}`, { input });
    },

    async listActivity(limit) {
      if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 200) return invalid();
      const result = await client.request<{ activity: ActivityEntry[] }>("GET", `/v1/activity?limit=${limit}`);
      return result.ok ? { ok: true, data: result.data.activity } : result;
    },

    async openProviderLink(providerId, url) {
      if (!isString(providerId, PROVIDER_ID_PATTERN) || typeof url !== "string") return invalid();
      const provider = await getProvider(providerId);
      if (!provider.ok) return provider;
      if (!isAllowedProviderLink(url, provider.data)) {
        return { ok: false, error: { code: "forbidden", message: "Blocked a link to an unexpected website." } };
      }
      await deps.openExternal(url);
      return { ok: true, data: { opened: true } };
    },
  };
}
