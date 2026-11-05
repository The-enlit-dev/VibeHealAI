// Data shapes returned by the VibeHeal backend API (/v1). Shared with the desktop app.
// None of these types may ever carry a credential (CR-1).

import type {
  AccessLevel,
  CapabilityDescriptor,
  ImplementationStatus,
  PermissionDescriptor,
  ProviderCategory,
  RoadmapMilestone,
} from "./providers.js";

export type Availability = "available" | "coming_soon" | "not_configured" | "connected" | "error";

export const AVAILABILITY_LABELS: Readonly<Record<Availability, string>> = {
  available: "Available",
  coming_soon: "Coming soon",
  not_configured: "Not configured",
  connected: "Connected",
  error: "Error",
};

export type ConnectionStatus = "connected" | "error";

export interface SafeError {
  readonly code: ErrorCode;
  readonly message: string;
}

export interface ConnectionView {
  readonly id: string;
  readonly providerId: string;
  readonly status: ConnectionStatus;
  /** Human label such as the GitHub account name. Never a secret. */
  readonly accountLabel: string;
  readonly grantedPermissions: readonly string[];
  readonly connectedAt: string;
  /** Provider settings page where the user can review or revoke access, if any. */
  readonly manageUrl?: string;
  readonly lastError?: SafeError;
}

export interface ProviderSummary {
  readonly id: string;
  readonly name: string;
  readonly category: ProviderCategory;
  readonly summary: string;
  readonly implementation: ImplementationStatus;
  readonly roadmapMilestone: RoadmapMilestone;
  readonly availability: Availability;
}

export interface ProviderDetail extends ProviderSummary {
  readonly description: string;
  readonly contextUse: string;
  readonly websiteUrl: string;
  readonly docsUrl: string;
  readonly authorizationHosts: readonly string[];
  readonly permissions: readonly PermissionDescriptor[];
  readonly capabilities: readonly CapabilityDescriptor[];
  readonly notes: readonly string[];
  /** Names (never values) of backend settings that are missing. */
  readonly missingConfiguration: readonly string[];
  readonly connection: ConnectionView | null;
}

export interface ConnectStartResult {
  readonly authorizationUrl: string;
  readonly expiresAt: string;
}

export type RevocationOutcome = "revoked" | "manual_required" | "failed" | "not_applicable";

export interface DisconnectResult {
  readonly providerId: string;
  readonly revocation: RevocationOutcome;
  readonly message: string;
}

export interface ActionResult {
  readonly capabilityId: string;
  readonly data: unknown;
}

export interface ApprovalView {
  readonly id: string;
  readonly connectionId: string;
  readonly capabilityId: string;
  readonly access: AccessLevel;
  readonly status: "pending" | "approved" | "used" | "expired";
  readonly expiresAt: string;
}

export type ActivityOutcome = "success" | "denied" | "failure";

export interface ActivityEntry {
  readonly id: string;
  readonly at: string;
  readonly action: string;
  readonly outcome: ActivityOutcome;
  readonly providerId?: string;
  readonly connectionId?: string;
  readonly capabilityId?: string;
  readonly message: string;
}

export const ERROR_CODES = [
  "bad_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "payload_too_large",
  "unsupported_media_type",
  "not_configured",
  "not_available",
  "approval_required",
  "invalid_state",
  "provider_error",
  "provider_unauthorized",
  "rate_limited",
  "backend_unreachable",
  "internal_error",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  readonly error: SafeError;
}
