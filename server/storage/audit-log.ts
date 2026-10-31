import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import type { ActivityEntry, ActivityOutcome } from "../../shared/api.js";
import { newId } from "../security/ids.js";
import { redact, truncate } from "../security/redaction.js";
import { ensurePrivateDir, Mutex } from "./json-file.js";

export type AuditAction =
  | "connection.started"
  | "connection.completed"
  | "connection.failed"
  | "connection.disconnected"
  | "capability.allowed"
  | "capability.denied"
  | "capability.failed"
  | "approval.created"
  | "approval.approved"
  | "server.started";

export interface AuditInput {
  readonly action: AuditAction;
  readonly outcome: ActivityOutcome;
  readonly message: string;
  readonly providerId?: string;
  readonly connectionId?: string;
  readonly capabilityId?: string;
}

/** Append-only activity and audit log (AU-1 to AU-3). Entries are redacted and size-capped. */
export interface AuditLog {
  record(input: AuditInput): Promise<ActivityEntry>;
  /** Most recent first. */
  list(limit: number): Promise<ActivityEntry[]>;
}

function toEntry(input: AuditInput): ActivityEntry {
  return {
    id: newId("act"),
    at: new Date().toISOString(),
    action: input.action,
    outcome: input.outcome,
    message: truncate(redact(input.message), 500),
    ...(input.providerId ? { providerId: input.providerId } : {}),
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    ...(input.capabilityId ? { capabilityId: input.capabilityId } : {}),
  };
}

export class JsonLinesAuditLog implements AuditLog {
  readonly #file: string;
  readonly #mutex = new Mutex();

  constructor(dataDir: string) {
    this.#file = path.join(dataDir, "audit.jsonl");
  }

  record(input: AuditInput): Promise<ActivityEntry> {
    return this.#mutex.run(async () => {
      const entry = toEntry(input);
      await ensurePrivateDir(path.dirname(this.#file));
      await appendFile(this.#file, `${JSON.stringify(entry)}\n`, { encoding: "utf8", mode: 0o600 });
      return entry;
    });
  }

  async list(limit: number): Promise<ActivityEntry[]> {
    let text: string;
    try {
      text = await readFile(this.#file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const entries: ActivityEntry[] = [];
    const lines = text.split("\n").filter(Boolean);
    for (let index = lines.length - 1; index >= 0 && entries.length < limit; index -= 1) {
      try {
        entries.push(JSON.parse(lines[index] as string) as ActivityEntry);
      } catch {
        // Skip a damaged line rather than failing the whole log view.
      }
    }
    return entries;
  }
}

export class MemoryAuditLog implements AuditLog {
  readonly entries: ActivityEntry[] = [];

  async record(input: AuditInput): Promise<ActivityEntry> {
    const entry = toEntry(input);
    this.entries.push(entry);
    return entry;
  }

  async list(limit: number): Promise<ActivityEntry[]> {
    return this.entries.slice(-limit).reverse();
  }
}
