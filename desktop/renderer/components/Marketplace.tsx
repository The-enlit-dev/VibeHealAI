import { useMemo, useState } from "react";
import { AVAILABILITY_LABELS, type Availability, type ProviderSummary } from "../../../shared/api.js";
import { CATEGORY_LABELS, type ProviderCategory } from "../../../shared/providers.js";
import { bridgeMissing, getBridge } from "../bridge.js";
import { EMPTY_FILTER, filterCatalog, presentCategories, type CatalogFilter } from "../catalog-filter.js";
import { useBridgeQuery } from "../hooks.js";
import { ErrorNotice, Loading, Monogram, StatusBadge } from "./common.js";
import { ProviderDetails } from "./ProviderDetails.js";

const AVAILABILITY_ORDER: Availability[] = ["connected", "available", "not_configured", "error", "coming_soon"];

export function Marketplace() {
  const bridge = getBridge();
  const [catalog, reload] = useBridgeQuery(() => (bridge ? bridge.listProviders() : Promise.resolve(bridgeMissing<readonly ProviderSummary[]>())), []);
  const [filter, setFilter] = useState<CatalogFilter>(EMPTY_FILTER);
  const [selected, setSelected] = useState<string | null>(null);

  const providers = catalog.status === "ready" ? catalog.data : [];
  const visible = useMemo(() => filterCatalog(providers, filter), [providers, filter]);
  const categories = useMemo(() => presentCategories(providers), [providers]);

  return (
    <div className="marketplace">
      <section className="catalog" aria-labelledby="catalog-heading">
        <header className="page-header">
          <h1 id="catalog-heading">Integrations</h1>
          <p className="muted">
            First-party integrations that bring repository, deployment and design context into your broken-project sessions. Credentials stay on the VibeHeal backend.
          </p>
        </header>

        <div className="filters" role="search">
          <label className="field">
            <span className="field-label">Search</span>
            <input
              type="search"
              value={filter.query}
              placeholder="Search integrations"
              maxLength={80}
              onChange={(event) => setFilter({ ...filter, query: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <select value={filter.category} onChange={(event) => setFilter({ ...filter, category: event.target.value as ProviderCategory | "all" })}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Status</span>
            <select value={filter.availability} onChange={(event) => setFilter({ ...filter, availability: event.target.value as Availability | "all" })}>
              <option value="all">Any status</option>
              {AVAILABILITY_ORDER.map((availability) => (
                <option key={availability} value={availability}>
                  {AVAILABILITY_LABELS[availability]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {catalog.status === "loading" ? <Loading label="Loading integrations" /> : null}
        {catalog.status === "error" ? <ErrorNotice error={catalog.error} onRetry={reload} /> : null}
        {catalog.status === "ready" && visible.length === 0 ? (
          <div className="empty">
            <p>No integrations match your filters.</p>
            <button type="button" className="button" onClick={() => setFilter(EMPTY_FILTER)}>
              Clear filters
            </button>
          </div>
        ) : null}

        <ul className="card-grid" aria-label="Integration catalog">
          {visible.map((provider) => (
            <li key={provider.id}>
              <button
                type="button"
                className={`card${selected === provider.id ? " card-selected" : ""}`}
                aria-pressed={selected === provider.id}
                onClick={() => setSelected(provider.id)}
              >
                <span className="card-top">
                  <Monogram name={provider.name} />
                  <StatusBadge availability={provider.availability} />
                </span>
                <span className="card-name">{provider.name}</span>
                <span className="card-category">{CATEGORY_LABELS[provider.category]}</span>
                <span className="card-summary">{provider.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <aside className="details-pane" aria-label="Integration details">
        {selected ? (
          <ProviderDetails key={selected} providerId={selected} onChanged={reload} onClose={() => setSelected(null)} />
        ) : (
          <div className="empty details-empty">
            <p>Select an integration to see what it can access and how to connect it.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
