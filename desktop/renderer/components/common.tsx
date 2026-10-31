import type { ReactNode } from "react";
import { AVAILABILITY_LABELS, type Availability, type SafeError } from "../../../shared/api.js";
import type { AccessLevel } from "../../../shared/providers.js";
import { monogram } from "../catalog-filter.js";

export function StatusBadge({ availability }: { availability: Availability }) {
  return <span className={`badge badge-${availability}`}>{AVAILABILITY_LABELS[availability]}</span>;
}

const ACCESS_LABELS: Readonly<Record<AccessLevel, string>> = { read: "Read only", write: "Can change data", sensitive: "Sensitive" };

export function AccessBadge({ access }: { access: AccessLevel }) {
  return <span className={`access access-${access}`}>{ACCESS_LABELS[access]}</span>;
}

/** Neutral placeholder instead of a provider logo (P-14). Decorative only. */
export function Monogram({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span className={`monogram monogram-${size}`} aria-hidden="true">
      {monogram(name)}
    </span>
  );
}

export function Notice({ tone, title, children }: { tone: "info" | "warning" | "error"; title: string; children?: ReactNode }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <strong>{title}</strong>
      {children ? <div className="notice-body">{children}</div> : null}
    </div>
  );
}

export function ErrorNotice({ error, onRetry }: { error: SafeError; onRetry?: () => void }) {
  const unreachable = error.code === "backend_unreachable";
  return (
    <Notice tone="error" title={unreachable ? "Backend not reachable" : "Something went wrong"}>
      <p>{error.message}</p>
      {unreachable ? (
        <p className="muted">
          The marketplace needs the local BrixoAI backend. In a terminal, run <code>npm run dev:server</code>. See README, "Local setup".
        </p>
      ) : null}
      {onRetry ? (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </Notice>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <p className="loading" role="status" aria-live="polite">
      {label}…
    </p>
  );
}
