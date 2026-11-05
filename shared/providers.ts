// Provider metadata types shared by the backend and the desktop app.
// This module holds no secrets and no provider-specific logic.

export const PROVIDER_CATEGORIES = [
  "source_control",
  "deployment",
  "database",
  "design",
  "payments",
  "commerce",
  "productivity",
  "communication",
] as const;
export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

export const CATEGORY_LABELS: Readonly<Record<ProviderCategory, string>> = {
  source_control: "Source control",
  deployment: "Deployment",
  database: "Database",
  design: "Design",
  payments: "Payments",
  commerce: "Commerce",
  productivity: "Productivity",
  communication: "Communication",
};

/** read: no side effects. write: changes provider data. sensitive: money, production, deletion, access. */
export type AccessLevel = "read" | "write" | "sensitive";

/** implemented: a real adapter exists. planned: catalog entry only, cannot connect. */
export type ImplementationStatus = "implemented" | "planned";

export type RoadmapMilestone = "IM2" | "IM3" | "IM4";

export interface PermissionDescriptor {
  /** Stable VibeHeal permission id, for example "github.contents.read". */
  readonly id: string;
  readonly title: string;
  /** Plain-English explanation shown to the user. */
  readonly description: string;
  readonly access: AccessLevel;
  /** The provider's own name for the scope or permission, if known. */
  readonly providerScope?: string;
  /** false when the scope has not yet been checked against official documentation. */
  readonly verified: boolean;
}

export interface CapabilityDescriptor {
  /** Stable id, for example "github.repositories.list". */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly access: AccessLevel;
  readonly requiredPermissions: readonly string[];
}

export interface ProviderMetadata {
  readonly id: string;
  readonly name: string;
  readonly category: ProviderCategory;
  /** One line for catalog cards. */
  readonly summary: string;
  readonly description: string;
  /** How this provider supports the broken-project workflow (DEC-16). */
  readonly contextUse: string;
  readonly websiteUrl: string;
  readonly docsUrl: string;
  readonly implementation: ImplementationStatus;
  readonly roadmapMilestone: RoadmapMilestone;
  /** Hosts the desktop app may open for this provider's authorization (IN-6). */
  readonly authorizationHosts: readonly string[];
  readonly permissions: readonly PermissionDescriptor[];
  readonly capabilities: readonly CapabilityDescriptor[];
  /** Honest limitations and setup notes. */
  readonly notes: readonly string[];
}
