// Types for the offline error explainer (PRODUCT.md §5). Pure data: no I/O, no network, no secrets.

export type Confidence = "high" | "medium";

/** Facts read from a pasted package.json. Only names and version ranges are kept, never script bodies. */
export interface ProjectFacts {
  name?: string;
  nodeEngine?: string;
  packageManager?: string;
  scriptNames: string[];
  /** dependencies + devDependencies + peerDependencies: package name to version range. */
  dependencies: Record<string, string>;
}

export interface Explanation {
  /** Stable id of the rule that matched, e.g. "missing-module". */
  ruleId: string;
  title: string;
  /** One or two plain-English sentences: what is wrong. */
  summary: string;
  /** Why this usually happens. */
  why: string;
  /** Safe things the user can check, in order. Never destructive. */
  checks: string[];
  /** File paths mentioned in the error (already redacted). */
  likelyFiles: string[];
  confidence: Confidence;
  /** The matching lines from the (redacted) error, at most 3. */
  evidence: string[];
}

export interface RuleContext {
  /** Redacted error lines, each capped in length. */
  lines: readonly string[];
  facts: ProjectFacts | undefined;
}

export type Rule = (context: RuleContext) => Explanation | null;

export interface RedactionSummary {
  /** Number of values replaced. */
  count: number;
  /** Distinct kinds, e.g. "private key", "token", "password or secret setting", "personal path". */
  kinds: string[];
}

export interface AnalyzeInput {
  errorText: string;
  /** The command that failed, e.g. "npm run build". Optional. */
  command?: string;
  /** Pasted package.json text. Optional. */
  packageJson?: string;
}

export type AnalyzeField = "errorText" | "command" | "packageJson";

export interface AnalyzeResult {
  explanations: Explanation[];
  redactedError: string;
  redaction: RedactionSummary;
  /** True when the pasted error was long and only its start and end were analysed. */
  shortened: boolean;
  facts: ProjectFacts | undefined;
  /** The copy-ready brief for the user's own AI tool. Redacted. */
  brief: string;
}

export type AnalyzeOutcome =
  | { ok: true; result: AnalyzeResult }
  | { ok: false; field: AnalyzeField; message: string };

export const LIMITS = {
  /** Reject anything larger: it is almost certainly not a single error. */
  maxErrorChars: 200_000,
  /** Above this, keep the start and the end (errors are usually at the end). */
  analyseErrorChars: 40_000,
  maxLineChars: 1_000,
  maxCommandChars: 200,
  maxPackageJsonChars: 200_000,
  maxDependencies: 500,
} as const;
