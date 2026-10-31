import { redact, redactValue } from "./redaction.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

const ORDER: Readonly<Record<LogLevel, number>> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Structured JSON logger. Every message is redacted and sensitive field names are
 * dropped before anything is written (BK-9). Never pass raw provider responses.
 */
export function createLogger(options: { level: LogLevel; write?: (line: string) => void }): Logger {
  const write = options.write ?? ((line: string) => process.stderr.write(`${line}\n`));
  const emit = (level: LogLevel, message: string, fields?: Record<string, unknown>): void => {
    if (ORDER[level] < ORDER[options.level]) return;
    const entry = {
      at: new Date().toISOString(),
      level,
      message: redact(message),
      ...(fields ? { fields: redactValue(fields) } : {}),
    };
    write(JSON.stringify(entry));
  };
  return {
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
  };
}

export const silentLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} };
