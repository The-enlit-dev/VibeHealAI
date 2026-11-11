import { describe, expect, it } from "vitest";
import { analyze, parsePackageJson, redactText, LIMITS } from "./index.js";
import type { AnalyzeResult } from "./index.js";

// Secrets are assembled at runtime so no secret-shaped literal sits in source or Git history.
const fake = {
  github: "ghp_" + "a1B2c3D4".repeat(5),
  openai: "sk-" + "Zy9Xw8Vu".repeat(4),
  stripeLive: "sk_live_" + "Qw3Er4Ty".repeat(3),
  jwt: ["eyJ" + "hbGciOiJI", "eyJ" + "zdWIiOiIx", "abcDEF123" + "ghiJKL456"].join("."),
  privateKey: ["-----BEGIN RSA PRIVATE KEY-----", "MIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8Qu", "-----END RSA PRIVATE KEY-----"].join("\n"),
  dbPassword: "hunter2" + "Xyz",
};

function run(errorText: string, extra: { command?: string; packageJson?: string } = {}): AnalyzeResult {
  const outcome = analyze({ errorText, ...extra });
  if (!outcome.ok) throw new Error(`unexpected validation failure: ${outcome.message}`);
  return outcome.result;
}

const ids = (result: AnalyzeResult): string[] => result.explanations.map((e) => e.ruleId);

