import { useEffect, useState } from "react";
import type { DisconnectResult, ProviderDetail, SafeError } from "../../../shared/api.js";
import { CATEGORY_LABELS } from "../../../shared/providers.js";
import { bridgeMissing, getBridge } from "../bridge.js";
import { contextViewFor } from "../context-views/index.js";
import { useBridgeQuery } from "../hooks.js";
import { AccessBadge, ErrorNotice, Loading, Monogram, Notice, StatusBadge } from "./common.js";

type Flow =
  | { readonly kind: "idle" }
  | { readonly kind: "busy"; readonly label: string }
  | { readonly kind: "waiting"; readonly expiresAt: string }
  | { readonly kind: "confirm-disconnect" }
  | { readonly kind: "disconnected"; readonly result: DisconnectResult }
  | { readonly kind: "failed"; readonly error: SafeError };

const POLL_MS = 3000;

export function ProviderDetails({ providerId, onChanged, onClose }: { providerId: string; onChanged: () => void; onClose: () => void }) {
  const bridge = getBridge();
  const [detail, reload] = useBridgeQuery(
    () => (bridge ? bridge.getProvider(providerId) : Promise.resolve(bridgeMissing<ProviderDetail>())),
    [providerId],
  );
  const [flow, setFlow] = useState<Flow>({ kind: "idle" });

  // While the user finishes authorization in the browser, poll until the backend reports
  // the connection or the authorization link expires (U16).
  useEffect(() => {
    if (flow.kind !== "waiting") return;
    if (detail.status === "ready" && detail.data.availability === "connected") {
      setFlow({ kind: "idle" });
      onChanged();
      return;
    }
    if (Date.parse(flow.expiresAt) <= Date.now()) {
      setFlow({ kind: "failed", error: { code: "invalid_state", message: "The authorization link expired. Start again." } });
      return;
    }
    const timer = window.setTimeout(reload, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [flow, detail, reload, onChanged]);

  if (detail.status === "loading") return <Loading label="Loading details" />;
  if (detail.status === "error") return <ErrorNotice error={detail.error} onRetry={reload} />;

  const provider = detail.data;
  const connection = provider.connection;
  const canConnect = provider.availability === "available" || provider.availability === "error";
  const ContextView = connection && connection.status === "connected" ? contextViewFor(provider.id) : null;

  const connect = async () => {
    if (!bridge) return;
    setFlow({ kind: "busy", label: "Opening your browser" });
    const result = await bridge.connect(provider.id);
    setFlow(result.ok ? { kind: "waiting", expiresAt: result.data.expiresAt } : { kind: "failed", error: result.error });
  };

  const disconnect = async () => {
    if (!bridge || !connection) return;
    setFlow({ kind: "busy", label: "Disconnecting" });
    const result = await bridge.disconnect(connection.id);
    setFlow(result.ok ? { kind: "disconnected", result: result.data } : { kind: "failed", error: result.error });
    reload();
    onChanged();
  };

  return (
    <article className="details">
      <header className="details-header">
        <Monogram name={provider.name} size="lg" />
        <div>
          <h2>{provider.name}</h2>
          <p className="muted">
            {CATEGORY_LABELS[provider.category]} · <StatusBadge availability={provider.availability} />
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </header>

      <p>{provider.description}</p>
      <p className="muted">
        <strong>How it helps:</strong> {provider.contextUse}
      </p>

      <AvailabilityNotice provider={provider} />

      {connection ? (
        <section className="section" aria-label="Connection">
          <h3>Connection</h3>
          <dl className="facts">
            <dt>Account</dt>
            <dd>{connection.accountLabel}</dd>
            <dt>Connected</dt>
            <dd>{new Date(connection.connectedAt).toLocaleString()}</dd>
          </dl>
          {connection.lastError ? <ErrorNotice error={connection.lastError} /> : null}
          {connection.manageUrl ? (
            <button type="button" className="link-button" onClick={() => void bridge?.openProviderLink(provider.id, connection.manageUrl as string)}>
              Manage access on {provider.name}
            </button>
          ) : null}
        </section>
      ) : null}

      <div className="actions">
        {canConnect ? (
          <button type="button" className="button button-primary" disabled={flow.kind === "busy" || flow.kind === "waiting"} onClick={() => void connect()}>
            {provider.availability === "error" ? "Reconnect" : "Connect"}
          </button>
        ) : null}
        {connection && flow.kind !== "confirm-disconnect" ? (
          <button type="button" className="button" disabled={flow.kind === "busy"} onClick={() => setFlow({ kind: "confirm-disconnect" })}>
            Disconnect
          </button>
        ) : null}
        {provider.availability === "coming_soon" ? (
          <button type="button" className="button" disabled>
            Coming soon
          </button>
        ) : null}
      </div>

      {flow.kind === "busy" ? <Loading label={flow.label} /> : null}
      {flow.kind === "waiting" ? (
        <Notice tone="info" title="Finish in your browser">
          <p>Approve access on {provider.name}, then come back here. This page updates when the connection is confirmed by the backend.</p>
          <button type="button" className="button" onClick={() => setFlow({ kind: "idle" })}>
            Cancel waiting
          </button>
        </Notice>
      ) : null}
      {flow.kind === "confirm-disconnect" ? (
        <Notice tone="warning" title={`Disconnect ${provider.name}?`}>
          <p>BrixoAI will delete its stored access and try to revoke it at {provider.name}.</p>
          <div className="actions">
            <button type="button" className="button button-danger" onClick={() => void disconnect()}>
              Disconnect
            </button>
            <button type="button" className="button" onClick={() => setFlow({ kind: "idle" })}>
              Keep connected
            </button>
          </div>
        </Notice>
      ) : null}
      {flow.kind === "disconnected" ? (
        <Notice tone={flow.result.revocation === "failed" ? "warning" : "info"} title="Disconnected">
          <p>{flow.result.message}</p>
        </Notice>
      ) : null}
      {flow.kind === "failed" ? <ErrorNotice error={flow.error} /> : null}

      {ContextView && connection ? <ContextView provider={provider} connectionId={connection.id} /> : null}

      <section className="section" aria-label="Permissions">
        <h3>Permissions {provider.implementation === "planned" ? "planned" : "requested"}</h3>
        <ul className="plain-list">
          {provider.permissions.map((permission) => (
            <li key={permission.id} className="permission">
              <div className="permission-title">
                <span>{permission.title}</span>
                <AccessBadge access={permission.access} />
              </div>
              <p className="muted">{permission.description}</p>
              {permission.providerScope ? <p className="muted small">{provider.name} permission: {permission.providerScope}</p> : null}
              {!permission.verified ? <p className="muted small">Not yet checked against {provider.name}'s official documentation.</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-label="Capabilities">
        <h3>{provider.implementation === "planned" ? "Planned capabilities" : "What BrixoAI can do"}</h3>
        <ul className="plain-list">
          {provider.capabilities.map((capability) => (
            <li key={capability.id}>
              <span>{capability.title}</span> <AccessBadge access={capability.access} />
              <p className="muted">{capability.description}</p>
            </li>
          ))}
        </ul>
      </section>

      {provider.notes.length > 0 ? (
        <section className="section" aria-label="Notes">
          <h3>Notes and limitations</h3>
          <ul>
            {provider.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="small">
        <button type="button" className="link-button" onClick={() => void bridge?.openProviderLink(provider.id, provider.docsUrl)}>
          {provider.name} API documentation
        </button>
      </p>
    </article>
  );
}

function AvailabilityNotice({ provider }: { provider: ProviderDetail }) {
  switch (provider.availability) {
    case "coming_soon":
      return (
        <Notice tone="info" title={`Planned for milestone ${provider.roadmapMilestone}`}>
          <p>This integration is not built yet and cannot be connected.</p>
        </Notice>
      );
    case "not_configured":
      return (
        <Notice tone="warning" title="Not configured on this backend">
          <p>The backend owner needs to add these settings before {provider.name} can be connected:</p>
          <ul>
            {provider.missingConfiguration.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
          <p className="muted">Setup guides for each provider are in the repository under docs/integrations/.</p>
        </Notice>
      );
    case "error":
      return (
        <Notice tone="error" title="Connection needs attention">
          <p>{provider.connection?.lastError?.message ?? "The provider rejected BrixoAI's access."} Reconnect to fix it.</p>
        </Notice>
      );
    default:
      return null;
  }
}
