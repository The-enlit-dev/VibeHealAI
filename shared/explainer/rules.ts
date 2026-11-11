// Offline, rule-based explanations for common JavaScript/TypeScript failures (PRODUCT.md §5).
// These are pattern matches, not understanding: every explanation says what matched, and an error
// that matches nothing is reported as "no match" rather than guessed at. Rules only see redacted text.
// All patterns are linear-time and run on lines capped in length.

import type { Confidence, Explanation, Rule, RuleContext } from "./types.js";

const MAX_EVIDENCE = 3;
const MAX_FILES = 5;

interface Hit {
  line: string;
  match: RegExpMatchArray;
}

function findAll(lines: readonly string[], regex: RegExp, limit = 50): Hit[] {
  const hits: Hit[] = [];
  for (const line of lines) {
    const match = regex.exec(line);
    if (match) hits.push({ line: line.trim(), match });
    if (hits.length >= limit) break;
  }
  return hits;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

const FILE_PATH = /(?:[A-Za-z]:)?[\\/\w.@()[\]-]+[\\/][\w.@()[\]\\/-]+\.(?:tsx?|jsx?|mjs|cjs|mts|cts|json|css|env)\b/g;

/** File paths mentioned near the matched lines. Skips node_modules and Node internals. */
function filesIn(lines: readonly string[]): string[] {
  const files: string[] = [];
  for (const line of lines) {
    for (const found of line.match(FILE_PATH) ?? []) {
      if (/node_modules|^node:|internal[\\/]/.test(found)) continue;
      files.push(found.replace(/^file:\/\/\/?/, ""));
    }
  }
  return unique(files).slice(0, MAX_FILES);
}

function make(
  ruleId: string,
  confidence: Confidence,
  hits: readonly Hit[],
  body: Pick<Explanation, "title" | "summary" | "why" | "checks">,
  lines: readonly string[],
): Explanation {
  const evidence = unique(hits.map((h) => h.line)).slice(0, MAX_EVIDENCE);
  return { ruleId, confidence, evidence, likelyFiles: filesIn(evidence.length ? evidence : lines.slice(0, 20)), ...body };
}

const NODE_BUILTINS = new Set([
  "fs", "path", "os", "http", "https", "url", "util", "crypto", "stream", "events", "child_process", "zlib", "net", "tls", "dns", "assert", "buffer", "querystring", "readline", "worker_threads", "module", "process",
]);

function packageNameOf(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? specifier);
}

// ---------------------------------------------------------------------------------------------

const missingModule: Rule = ({ lines, facts }) => {
  const patterns = [
    /Cannot find module ['"]([^'"]+)['"]/,
    /Module not found:[^\n]*?Can't resolve ['"]([^'"]+)['"]/,
    /Failed to resolve import ['"]([^'"]+)['"]/,
    /Cannot find package ['"]([^'"]+)['"] imported from/,
    /Could not resolve ['"]([^'"]+)['"]/,
  ];
  for (const pattern of patterns) {
    const hits = findAll(lines, pattern);
    const first = hits[0];
    const specifier = first?.match[1];
    if (!first || !specifier || specifier.startsWith("node:") || NODE_BUILTINS.has(specifier)) continue;

    const isAlias = specifier.startsWith("@/") || specifier.startsWith("~/") || specifier.startsWith("#");
    const isRelative = specifier.startsWith(".") || specifier.startsWith("/");

    if (isRelative || isAlias) {
      return make(
        "missing-module",
        "high",
        hits,
        {
          title: `A file can't be found: "${specifier}"`,
          summary: `Your code imports "${specifier}", but nothing exists at that path.`,
          why: "The file was renamed, moved or deleted, the path has a typo, or the letter case differs (Windows ignores case, Linux hosts such as Vercel and Netlify do not).",
          checks: [
            "Open the file that contains this import and compare the path with the real file name, letter by letter.",
            "Check the folder: does a file with that name (and a .ts, .tsx, .js or index file) exist there?",
            ...(isAlias ? ["If the path starts with @/ or ~/, check the \"paths\" setting in tsconfig.json or jsconfig.json."] : []),
            "If it works on your computer but fails on a hosting service, check capital letters in the file name.",
          ],
        },
        lines,
      );
    }

    const pkg = packageNameOf(specifier);
    const version = facts?.dependencies[pkg];
    const checks =
      facts === undefined
        ? [
            `Open package.json and look for "${pkg}" under dependencies or devDependencies.`,
            "If it is listed: the install is incomplete. Reinstalling (npm install) usually fixes that.",
            `If it is not listed: the code uses a package that was never added. Adding it (npm install ${pkg}) changes package.json, so decide on purpose.`,
          ]
        : version !== undefined
          ? [
              `package.json lists "${pkg}" (${version}), so it is declared but missing from node_modules.`,
              "Run npm install in the project folder, then run the failing command again.",
              "If the error returns, the install may have failed. Read its output for ERR lines.",
            ]
          : [
              `package.json does not list "${pkg}", so the code uses a package that was never added to this project.`,
              `Adding it (npm install ${pkg}) changes package.json and the lockfile: make sure the name is spelled right first, since similar-looking names exist.`,
              "If the import is a typo, fix the import instead of installing anything.",
            ];
    return make(
      "missing-module",
      "high",
      hits,
      {
        title: `The package "${pkg}" can't be found`,
        summary: `Your project tries to use "${specifier}", but it is not installed where the project can find it.`,
        why: "The package was never installed, an install was interrupted, node_modules was deleted, or the project was copied without it.",
        checks,
      },
      lines,
    );
  }
  return null;
};

