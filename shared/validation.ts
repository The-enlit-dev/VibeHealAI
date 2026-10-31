// Minimal runtime validation used at trust boundaries (backend API, desktop IPC).
// Deliberately small instead of a schema library (DEC-27: few dependencies).

export const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
export const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}(\.[a-z][a-z0-9-]{0,31}){1,3}$/;
export const RESOURCE_ID_PATTERN = /^[a-z]{2,8}_[A-Za-z0-9_-]{16,64}$/;

export class ValidationError extends Error {
  constructor(
    readonly path: string,
    readonly reason: string,
  ) {
    super(`${path || "value"}: ${reason}`);
    this.name = "ValidationError";
  }
}

export type Validator<T> = (value: unknown, path: string) => T;

export function validate<T>(validator: Validator<T>, value: unknown): T {
  return validator(value, "");
}

const join = (path: string, key: string): string => (path ? `${path}.${key}` : key);

export function string(options: { min?: number; max: number; pattern?: RegExp }): Validator<string> {
  return (value, path) => {
    if (typeof value !== "string") throw new ValidationError(path, "must be a string");
    if (value.length < (options.min ?? 0)) throw new ValidationError(path, "is too short");
    if (value.length > options.max) throw new ValidationError(path, "is too long");
    if (options.pattern && !options.pattern.test(value)) throw new ValidationError(path, "has an invalid format");
    return value;
  };
}

export function integer(options: { min: number; max: number }): Validator<number> {
  return (value, path) => {
    if (typeof value !== "number" || !Number.isInteger(value)) throw new ValidationError(path, "must be an integer");
    if (value < options.min || value > options.max) {
      throw new ValidationError(path, `must be between ${options.min} and ${options.max}`);
    }
    return value;
  };
}

export function oneOf<const T extends readonly string[]>(values: T): Validator<T[number]> {
  return (value, path) => {
    if (typeof value !== "string" || !values.includes(value)) {
      throw new ValidationError(path, `must be one of: ${values.join(", ")}`);
    }
    return value as T[number];
  };
}

export function optional<T>(validator: Validator<T>): Validator<T | undefined> & { optional: true } {
  const wrapped = ((value: unknown, path: string) => (value === undefined ? undefined : validator(value, path))) as Validator<
    T | undefined
  > & { optional: true };
  wrapped.optional = true;
  return wrapped;
}

type Shape = Record<string, Validator<unknown>>;
type RequiredKeys<S extends Shape> = { [K in keyof S]: S[K] extends { optional: true } ? never : K }[keyof S];
type OptionalKeys<S extends Shape> = Exclude<keyof S, RequiredKeys<S>>;
export type Infer<S extends Shape> = { [K in RequiredKeys<S>]: ReturnType<S[K]> } & {
  [K in OptionalKeys<S>]?: Exclude<ReturnType<S[K]>, undefined>;
};

/** Validates a plain object. Unknown keys are rejected (BK-4). */
export function object<S extends Shape>(shape: S): Validator<Infer<S>> {
  return (value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new ValidationError(path, "must be an object");
    }
    const input = value as Record<string, unknown>;
    for (const key of Object.keys(input)) {
      if (!Object.hasOwn(shape, key)) throw new ValidationError(join(path, key), "is not allowed");
    }
    const output: Record<string, unknown> = {};
    for (const [key, validator] of Object.entries(shape)) {
      const result = validator(input[key], join(path, key));
      if (result !== undefined) output[key] = result;
    }
    return output as Infer<S>;
  };
}

/** Accepts an empty object (or undefined) only. */
export const emptyObject: Validator<Record<string, never>> = (value, path) => {
  if (value === undefined) return {};
  object({})(value, path);
  return {};
};
