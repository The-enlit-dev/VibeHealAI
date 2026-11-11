// Redaction for pasted error output (SE-2, HB-1). Pattern-based, so it can miss unusual secret
// formats: the page tells users to check the text before sharing it. Works line by line with a
// length cap, so no pattern can run for long on adversarial input.

import type { RedactionSummary } from "./types.js";
import { LIMITS } from "./types.js";

export const MASK = "[REDACTED]";

interface Pattern {
  kind: string;
  regex: RegExp;
}

const SECRET_PATTERNS: readonly Pattern[] = [
  { kind: "private key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g },
  { kind: "token", regex: /\bgh[pousr]_[A-Za-z0-9]{20,255}\b/g },
  { kind: "token", regex: /\bgithub_pat_[A-Za-z0-9_]{20,255}\b/g },
  { kind: "token", regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,255}\b/g },
  { kind: "token", regex: /\bwhsec_[A-Za-z0-9]{10,255}\b/g },
  { kind: "token", regex: /\bxox[abposr]-[A-Za-z0-9-]{10,255}\b/g },
  { kind: "token", regex: /\bnpm_[A-Za-z0-9]{30,255}\b/g },
  { kind: "token", regex: /\bsbp_[A-Za-z0-9]{20,255}\b/g },
  { kind: "token", regex: /\bAIza[A-Za-z0-9_-]{30,60}\b/g },
  { kind: "token", regex: /\bsk-[A-Za-z0-9_-]{20,255}\b/g },
  { kind: "token", regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { kind: "token", regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
];

// scheme://user:password@host  (database URLs, git remotes)
const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s:@/]+:[^\s@/]+@/gi;

// "Authorization: Bearer abc" / "Bearer abc"
const AUTH_SCHEME = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g;

// NAME=value or "name": "value" where the name looks sensitive.
const SENSITIVE_ASSIGNMENT =
  /(["']?[A-Za-z0-9_.-]{0,64}(?:secret|token|password|passwd|passphrase|api[_-]?key|private[_-]?key|access[_-]?key|service[_-]?role|_key|credential|authorization|cookie)[A-Za-z0-9_.-]{0,64}["']?\s*[:=]\s*)(["'`]?)([^\s"'`,;&]{4,})\2/gi;

// Words that show a value is missing rather than secret: keep them so the explanation still works.
const NOT_A_VALUE = /^(?:undefined|null|true|false|missing|empty|required|string|not|none|unset)$/i;

// Personal folders: C:\Users\name, /Users/name, /home/name
const PERSONAL_PATHS: readonly RegExp[] = [/([A-Za-z]:[\\/]Users[\\/])[^\\/\s:*?"<>|]+/g, /(\/(?:Users|home)\/)[^/\s:]+/g];

export interface RedactionResult extends RedactionSummary {
  text: string;
}

function redactLine(line: string, found: Set<string>, counter: { n: number }): string {
  let result = line.length > LIMITS.maxLineChars ? `${line.slice(0, LIMITS.maxLineChars)}…[line shortened]` : line;
  const hit = (kind: string): string => {
    found.add(kind);
    counter.n += 1;
    return MASK;
  };

  result = result.replace(URL_CREDENTIALS, (_m, scheme: string) => `${scheme}${hit("password in a web address")}@`);
  for (const { kind, regex } of SECRET_PATTERNS) result = result.replace(regex, () => hit(kind));
  result = result.replace(AUTH_SCHEME, (_m, scheme: string) => `${scheme} ${hit("token")}`);
  result = result.replace(SENSITIVE_ASSIGNMENT, (whole: string, prefix: string, quote: string, value: string) => {
    if (NOT_A_VALUE.test(value) || value === MASK || value.startsWith("[REDACTED")) return whole;
    return `${prefix}${quote}${hit("password or secret setting")}${quote}`;
  });
  for (const regex of PERSONAL_PATHS) {
    result = result.replace(regex, (_m, prefix: string) => {
      found.add("personal path");
      counter.n += 1;
      return `${prefix}<user>`;
    });
  }
  return result;
}

export function redactText(input: string): RedactionResult {
  const found = new Set<string>();
  const counter = { n: 0 };
  // The private-key pattern spans lines, so it runs on the whole text first.
  let text = input.replace(SECRET_PATTERNS[0]!.regex, () => {
    found.add("private key");
    counter.n += 1;
    return MASK;
  });
  text = text
    .split(/\r?\n/)
    .map((line) => redactLine(line, found, counter))
    .join("\n");
  return { text, count: counter.n, kinds: [...found].sort() };
}
