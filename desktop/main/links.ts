// URL checks before anything is opened in the system browser (IN-6).

function parseHttps(value: string): URL | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

/** Authorization URLs must be https and on a host the provider declared. */
export function isAllowedAuthorizationUrl(value: string, authorizationHosts: readonly string[]): boolean {
  const url = parseHttps(value);
  return url !== null && authorizationHosts.includes(url.hostname);
}

/** Provider web links may also use the provider's website and docs hosts. */
export function isAllowedProviderLink(
  value: string,
  provider: { readonly authorizationHosts: readonly string[]; readonly websiteUrl: string; readonly docsUrl: string },
): boolean {
  const url = parseHttps(value);
  if (!url) return false;
  const hosts = new Set(provider.authorizationHosts);
  for (const link of [provider.websiteUrl, provider.docsUrl]) {
    const parsed = parseHttps(link);
    if (parsed) hosts.add(parsed.hostname);
  }
  return hosts.has(url.hostname);
}
