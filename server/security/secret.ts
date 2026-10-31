import { inspect } from "node:util";

const REDACTED = "[REDACTED]";

/**
 * Wraps a secret value so it cannot leak through logging, string conversion,
 * JSON serialisation or util.inspect (CR-4). Call reveal() only at the point of use.
 */
export class Secret {
  readonly #value: string;

  constructor(value: string) {
    if (typeof value !== "string" || value.length === 0) throw new TypeError("Secret value must be a non-empty string");
    this.#value = value;
  }

  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return REDACTED;
  }

  toJSON(): string {
    return REDACTED;
  }

  [inspect.custom](): string {
    return `Secret(${REDACTED})`;
  }
}
