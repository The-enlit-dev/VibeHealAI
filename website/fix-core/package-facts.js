// Generated from shared/explainer/ by scripts/build-fix-core.mjs. Do not edit by hand.
// Reads a pasted package.json into the few facts the explainer needs. Never keeps script bodies
// or any other field, and never echoes the pasted text back in an error.

                                               
import { LIMITS } from "./types.js";

                                                                                                     

const isRecord = (value         )                                   =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const shortText = (value         , max        )                     =>
  typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined;

export function parsePackageJson(text        )                      {
  if (text.length > LIMITS.maxPackageJsonChars) {
    return { ok: false, message: "That package.json is too large. Paste just your project's own package.json." };
  }
  let data         ;
  try {
    data = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return { ok: false, message: "That isn't valid JSON. Paste the whole contents of your package.json, or leave this box empty." };
  }
  if (!isRecord(data)) {
    return { ok: false, message: "That doesn't look like a package.json (it should start with { and end with })." };
  }

  const dependencies                         = Object.create(null)                          ;
  let total = 0;
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    const entries = data[section];
    if (!isRecord(entries)) continue;
    for (const [name, range] of Object.entries(entries)) {
      if (total >= LIMITS.maxDependencies) break;
      if (typeof range !== "string" || name.length > 214) continue;
      dependencies[name] = range.slice(0, 100);
      total += 1;
    }
  }

  const scripts = isRecord(data.scripts) ? Object.keys(data.scripts).slice(0, 50).map((n) => n.slice(0, 60)) : [];
  const engines = isRecord(data.engines) ? data.engines : undefined;

  const facts               = { scriptNames: scripts, dependencies };
  const name = shortText(data.name, 100);
  const nodeEngine = shortText(engines?.node, 60);
  const packageManager = shortText(data.packageManager, 60);
  if (name !== undefined) facts.name = name;
  if (nodeEngine !== undefined) facts.nodeEngine = nodeEngine;
  if (packageManager !== undefined) facts.packageManager = packageManager;
  return { ok: true, facts };
}
