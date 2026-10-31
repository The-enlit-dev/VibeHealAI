import type { ComponentType } from "react";
import type { ProviderDetail } from "../../../shared/api.js";
import { GitHubContext } from "./GitHubContext.js";

export interface ContextViewProps {
  readonly provider: ProviderDetail;
  readonly connectionId: string;
}

// Optional provider-specific views of read-only context. This is the only place the
// desktop app knows about individual providers; the marketplace itself is generic.
const VIEWS: Readonly<Record<string, ComponentType<ContextViewProps>>> = {
  github: GitHubContext,
};

export function contextViewFor(providerId: string): ComponentType<ContextViewProps> | null {
  return Object.hasOwn(VIEWS, providerId) ? (VIEWS[providerId] ?? null) : null;
}
