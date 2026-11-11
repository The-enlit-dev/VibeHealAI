// Entry point: validates the user's input, redacts it, applies the offline rules and builds the brief.
// Pure function. No I/O, no network, no AI, nothing is stored.

import { buildBrief } from "./brief.js";
import { parsePackageJson } from "./package-facts.js";
import { redactText } from "./redact.js";
import { runRules } from "./rules.js";
import type { AnalyzeInput, AnalyzeOutcome, ProjectFacts } from "./types.js";
import { LIMITS } from "./types.js";

/** Keeps the start and the end of very long output, because errors are usually at the end. */
function limitForAnalysis(text: string): { text: string; shortened: boolean } {
  if (text.length <= LIMITS.analyseErrorChars) return { text, shortened: false };
  const head = text.slice(0, 10_000);
  const tail = text.slice(-(LIMITS.analyseErrorChars - 10_000));
  return { text: `${head}\n… [middle left out] …\n${tail}`, shortened: true };
}

export function analyze(input: AnalyzeInput): AnalyzeOutcome {
  const errorText = typeof input.errorText === "string" ? input.errorText.replace(/\u0000/g, "") : "";
  if (errorText.trim().length < 3) {
    return { ok: false, field: "errorText", message: "Paste the error you want explained." };
  }
  if (errorText.length > LIMITS.maxErrorChars) {
    return { ok: false, field: "errorText", message: "That is too long to be a single error. Paste only the part where it starts failing (the last 100 lines or so)." };
  }

  let command: string | undefined;
  if (input.command !== undefined && input.command.trim() !== "") {
    const cleaned = input.command.trim();
    if (cleaned.length > LIMITS.maxCommandChars || /[\r\n]/.test(cleaned)) {
      return { ok: false, field: "command", message: "Enter just the one command that failed, for example: npm run build." };
    }
    command = redactText(cleaned).text;
  }

  let facts: ProjectFacts | undefined;
  if (input.packageJson !== undefined && input.packageJson.trim() !== "") {
    const parsed = parsePackageJson(input.packageJson);
    if (!parsed.ok) return { ok: false, field: "packageJson", message: parsed.message };
    facts = parsed.facts;
  }

  const limited = limitForAnalysis(errorText);
  const redaction = redactText(limited.text);
  const lines = redaction.text.split("\n");
  const explanations = runRules({ lines, facts });

  return {
    ok: true,
    result: {
      explanations,
      redactedError: redaction.text,
      redaction: { count: redaction.count, kinds: redaction.kinds },
      shortened: limited.shortened,
      facts,
      brief: buildBrief({ redactedError: redaction.text, command, facts, explanations }),
    },
  };
}
