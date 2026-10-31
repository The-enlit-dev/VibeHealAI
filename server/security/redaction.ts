// Pattern-based redaction applied to every log line, audit entry and error message
// (SE-2, BK-9, AU-2). Redaction can miss unusual formats (SECURITY.md §5), so it is
// a second line of defence: code must still avoid putting secrets in messages.

const MASK = "[REDACTED]";

const PATTERNS: readonly RegExp[] = [
  // Private key blocks.
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  // GitHub tokens (classic, OAuth, user-to-server, server-to-server, refresh, fine-grained).
  /\bgh[pousr]_[A-Za-z0-9]{20,255}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,255}\b/g,
  // Stripe secret, restricted and webhook keys.
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,255}\b/g,
  /\bwhsec_[A-Za-z0-9]{10,255}\b/g,
  // Slack tokens.
  /\bxox[abposr]-[A-Za-z0-9-]{10,255}\b/g,
  // Shopify access tokens.
  /\bshp(?:at|ca|pa|ss)_[A-Fa-f0-9]{16,64}\b/g,
  // Notion integration tokens.
  /\b(?:secret|ntn)_[A-Za-z0-9]{20,255}\b/g,
  // Figma personal access tokens.
  /\bfig[du]_[A-Za-z0-9_-]{20,255}\b/g,
  // Supabase personal access tokens.
  /\bsbp_[A-Za-z0-9]{20,255}\b/g,
  // Anthropic and OpenAI-style keys.
  /\bsk-[A-Za-z0-9_-]{20,255}\b/g,
  // AWS access key ids.
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  // JSON Web Tokens.
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
];

// "Bearer <token>" and "token <token>" authorization values.
const AUTH_SCHEME = /\b(Bearer|token|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;

// key=value or "key": "value" where the key name looks sensitive.
const SENSITIVE_ASSIGNMENT =
  /(["']?[A-Za-z0-9_.-]*(?:secret|token|password|passwd|api[_-]?key|private[_-]?key|client[_-]?secret|authorization|cookie)[A-Za-z0-9_.-]*["']?\s*[:=]\s*)(["']?)[^\s"',;&]{4,}\2/gi;

// Query parameters that carry credentials or authorization codes.
const SENSITIVE_QUERY = /([?&](?:code|state|access_token|refresh_token|client_secret|token)=)[^&\s#]+/gi;

export function redact(text: string, knownSecrets: readonly string[] = []): string {
  let result = text;
  for (const secret of knownSecrets) {
    if (secret.length >= 6) result = result.split(secret).join(MASK);
  }
  for (const pattern of PATTERNS) result = result.replace(pattern, MASK);
  result = result.replace(AUTH_SCHEME, (_match, scheme: string) => `${scheme} ${MASK}`);
  result = result.replace(SENSITIVE_ASSIGNMENT, (_match, prefix: string, quote: string) => `${prefix}${quote}${MASK}${quote}`);
  result = result.replace(SENSITIVE_QUERY, (_match, prefix: string) => `${prefix}${MASK}`);
  return result;
}

const SENSITIVE_KEY = /(secret|token|password|passwd|authorization|cookie|api[_-]?key|private[_-]?key|credential)/i;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

/** Deep-copies a value, dropping sensitive keys and redacting strings. Depth and size are capped. */
export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (typeof value === "string") return truncate(redact(value), 2000);
  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactValue(item, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
      output[key] = isSensitiveKey(key) ? MASK : redactValue(item, depth + 1);
    }
    return output;
  }
  return `[${typeof value}]`;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…[truncated]`;
}