const wrongFileCase: Rule = ({ lines }) => {
  const hits = [
    ...findAll(lines, /differs from already included file name .* only in casing/i),
    ...findAll(lines, /multiple modules with names that only differ in casing/i),
    ...findAll(lines, /\bTS1(?:149|261)\b/),
  ];
  if (hits.length === 0) return null;
  return make(
    "wrong-file-case",
    "high",
    hits,
    {
      title: "The same file is imported with different capital letters",
      summary: "Two imports point to the same file but spell its name with different upper/lower case letters.",
      why: "Windows and macOS treat Header.tsx and header.tsx as the same file. Linux, which most hosting uses, treats them as different, so this can work on your computer and fail when deployed.",
      checks: [
        "Find the two spellings named in the error and decide which one matches the real file name.",
        "Change the imports so they all use exactly the real file name.",
        "If you renamed a file only by changing its case, Git may not have noticed: check the name Git tracks.",
      ],
    },
    lines,
  );
};

const portInUse: Rule = ({ lines }) => {
  const hits = [
    ...findAll(lines, /EADDRINUSE[^\n]*?:(\d{2,5})\b/),
    ...findAll(lines, /address already in use[^\n]*?:(\d{2,5})\b/i),
    ...findAll(lines, /Port (\d{2,5}) is (?:already )?in use/i),
  ];
  const portText = hits.map((h) => h.match[1]).find((p) => p !== undefined && Number(p) >= 1 && Number(p) <= 65535);
  if (hits.length === 0 && !lines.some((l) => l.includes("EADDRINUSE"))) return null;
  const port = portText ?? "that port";
  return make(
    "port-in-use",
    "high",
    hits.length ? hits : findAll(lines, /EADDRINUSE/),
    {
      title: `Another program is already using port ${port}`,
      summary: `Your app tried to start on port ${port}, but something else is already listening there.`,
      why: "Usually an earlier copy of the same dev server is still running in another terminal or in the background.",
      checks: [
        "Close other terminals or editor panels that might be running the same project, then try again.",
        ...(portText ? [`On Windows, you can see what uses the port with: netstat -ano | findstr :${portText}  (the last number is the process id in Task Manager).`] : []),
        "Or start your app on a different port. Many tools accept a --port flag or a PORT setting.",
      ],
    },
    lines,
  );
};

const ENV_NAME = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
const IGNORED_ENV_NAMES = /^(?:ERR_|NODE_|EADDR|ELIFECYCLE)/;

