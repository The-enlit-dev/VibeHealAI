import type { AccessLevel, CapabilityDescriptor } from "../../shared/providers.js";

// Pure permission rules, kept separate so they are easy to test and audit (IN-2 to IN-4).

/** Permissions the capability needs that the connection was not granted. */
export function missingPermissions(granted: readonly string[], capability: CapabilityDescriptor): string[] {
  const grantedSet = new Set(granted);
  return capability.requiredPermissions.filter((permission) => !grantedSet.has(permission));
}

/** Anything that is not a pure read needs an explicit, single-use approval (IN-4, DEC-21). */
export function requiresApproval(access: AccessLevel): boolean {
  return access !== "read";
}
