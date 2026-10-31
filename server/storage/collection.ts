import path from "node:path";
import { Mutex, readJsonFile, writeJsonFileAtomic } from "./json-file.js";

/**
 * Minimal repository interface for persistent application data. The local
 * implementation is a JSON file; a hosted backend would implement it on a database.
 */
export interface Collection<T extends { readonly id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  put(record: T): Promise<void>;
  delete(id: string): Promise<boolean>;
  /** Atomically reads and removes a record. Used for single-use values (IN-4, IN-5). */
  take(id: string): Promise<T | undefined>;
  /** Atomically updates a record. The updater may return undefined to leave it unchanged. */
  update(id: string, updater: (current: T) => T | undefined): Promise<T | undefined>;
}

export class JsonFileCollection<T extends { readonly id: string }> implements Collection<T> {
  readonly #file: string;
  readonly #mutex = new Mutex();

  constructor(dataDir: string, name: string) {
    if (!/^[a-z][a-z0-9-]{1,40}$/.test(name)) throw new Error("Invalid collection name");
    this.#file = path.join(dataDir, `${name}.json`);
  }

  async list(): Promise<T[]> {
    return Object.values(await this.#read());
  }

  async get(id: string): Promise<T | undefined> {
    const records = await this.#read();
    return Object.hasOwn(records, id) ? records[id] : undefined;
  }

  put(record: T): Promise<void> {
    return this.#mutex.run(async () => {
      const records = await this.#read();
      records[record.id] = record;
      await writeJsonFileAtomic(this.#file, records);
    });
  }

  delete(id: string): Promise<boolean> {
    return this.#mutex.run(async () => {
      const records = await this.#read();
      if (!Object.hasOwn(records, id)) return false;
      delete records[id];
      await writeJsonFileAtomic(this.#file, records);
      return true;
    });
  }

  take(id: string): Promise<T | undefined> {
    return this.#mutex.run(async () => {
      const records = await this.#read();
      if (!Object.hasOwn(records, id)) return undefined;
      const record = records[id];
      delete records[id];
      await writeJsonFileAtomic(this.#file, records);
      return record;
    });
  }

  update(id: string, updater: (current: T) => T | undefined): Promise<T | undefined> {
    return this.#mutex.run(async () => {
      const records = await this.#read();
      const current = Object.hasOwn(records, id) ? records[id] : undefined;
      if (!current) return undefined;
      const next = updater(current);
      if (!next) return current;
      records[id] = next;
      await writeJsonFileAtomic(this.#file, records);
      return next;
    });
  }

  async #read(): Promise<Record<string, T>> {
    const data = await readJsonFile<Record<string, T>>(this.#file, {});
    return Object.assign(Object.create(null) as Record<string, T>, data);
  }
}

/** In-memory implementation for tests. */
export class MemoryCollection<T extends { readonly id: string }> implements Collection<T> {
  readonly #records = new Map<string, T>();

  async list(): Promise<T[]> {
    return [...this.#records.values()];
  }
  async get(id: string): Promise<T | undefined> {
    return this.#records.get(id);
  }
  async put(record: T): Promise<void> {
    this.#records.set(record.id, record);
  }
  async delete(id: string): Promise<boolean> {
    return this.#records.delete(id);
  }
  async take(id: string): Promise<T | undefined> {
    const record = this.#records.get(id);
    this.#records.delete(id);
    return record;
  }
  async update(id: string, updater: (current: T) => T | undefined): Promise<T | undefined> {
    const current = this.#records.get(id);
    if (!current) return undefined;
    const next = updater(current);
    if (next) this.#records.set(id, next);
    return next ?? current;
  }
}
