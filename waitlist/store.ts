// Local JSON-file storage for waitlist signups.
// - Lives in a git-ignored directory (waitlist-data/), never in the repository tree that ships.
// - Writes are serialised and atomic (temp file, then rename), so concurrent requests cannot
//   corrupt the file or create duplicate emails.
// - The file is created with owner-only permissions where the OS supports it.
// This is a local store. Hosted storage needs a separate owner decision (see docs/planning/DECISIONS.md).

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WaitlistEntry } from "./validation.js";

export type NewEntry = Omit<WaitlistEntry, "id" | "createdAt" | "source">;

export interface SignupStore {
  add(entry: NewEntry, now: Date): Promise<{ created: boolean; entry: WaitlistEntry }>;
  list(): WaitlistEntry[];
}

interface StoreFile {
  version: 1;
  entries: WaitlistEntry[];
}

function isEntry(value: unknown): value is WaitlistEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.email === "string" &&
    typeof v.createdAt === "string" &&
    Array.isArray(v.capabilities)
  );
}

export async function openJsonFileStore(filePath: string): Promise<SignupStore> {
  const entries: WaitlistEntry[] = [];
  const byEmail = new Map<string, WaitlistEntry>();

  let raw: string | null = null;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  if (raw !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Never include file contents in the error: they contain personal data.
      throw new Error(`Waitlist data file is not valid JSON: ${filePath}. Move it aside and restart.`);
    }
    const file = parsed as Partial<StoreFile>;
    if (file.version !== 1 || !Array.isArray(file.entries) || !file.entries.every(isEntry)) {
      throw new Error(`Waitlist data file has an unexpected format: ${filePath}. Move it aside and restart.`);
    }
    for (const entry of file.entries) {
      entries.push(entry);
      byEmail.set(entry.email, entry);
    }
  }

  const directory = path.dirname(filePath);
  let queue: Promise<unknown> = Promise.resolve();

  function serialise<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  async function persist(nextEntries: WaitlistEntry[]): Promise<void> {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const body: StoreFile = { version: 1, entries: nextEntries };
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(body, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(tempPath, filePath);
  }

  return {
    add(input, now) {
      return serialise(async () => {
        const existing = byEmail.get(input.email);
        if (existing) return { created: false, entry: existing };

        const entry: WaitlistEntry = {
          ...input,
          id: randomUUID(),
          createdAt: now.toISOString(),
          source: "website",
        };
        await persist([...entries, entry]);
        entries.push(entry);
        byEmail.set(entry.email, entry);
        return { created: true, entry };
      });
    },
    list() {
      return [...entries];
    },
  };
}