describe("error rules", () => {
  it("explains a missing package and uses package.json to say whether it is declared", () => {
    const error = "node:internal/modules/cjs/loader:1228\n  throw err;\nError: Cannot find module 'express'\nRequire stack:\n- /home/alice/app/server.js";
    const bare = run(error);
    expect(ids(bare)[0]).toBe("missing-module");
    expect(bare.explanations[0]?.title).toContain('"express"');

    const declared = run(error, { packageJson: JSON.stringify({ dependencies: { express: "^4.19.0" } }) });
    expect(declared.explanations[0]?.checks.join(" ")).toContain("declared but missing from node_modules");

    const undeclared = run(error, { packageJson: JSON.stringify({ dependencies: { react: "^18.0.0" } }) });
    expect(undeclared.explanations[0]?.checks.join(" ")).toContain("never added");
  });

  it("treats relative and alias imports as path problems, not missing packages", () => {
    const next = run("Module not found: Can't resolve '@/components/Header'\n  1 | import Header from '@/components/Header'");
    expect(next.explanations[0]?.title).toContain("A file can't be found");
    expect(next.explanations[0]?.checks.join(" ")).toContain("tsconfig.json");

    const vite = run('Failed to resolve import "./Sidebar" from "src/App.tsx". Does the file exist?');
    expect(vite.explanations[0]?.title).toContain("A file can't be found");
    expect(vite.explanations[0]?.likelyFiles).toContain("src/App.tsx");
  });

  it("uses the scoped package name for scoped imports and ignores Node built-ins", () => {
    const scoped = run("Error: Cannot find module '@tanstack/react-query/build/lib/index.js'");
    expect(scoped.explanations[0]?.title).toContain('"@tanstack/react-query"');
    expect(ids(run("Error: Cannot find module 'fs'"))).toHaveLength(0);
  });

  it("explains a port that is in use and extracts the port", () => {
    const result = run("Error: listen EADDRINUSE: address already in use :::3000\n    at Server.setupListenHandle");
    expect(ids(result)[0]).toBe("port-in-use");
    expect(result.explanations[0]?.title).toContain("3000");
    expect(result.explanations[0]?.checks.join(" ")).toContain("findstr :3000");
  });

  it("explains missing environment variables by name only", () => {
    const named = run("Error: Missing environment variable: STRIPE_SECRET_KEY");
    expect(ids(named)[0]).toBe("missing-env");
    expect(named.explanations[0]?.title).toContain("STRIPE_SECRET_KEY");

    const supabase = run("Error: supabaseUrl is required.\n    at new SupabaseClient");
    expect(ids(supabase)[0]).toBe("missing-env");

    const explicit = run("DATABASE_URL is not set");
    expect(explicit.explanations[0]?.title).toContain("DATABASE_URL");
  });

  it("does not mistake Node error codes for environment variable names", () => {
    expect(ids(run("Error: ERR_MODULE_NOT_FOUND required but not found"))).not.toContain("missing-env");
  });

  it("explains Node version mismatches, with the engines setting when known", () => {
    const next = run("You are using Node.js 16.20.2. For Next.js, Node.js version >= 18.17.0 is required.", {
      packageJson: JSON.stringify({ engines: { node: ">=18.17" } }),
    });
    expect(ids(next)[0]).toBe("node-version");
    expect(next.explanations[0]?.checks.join(" ")).toContain(">=18.17");

    const yarn = run('error some-package@2.0.0: The engine "node" is incompatible with this module. Expected version ">=18". Got "16.20.0"');
    expect(yarn.explanations[0]?.summary).toContain(">=18");
    expect(yarn.explanations[0]?.summary).toContain("16.20.0");

    const esm = run("Error [ERR_REQUIRE_ESM]: require() of ES Module /app/node_modules/chalk/source/index.js not supported.");
    expect(esm.explanations[0]?.ruleId).toBe("node-version");
    expect(esm.explanations[0]?.confidence).toBe("medium");
  });

  it("explains TypeScript errors, with and without an error code, and counts them", () => {
    const tsc = run("src/app/page.tsx:12:5 - error TS2322: Type 'string' is not assignable to type 'number'.\nsrc/app/page.tsx:20:3 - error TS2339: Property 'x' does not exist on type 'Foo'.");
    expect(ids(tsc)[0]).toBe("typescript");
    expect(tsc.explanations[0]?.title).toContain("2 type errors");
    expect(tsc.explanations[0]?.likelyFiles).toContain("src/app/page.tsx");

    const next = run("Failed to compile.\n\n./src/app/page.tsx:12:5\nType error: Property 'name' does not exist on type 'User'.");
    expect(ids(next)[0]).toBe("typescript");
  });

  it("sends TS2307 to the missing-module rule rather than the generic TypeScript rule", () => {
    const result = run("src/a.ts(1,20): error TS2307: Cannot find module 'zod' or its corresponding type declarations.");
    expect(ids(result)).toEqual(["missing-module"]);
  });

  it("explains letter-case problems", () => {
    const result = run("error TS1149: File name 'C:/app/src/components/header.tsx' differs from already included file name 'C:/app/src/components/Header.tsx' only in casing.");
    expect(ids(result)).toEqual(["wrong-file-case"]);
  });

  it("explains npm dependency conflicts without recommending --force", () => {
    const result = run("npm error code ERESOLVE\nnpm error ERESOLVE unable to resolve dependency tree\nnpm error Found: react@19.0.0\nnpm error Could not resolve dependency:\nnpm error peer react@\"^18.0.0\" from some-ui@2.1.0");
    expect(ids(result)[0]).toBe("dependency-conflict");
    const advice = result.explanations[0]?.checks.join(" ") ?? "";
    expect(advice).toContain("Be careful with --force");
  });

  it("explains a command that is not recognised, using package.json when available", () => {
    const error = "'next' is not recognized as an internal or external command,\noperable program or batch file.";
    const result = run(error, { packageJson: JSON.stringify({ dependencies: { next: "14.2.3" } }) });
    expect(ids(result)[0]).toBe("command-not-found");
    expect(result.explanations[0]?.checks.join(" ")).toContain('lists "next"');
    expect(ids(run("sh: 1: vite: not found"))[0]).toBe("command-not-found");
  });

  it("explains running npm in the wrong folder", () => {
    const result = run("npm error code ENOENT\nnpm error syscall open\nnpm error path C:\\Users\\sam\\package.json\nnpm error enoent Could not read package.json");
    expect(ids(result)[0]).toBe("wrong-folder");
  });

  it("explains locked files on Windows", () => {
    const result = run("npm error code EPERM\nnpm error syscall rename\nnpm error path C:\\dev\\app\\node_modules\\esbuild\\esbuild.exe");
    expect(ids(result)).toContain("locked-files");
  });

  it("says plainly when nothing matches instead of guessing", () => {
    const result = run("The build produced an unexpected result, and nobody knows why.");
    expect(result.explanations).toHaveLength(0);
    expect(result.brief).toContain("did not recognise this error");
  });
});

