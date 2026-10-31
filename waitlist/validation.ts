// Validation and normalisation for early-access waitlist signups.
// Pure functions only: no I/O, so the rules are easy to test.
// The public site validates for convenience; this module is the source of truth.

export const AI_TOOLS = [
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "other", label: "Another AI coding tool" },
  { id: "none", label: "I'm not using one yet" },
] as const;

// Capabilities are PLANNED features. Listing them here asks for interest only.
export const PLANNED_CAPABILITIES = [
  { id: "explain-errors", label: "Plain-language explanations of errors" },
  { id: "handoff-brief", label: "A structured brief to paste into my AI tool" },
  { id: "review-changes", label: "Review every change before I keep it" },
  { id: "backups-undo", label: "Backups and one-click undo" },
  { id: "project-inspection", label: "A safe check of my project's setup" },
  { id: "github-context", label: "Read-only GitHub context (repos, branches, pull requests)" },
] as const;

export type AiToolId = (typeof AI_TOOLS)[number]["id"];
export type CapabilityId = (typeof PLANNED_CAPABILITIES)[number]["id"];

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  aiTool: AiToolId | null;
  frustration: string | null;
  capabilities: CapabilityId[];
  createdAt: string;
  source: "website";
}

export interface RawSignup {
  email?: unknown;
  name?: unknown;
  aiTool?: unknown;
  frustration?: unknown;
  capabilities?: unknown;
  consent?: unknown;
  /** Honeypot: real visitors never see or fill this field. */
  company?: unknown;
}

/** Result for a honeypot hit: treated as success by the caller but never stored. */
export type ValidationOutcome =
  | { kind: "valid"; value: Omit<WaitlistEntry, "id" | "createdAt" | "source"> }
  | { kind: "honeypot" }
  | { kind: "invalid"; errors: Record<string, string> };

export const LIMITS = {
  emailMax: 254,
  nameMax: 80,
  frustrationMax: 500,
} as const;

// Deliberately simple: a real address check is the confirmation email, not a regex.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Control characters (except tab/newline handled by trimming) are rejected in free text.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function cleanText(value: unknown, max: number): { text: string | null; error?: string } {
  if (value === undefined || value === null) return { text: null };
  if (typeof value !== "string") return { text: null, error: "Must be text." };
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length === 0) return { text: null };
  if (text.length > max) return { text: null, error: `Must be ${max} characters or fewer.` };
  if (CONTROL_CHARS.test(text)) return { text: null, error: "Contains characters that are not allowed." };
  return { text };
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateSignup(input: unknown): ValidationOutcome {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { kind: "invalid", errors: { form: "Please send the form again." } };
  }
  const raw = input as RawSignup;

  if (typeof raw.company === "string" && raw.company.length > 0) {
    return { kind: "honeypot" };
  }

  const errors: Record<string, string> = {};

  const emailText = typeof raw.email === "string" ? raw.email.trim() : "";
  if (emailText.length === 0) {
    errors.email = "Please enter your email address.";
  } else if (emailText.length > LIMITS.emailMax || !EMAIL_PATTERN.test(emailText)) {
    errors.email = "Please enter a valid email address.";
  }

  const name = cleanText(raw.name, LIMITS.nameMax);
  if (name.error) errors.name = name.error;

  const frustration = cleanText(raw.frustration, LIMITS.frustrationMax);
  if (frustration.error) errors.frustration = frustration.error;

  let aiTool: AiToolId | null = null;
  if (raw.aiTool !== undefined && raw.aiTool !== null && raw.aiTool !== "") {
    const match = AI_TOOLS.find((tool) => tool.id === raw.aiTool);
    if (match) aiTool = match.id;
    else errors.aiTool = "Please choose one of the listed options.";
  }

  let capabilities: CapabilityId[] = [];
  if (raw.capabilities !== undefined && raw.capabilities !== null) {
    if (!Array.isArray(raw.capabilities)) {
      errors.capabilities = "Please choose from the listed options.";
    } else {
      const allowed = new Set<string>(PLANNED_CAPABILITIES.map((c) => c.id));
      const unique = new Set<string>();
      for (const item of raw.capabilities) {
        if (typeof item !== "string" || !allowed.has(item)) {
          errors.capabilities = "Please choose from the listed options.";
          break;
        }
        unique.add(item);
      }
      capabilities = [...unique] as CapabilityId[];
    }
  }

  if (raw.consent !== true) {
    errors.consent = "Please tick the box so we can contact you about early access.";
  }

  if (Object.keys(errors).length > 0) return { kind: "invalid", errors };

  return {
    kind: "valid",
    value: {
      email: normalizeEmail(emailText),
      name: name.text,
      aiTool,
      frustration: frustration.text,
      capabilities,
    },
  };
}
