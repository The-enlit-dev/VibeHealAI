import { randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

/** Creates the data directory with owner-only permissions where the OS supports them. */
export async function ensurePrivateDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
}

export async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw new Error(`Could not read data file ${path.basename(file)}`, { cause: error });
  }
}

/** Atomic write: temporary file, fsync, then rename over the target. Mode 0600. */
export async function writeJsonFileAtomic(file: string, data: unknown): Promise<void> {
  await ensurePrivateDir(path.dirname(file));
  const temp = `${file}.${randomBytes(6).toString("hex")}.tmp`;
  const handle = await open(temp, "w", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

/** Serialises async operations so read-modify-write cycles on one file never interleave. */
export class Mutex {
  #tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.#tail.then(task, task);
    this.#tail = result.catch(() => undefined);
    return result;
  }
}