const missingEnv: Rule = ({ lines }) => {
  const hits: Hit[] = [];
  const names: string[] = [];
  for (const line of lines) {
    const mentionsEnv = /environment variable|env var|\.env\b|process\.env/i.test(line);
    const saysMissing = /missing|not set|undefined|not defined|required|invalid|must be set|is empty/i.test(line);
    const explicit = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b (?:is )?(?:not set|is not defined|is undefined|is missing|must be set|is required)/.exec(line);
    if ((mentionsEnv && saysMissing) || explicit) {
      const found = (line.match(ENV_NAME) ?? []).filter((n) => !IGNORED_ENV_NAMES.test(n));
      if (found.length > 0 || explicit) {
        hits.push({ line: line.trim(), match: /[\s\S]*/.exec(line) as RegExpMatchArray });
        names.push(...found);
      }
    }
  }
  const supabase = findAll(lines, /supabaseUrl is required|supabaseKey is required/i);
  if (hits.length === 0 && supabase.length === 0) return null;
  const listed = unique(names).slice(0, 10);
  const allHits = [...hits, ...supabase];
  return make(
    "missing-env",
    listed.length > 0 ? "high" : "medium",
    allHits,
    {
      title: listed.length > 0 ? `A required setting is missing: ${listed.join(", ")}` : "A required setting (environment variable) is missing",
      summary:
        listed.length > 0
          ? `The project expects ${listed.length === 1 ? "this setting" : "these settings"} to be defined, but ${listed.length === 1 ? "it isn't" : "they aren't"}.`
          : "The project expects a setting that isn't defined. For Supabase, that is usually the project URL or key.",
      why: "Settings such as API keys live in a .env file that is deliberately not shared or committed. A new computer, a fresh checkout, a hosting service or a typo in the name leaves them empty.",
      checks: [
        "Compare the names in your .env (or .env.local) file with .env.example, if the project has one. Compare names only: do not paste values anywhere.",
        "Check spelling and capital letters of the name. Browser-side settings in Next.js and Vite need a prefix such as NEXT_PUBLIC_ or VITE_.",
        "After changing a .env file, restart the dev server: it only reads the file at start.",
        "On a hosting service, add the setting in its dashboard too: it does not read your local .env.",
      ],
    },
    lines,
  );
};

const nodeVersion: Rule = ({ lines, facts }) => {
  const engine = findAll(lines, /The engine "node" is incompatible with this module\. Expected version "([^"]+)"[^\n]*?Got "([^"]+)"/);
  const required = findAll(lines, /Node\.?js (?:version )?(?:>=?\s?)?v?([\d.]+\+?|>=?\s?[\d.]+) is required|requires? Node(?:\.js)? (?:version )?([>=^~\d. |]+)/i);
  const ebadengine = findAll(lines, /EBADENGINE/);
  const esm = findAll(lines, /ERR_REQUIRE_ESM|require\(\) of ES Module/);
  const syntax = findAll(lines, /Unexpected token '(?:\?\??=?|\?\.)'/);
  const hits = [...engine, ...required, ...ebadengine, ...syntax];

  if (hits.length > 0) {
    const expected = engine[0]?.match[1];
    const got = engine[0]?.match[2];
    return make(
      "node-version",
      "high",
      hits,
      {
        title: "Your Node.js version doesn't match what the project needs",
        summary:
          expected && got
            ? `The project needs Node.js ${expected}, but this computer is running ${got}.`
            : "A tool in this project needs a different (usually newer) version of Node.js than the one installed.",
        why: "Node.js is installed separately from your project. A newer package or framework may need a newer Node.js than the one you installed some time ago.",
        checks: [
          "Run node --version in the project folder to see what you have.",
          facts?.nodeEngine ? `package.json asks for Node.js "${facts.nodeEngine}".` : "Look for an \"engines\" setting in package.json, or a .nvmrc file, for the version the project expects.",
          "Install the matching Node.js LTS version from nodejs.org, or use a version manager such as nvm-windows, then reopen your terminal.",
        ],
      },
      lines,
    );
  }
  if (esm.length > 0) {
    return make(
      "node-version",
      "medium",
      esm,
      {
        title: "A package can't be loaded the way your code loads it (ES module problem)",
        summary: "Your code uses require() to load a package that only supports import (an ES module).",
        why: "Packages are moving from require() to import. Mixing the two styles, or using an older Node.js, produces ERR_REQUIRE_ESM.",
        checks: [
          "Find the file named in the error and see whether it uses require(...) for that package.",
          "Check whether the package was recently upgraded: a major version upgrade often switches to import-only.",
          "Check node --version: newer Node.js versions can load some of these packages.",
        ],
      },
      lines,
    );
  }
  return null;
};

