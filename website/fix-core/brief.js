// Generated from shared/explainer/ by scripts/build-fix-core.mjs. Do not edit by hand.
// Builds the handoff brief (HB-1 to HB-3): a redacted, copy-only text the user pastes into their
// own AI tool. VibeHeal sends it nowhere. It is redacted a second time as a whole before it is returned.

import { redactText } from "./redact.js";
                                                            

                             
                        
                              
                                  
                                       
 

const MAX_BRIEF_ERROR_CHARS = 6_000;

/** Keeps the start and the end of long output: the cause is usually at one of them. */
function shorten(text        )         {
  if (text.length <= MAX_BRIEF_ERROR_CHARS) return text;
  const head = text.slice(0, 1_500);
  const tail = text.slice(-4_000);
  return `${head}\n… [middle of the output left out by VibeHeal to keep this short] …\n${tail}`;
}

export function buildBrief({ redactedError, command, facts, explanations }            )         {
  const out           = [];
  out.push("I have a JavaScript/TypeScript project that is broken. Please help me fix it safely.", "");
  out.push(
    "Ground rules",
    "- First explain, in plain English, what you think is wrong. Do not change anything yet.",
    "- Propose the smallest change that could fix it, and tell me which files you would touch before you touch them.",
    "- Do not read, print, create or edit .env files or any other file that holds secrets or keys.",
    "- Do not delete files, rewrite large parts of the project, or upgrade dependencies unless I ask.",
    "- Do not run npm install, npm audit fix, or anything with --force without asking me first.",
    "- After each change, tell me how to check that it worked and how to undo it.",
    "",
  );

  out.push("What failed");
  if (command) out.push(`Command: ${command}`);
  out.push("Error output (secrets removed by VibeHeal, but please check it before sending):", "```", shorten(redactedError).trim(), "```", "");

  if (facts) {
    out.push("Project facts (from the package.json I pasted)");
    if (facts.name) out.push(`- Name: ${facts.name}`);
    if (facts.nodeEngine) out.push(`- Node.js version required: ${facts.nodeEngine}`);
    if (facts.packageManager) out.push(`- Package manager: ${facts.packageManager}`);
    if (facts.scriptNames.length) out.push(`- Scripts: ${facts.scriptNames.join(", ")}`);
    const deps = Object.entries(facts.dependencies);
    if (deps.length) {
      out.push(`- Dependencies (${deps.length}): ${deps.slice(0, 15).map(([n, v]) => `${n}@${v}`).join(", ")}${deps.length > 15 ? ", …" : ""}`);
    }
    out.push("");
  }

  if (explanations.length > 0) {
    out.push("VibeHeal's rule-based reading (a pattern match, not a diagnosis, and it may be wrong)");
    explanations.forEach((e, i) => out.push(`${i + 1}. ${e.title}. ${e.summary}`));
    out.push("");
  } else {
    out.push("VibeHeal's built-in rules did not recognise this error, so there is no rule-based reading.", "");
  }

  out.push("Please start by telling me what you need to look at, and why.");
  // Second pass over the whole brief: defence in depth in case a fact or title carried something sensitive.
  return redactText(out.join("\n")).text;
}
