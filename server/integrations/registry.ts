import { PROVIDER_CATEGORIES, type AccessLevel } from "../../shared/providers.js";
import { CAPABILITY_ID_PATTERN, PROVIDER_ID_PATTERN } from "../../shared/validation.js";
import type { Capability, ProviderAdapter } from "./adapter.js";

const ACCESS_RANK: Readonly<Record<AccessLevel, number>> = { read: 0, write: 1, sensitive: 2 };
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const PERMISSION_ID = /^[a-z][a-z0-9-]{1,31}(\.[a-z][a-z0-9-]{0,31}){1,3}$/;

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
  }
}

/**
 * Holds the first-party provider adapters compiled into the backend (IN-1).
 * Registration validates each adapter against the common contract, so a malformed
 * adapter fails at startup instead of misbehaving at runtime.
 */
export class ProviderRegistry {
  readonly #adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    validateAdapter(adapter);
    if (this.#adapters.has(adapter.metadata.id)) {
      throw new RegistryError(`Provider "${adapter.metadata.id}" is already registered`);
    }
    this.#adapters.set(adapter.metadata.id, adapter);
  }

  get(providerId: string): ProviderAdapter | undefined {
    return this.#adapters.get(providerId);
  }

  list(): ProviderAdapter[] {
    return [...this.#adapters.values()];
  }

  capability(providerId: string, capabilityId: string): Capability | undefined {
    return this.#adapters.get(providerId)?.capabilities.find((capability) => capability.descriptor.id === capabilityId);
  }
}

export function validateAdapter(adapter: ProviderAdapter): void {
  const { metadata } = adapter;
  const fail = (reason: string): never => {
    throw new RegistryError(`Provider "${metadata.id}": ${reason}`);
  };

  if (!PROVIDER_ID_PATTERN.test(metadata.id)) fail("invalid id");
  if (!metadata.name.trim() || !metadata.summary.trim() || !metadata.description.trim()) fail("name, summary and description are required");
  if (!metadata.contextUse.trim()) fail("contextUse is required (how it supports the core workflow)");
  if (!(PROVIDER_CATEGORIES as readonly string[]).includes(metadata.category)) fail("unknown category");
  for (const url of [metadata.websiteUrl, metadata.docsUrl]) {
    if (!url.startsWith("https://")) fail("website and docs URLs must use https");
  }
  for (const host of metadata.authorizationHosts) {
    if (!HOSTNAME.test(host)) fail(`invalid authorization host "${host}"`);
  }

  const permissions = new Map<string, AccessLevel>();
  for (const permission of metadata.permissions) {
    if (!PERMISSION_ID.test(permission.id) || !permission.id.startsWith(`${metadata.id}.`)) {
      fail(`permission id "${permission.id}" must be namespaced by the provider id`);
    }
    if (permissions.has(permission.id)) fail(`duplicate permission "${permission.id}"`);
    if (!permission.title.trim() || !permission.description.trim()) fail(`permission "${permission.id}" needs a title and description`);
    permissions.set(permission.id, permission.access);
  }

  const declared = new Set<string>();
  for (const descriptor of metadata.capabilities) {
    if (!CAPABILITY_ID_PATTERN.test(descriptor.id) || !descriptor.id.startsWith(`${metadata.id}.`)) {
      fail(`capability id "${descriptor.id}" must be namespaced by the provider id`);
    }
    if (declared.has(descriptor.id)) fail(`duplicate capability "${descriptor.id}"`);
    declared.add(descriptor.id);
    if (descriptor.requiredPermissions.length === 0) fail(`capability "${descriptor.id}" must require at least one permission`);
    for (const permissionId of descriptor.requiredPermissions) {
      const access = permissions.get(permissionId);
      if (access === undefined) fail(`capability "${descriptor.id}" uses undeclared permission "${permissionId}"`);
      else if (ACCESS_RANK[access] > ACCESS_RANK[descriptor.access]) {
        fail(`capability "${descriptor.id}" is labelled ${descriptor.access} but needs ${access} permission "${permissionId}"`);
      }
    }
  }

  const implemented = new Set(adapter.capabilities.map((capability) => capability.descriptor.id));
  if (implemented.size !== adapter.capabilities.length) fail("duplicate implemented capability");

  if (metadata.implementation === "planned") {
    // Planned providers describe their intended capabilities but cannot execute any.
    if (adapter.capabilities.length > 0) fail("planned providers must not implement capabilities");
    return;
  }

  if (metadata.authorizationHosts.length === 0) fail("implemented providers must declare authorization hosts");
  for (const capability of adapter.capabilities) {
    const descriptor = metadata.capabilities.find((item) => item.id === capability.descriptor.id);
    if (!descriptor) fail(`implemented capability "${capability.descriptor.id}" is not declared in metadata`);
    else if (descriptor !== capability.descriptor) fail(`capability "${descriptor.id}" must reuse the metadata descriptor`);
  }
  for (const id of declared) {
    if (!implemented.has(id)) fail(`declared capability "${id}" is not implemented`);
  }
}