const TS_NOTES: Readonly<Record<string, string>> = {
  "2322": "a value of one type is being used where a different type is expected",
  "2339": "the code uses a property that the type doesn't have (often a typo, or data that isn't shaped as assumed)",
  "2345": "a function is called with an argument of the wrong type",
  "2304": "the code uses a name that isn't defined or imported (a typo or a missing import)",
  "2551": "a property name looks misspelled",
  "2552": "a name looks misspelled",
  "2554": "a function is called with the wrong number of arguments",
  "2741": "an object is missing a property its type requires",
  "2769": "no version of the function accepts the arguments given",
  "7006": "a function parameter has no type and TypeScript can't work it out",
  "7031": "a variable has no type and TypeScript can't work it out",
  "18046": "a value may be of an unknown type and is used without checking",
  "18047": "a value may be null and is used without checking",
  "18048": "a value may be undefined and is used without checking",
  "2531": "a value may be null and is used without checking",
  "2532": "a value may be undefined and is used without checking",
};

const typescriptErrors: Rule = ({ lines }) => {
  const hits: Hit[] = [];
  for (const line of lines) {
    const match = /\bTS(\d{3,5})\b/.exec(line) ?? /^\s*Type error: /.exec(line);
    const code = match?.[1];
    if (match && code !== "2307" && code !== "1149" && code !== "1261") hits.push({ line: line.trim(), match });
  }
  if (hits.length === 0) return null;
  const codes = unique(hits.map((h) => h.match[1]).filter((c): c is string => c !== undefined));
  const notes = codes.map((c) => TS_NOTES[c]).filter((n): n is string => n !== undefined);
  const first = hits[0];
  const label = codes.length > 0 ? ` (${codes.slice(0, 4).map((c) => `TS${c}`).join(", ")})` : "";
  return make(
    "typescript",
    "high",
    hits,
    {
      title: `TypeScript found ${hits.length === 1 ? "a type error" : `${hits.length} type errors`}${label}`,
      summary: notes.length > 0 ? `In plain terms: ${notes[0]}.` : "TypeScript checks that values are used consistently, and found a place where they aren't.",
      why: "Your project may run in development with these errors, but a production build (for example next build) stops at them. Code written by AI often has types that don't quite line up.",
      checks: [
        `Open the file and line in the first error${first ? `: ${first.line.slice(0, 160)}` : ""}.`,
        "Fix the first error first: later ones are often caused by it.",
        "Avoid silencing errors with any or @ts-ignore unless you understand why: it hides the problem rather than fixing it.",
      ],
    },
    lines,
  );
};

const dependencyConflict: Rule = ({ lines }) => {
  const hits = [
    ...findAll(lines, /npm (?:ERR!|error) code ERESOLVE/),
    ...findAll(lines, /unable to resolve dependency tree/i),
    ...findAll(lines, /Could not resolve dependency:/),
    ...findAll(lines, /npm (?:ERR!|error) code EINTEGRITY/),
    ...findAll(lines, /\bEINTEGRITY\b/),
  ];
  if (hits.length === 0) return null;
  const integrity = hits.some((h) => h.line.includes("EINTEGRITY"));
  return make(
    "dependency-conflict",
    "high",
    hits,
    integrity
      ? {
          title: "npm downloaded a package that doesn't match its checksum",
          summary: "A downloaded package failed npm's integrity check, so npm refused to install it.",
          why: "Usually a corrupted download or cache, a flaky network, or a lockfile that doesn't match what the registry now serves.",
          checks: [
            "Try the install again on a stable connection.",
            "Run npm cache verify to check npm's cache.",
            "If it keeps failing, a clean reinstall (deleting node_modules) may be needed. That is a bigger step: take a backup first.",
          ],
        }
      : {
          title: "Two packages need versions of a third that can't both be installed",
          summary: "npm could not find a set of package versions that satisfies every package's requirements.",
          why: "A package asks for a specific version of another (a peer dependency), and your project has a different one. This often follows adding or upgrading a package.",
          checks: [
            "Read the lines starting with \"Found:\" and \"Could not resolve dependency\": they name the packages in conflict.",
            "Check which package you added or upgraded last: that is usually the trigger.",
            "Be careful with --force and --legacy-peer-deps. They make the error go away without solving the conflict, and can break things later.",
          ],
        },
    lines,
  );
};

