import { describe, expect, it } from "vitest";
import { CAPABILITY_ID_PATTERN, PROVIDER_ID_PATTERN, RESOURCE_ID_PATTERN, ValidationError, integer, object, oneOf, optional, string, validate } from "./validation.js";

describe("validation helpers (BK-4)", () => {
  const schema = object({ name: string({ min: 1, max: 5 }), count: optional(integer({ min: 1, max: 3 })), mode: optional(oneOf(["a", "b"] as const)) });

  it("accepts valid input and omits absent optional fields", () => {
    expect(validate(schema, { name: "abc" })).toEqual({ name: "abc" });
    expect(validate(schema, { name: "abc", count: 2, mode: "b" })).toEqual({ name: "abc", count: 2, mode: "b" });
  });

  it("rejects unknown keys, wrong types and out-of-range values with a path", () => {
    expect(() => validate(schema, { name: "abc", extra: 1 })).toThrow(/extra: is not allowed/);
    expect(() => validate(schema, { name: 3 })).toThrow(ValidationError);
    expect(() => validate(schema, { name: "toolong" })).toThrow(/too long/);
    expect(() => validate(schema, { name: "a", count: 1.5 })).toThrow(/integer/);
    expect(() => validate(schema, { name: "a", mode: "c" })).toThrow(/one of/);
    expect(() => validate(schema, null)).toThrow(/object/);
    expect(() => validate(schema, [])).toThrow(/object/);
  });

  it("does not let __proto__ keys through", () => {
    expect(() => validate(schema, JSON.parse('{"name":"a","__proto__":{"x":1}}'))).toThrow(/not allowed/);
  });

  it("has strict id patterns", () => {
    expect(PROVIDER_ID_PATTERN.test("github")).toBe(true);
    expect(PROVIDER_ID_PATTERN.test("../x")).toBe(false);
    expect(CAPABILITY_ID_PATTERN.test("github.repositories.list")).toBe(true);
    expect(CAPABILITY_ID_PATTERN.test("github")).toBe(false);
    expect(RESOURCE_ID_PATTERN.test("conn_abcdefghijklmnop1234")).toBe(true);
    expect(RESOURCE_ID_PATTERN.test("conn_../../x")).toBe(false);
  });
});