describe("redaction", () => {
  it("removes planted secrets from the error, the evidence and the brief", () => {
    const error = [
      `Error: request failed with Authorization: Bearer ${fake.jwt}`,
      `GITHUB_TOKEN=${fake.github}`,
      `OPENAI_API_KEY=${fake.openai}`,
      `STRIPE_SECRET_KEY=${fake.stripeLive}`,
      `DATABASE_URL=postgres://admin:${fake.dbPassword}@db.example.com:5432/app`,
      fake.privateKey,
      "Error: Cannot find module 'express'",
    ].join("\n");
    const result = run(error, { command: `npm run build --token=${fake.github}` });
    const everything = JSON.stringify(result) + result.brief;
    for (const secret of [fake.github, fake.openai, fake.stripeLive, fake.jwt, fake.dbPassword, "MIIBOgIBAAJBAKj34"]) {
      expect(everything).not.toContain(secret);
    }
    expect(result.redaction.count).toBeGreaterThan(4);
    expect(result.redaction.kinds).toContain("private key");
    expect(ids(result)[0]).toBe("missing-module");
  });

  it("keeps variable names and does not redact a value that is only 'undefined'", () => {
    const { text } = redactText("STRIPE_SECRET_KEY: undefined\nNEXT_PUBLIC_SITE_URL=https://example.com");
    expect(text).toContain("STRIPE_SECRET_KEY: undefined");
    expect(text).toContain("NEXT_PUBLIC_SITE_URL=https://example.com");
  });

  it("hides the personal folder name in paths", () => {
    const { text, kinds } = redactText("at C:\\Users\\Priya\\dev\\app\\src\\a.ts and /home/alice/app/b.ts and /Users/bob/c.ts");
    expect(text).not.toMatch(/Priya|alice|bob/);
    expect(text).toContain("C:\\Users\\<user>\\dev");
    expect(kinds).toContain("personal path");
  });
});

describe("input handling", () => {
  it("rejects empty and oversized errors with a message for the right field", () => {
    expect(analyze({ errorText: "   " })).toMatchObject({ ok: false, field: "errorText" });
    expect(analyze({ errorText: "x".repeat(LIMITS.maxErrorChars + 1) })).toMatchObject({ ok: false, field: "errorText" });
  });

  it("rejects a multi-line command and invalid package.json without echoing their contents", () => {
    expect(analyze({ errorText: "boom boom", command: "npm run build\nrm -rf /" })).toMatchObject({ ok: false, field: "command" });
    const bad = analyze({ errorText: "boom boom", packageJson: `{ "secret": "${fake.openai}" ` });
    expect(bad).toMatchObject({ ok: false, field: "packageJson" });
    expect(JSON.stringify(bad)).not.toContain(fake.openai);
    expect(analyze({ errorText: "boom boom", packageJson: "[1,2]" })).toMatchObject({ ok: false, field: "packageJson" });
  });

  it("keeps the start and end of very long output and says so", () => {
    const filler = "log line that is not an error\n".repeat(5000);
    const result = run(`${filler}Error: listen EADDRINUSE: address already in use :::8080`);
    expect(result.shortened).toBe(true);
    expect(ids(result)[0]).toBe("port-in-use");
  });

  it("handles hostile input quickly: one huge line, many blank lines, odd characters", () => {
    const inputs = ["a".repeat(150_000), "\n".repeat(100_000), "_KEY=".repeat(20_000), "\u0000\u202e\ud800 ".repeat(5000), "(".repeat(50_000)];
    const started = Date.now();
    for (const input of inputs) {
      const outcome = analyze({ errorText: input });
      expect(typeof outcome.ok).toBe("boolean");
    }
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("keeps only names and ranges from package.json, never script bodies", () => {
    const parsed = parsePackageJson(`\uFEFF${JSON.stringify({ name: "demo", scripts: { build: `node build.js --key=${fake.openai}` }, dependencies: { react: "^18" }, engines: { node: ">=20" } })}`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.facts.scriptNames).toEqual(["build"]);
      expect(parsed.facts.nodeEngine).toBe(">=20");
      expect(JSON.stringify(parsed.facts)).not.toContain(fake.openai);
    }
  });

  it("does not let a __proto__ key in package.json pollute anything", () => {
    const parsed = parsePackageJson('{"dependencies":{"__proto__":"1.0.0","react":"18"}}');
    expect(parsed.ok).toBe(true);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });
});