const commandNotFound: Rule = ({ lines, facts }) => {
  const hits = [
    ...findAll(lines, /'([\w.@/-]+)' is not recognized as an internal or external command/),
    ...findAll(lines, /(?:sh|bash|zsh):(?: \d+:)? ([\w.@/-]+): (?:command )?not found/),
    ...findAll(lines, /The term '([\w.@/-]+)' is not recognized as the name of a cmdlet/),
  ];
  const tool = hits[0]?.match[1];
  if (!tool) return null;
  const declared = facts?.dependencies[tool] !== undefined;
  return make(
    "command-not-found",
    "high",
    hits,
    {
      title: `The command "${tool}" isn't available in this project`,
      summary: `Your terminal was asked to run "${tool}", but it can't find it.`,
      why: "Project tools such as next, vite or tsc are installed inside node_modules. If the install never ran, or failed, or you are in the wrong folder, those commands don't exist yet.",
      checks: [
        "Check that your terminal is inside the project folder (the one containing package.json).",
        declared
          ? `package.json lists "${tool}", so the project's install is probably missing or incomplete: running npm install should fix that.`
          : `Check whether "${tool}" is a dependency in package.json. If it is, run npm install; if it isn't, the script may be using a tool that was never added.`,
        "Read the output of your last npm install for ERR lines: a failed install leaves this behind.",
      ],
    },
    lines,
  );
};

const wrongFolder: Rule = ({ lines }) => {
  const hits = [
    ...findAll(lines, /ENOENT[^\n]*package\.json/),
    ...findAll(lines, /Could not read package\.json/),
    ...findAll(lines, /no such file or directory[^\n]*package\.json/i),
  ];
  if (hits.length === 0) return null;
  return make(
    "wrong-folder",
    "high",
    hits,
    {
      title: "There's no package.json in the folder where the command ran",
      summary: "npm looked for a package.json in the current folder and didn't find one.",
      why: "The terminal is open in the wrong folder (often a parent or the home folder), or the project is nested one level deeper than expected.",
      checks: [
        "Look at the folder path shown in your terminal and compare it with where package.json really is.",
        "Change into the project folder (cd followed by the folder name) and run the command again.",
        "If the file is really missing, the project may be incomplete: check whether it was copied fully.",
      ],
    },
    lines,
  );
};

const lockedFiles: Rule = ({ lines }) => {
  // npm prints the error code, the syscall and the path on separate lines, so look across lines.
  const codes = findAll(lines, /\b(?:EPERM|EBUSY|ENOTEMPTY)\b/);
  const inProject = lines.some((l) => /node_modules|[\\/]\.next\b|[\\/]dist\b|syscall (?:rename|unlink|rmdir)/.test(l));
  if (codes.length === 0 || !inProject) return null;
  return make(
    "locked-files",
    "medium",
    codes,
    {
      title: "Windows couldn't change a file because something is using it",
      summary: "npm or your build tried to change or delete a file, and the operating system refused.",
      why: "A running dev server, an open editor window, antivirus scanning or a File Explorer window can hold files open, especially inside node_modules.",
      checks: [
        "Stop every running dev server and close other terminals for this project, then try again.",
        "Close File Explorer windows showing node_modules, and pause cloud-sync folders (OneDrive, Dropbox) if the project lives in one.",
        "If it keeps happening, move the project to a plain folder such as C:\\dev\\your-project.",
      ],
    },
    lines,
  );
};

/** Order matters only for display: the first rule that fits comes first. */
export const RULES: readonly Rule[] = [
  wrongFolder,
  commandNotFound,
  missingModule,
  wrongFileCase,
  portInUse,
  missingEnv,
  nodeVersion,
  dependencyConflict,
  lockedFiles,
  typescriptErrors,
];

export function runRules(context: RuleContext, max = 4): Explanation[] {
  const results: Explanation[] = [];
  for (const rule of RULES) {
    const explanation = rule(context);
    if (explanation) results.push(explanation);
    if (results.length >= max) break;
  }
  return results;
}
