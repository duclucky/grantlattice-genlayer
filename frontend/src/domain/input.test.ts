import { describe, expect, it } from "vitest";

import {
  assertAsciiClauseText,
  epochSeconds,
  parseAddress,
  parseCsvInput,
  parseGrantId,
} from "./input";


describe("frontend contract input preflight", () => {
  it("accepts contract-bounded IDs, addresses, CSV labels, and ASCII clauses", () => {
    expect(parseGrantId("root.support-1")).toBe("root.support-1");
    expect(parseAddress("0x1111111111111111111111111111111111111111")).toBe(
      "0x1111111111111111111111111111111111111111",
    );
    expect(parseCsvInput("SUMMARIZE, READ")).toEqual(["SUMMARIZE", "READ"]);
    expect(assertAsciiClauseText("Customer support only")).toBe("Customer support only");
  });

  it("rejects inputs that the contract cannot canonicalize", () => {
    expect(() => parseGrantId("-bad")).toThrow("Grant ID");
    expect(() => parseAddress("0x1234")).toThrow("address");
    expect(() => parseCsvInput("READ, READ")).toThrow("duplicates");
    expect(() => parseCsvInput("READ, bad label")).toThrow("invalid characters");
    expect(() => assertAsciiClauseText("Support only — no marketing")).toThrow("printable ASCII");
    expect(() => epochSeconds("2020-01-01T00:00")).toThrow("future");
  });
});
