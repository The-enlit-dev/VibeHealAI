import type { Availability, ProviderSummary } from "../../shared/api.js";
import type { ProviderCategory } from "../../shared/providers.js";

export interface CatalogFilter {
  readonly query: string;
  readonly category: ProviderCategory | "all";
  readonly availability: Availability | "all";
}

export const EMPTY_FILTER: CatalogFilter = { query: "", category: "all", availability: "all" };

/** Filters the catalog by free text (name, summary, category), category and availability. */
export function filterCatalog(providers: readonly ProviderSummary[], filter: CatalogFilter): ProviderSummary[] {
  const terms = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
  return providers.filter((provider) => {
    if (filter.category !== "all" && provider.category !== filter.category) return false;
    if (filter.availability !== "all" && provider.availability !== filter.availability) return false;
    const haystack = `${provider.name} ${provider.summary} ${provider.category.replace("_", " ")}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Categories that actually appear in the catalog, in first-seen order. */
export function presentCategories(providers: readonly ProviderSummary[]): ProviderCategory[] {
  return [...new Set(providers.map((provider) => provider.category))];
}

/** Up to two letters used as a neutral logo placeholder (P-14). */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  return name.trim().slice(0, 2).replace(/^./, (letter) => letter.toUpperCase());
}
