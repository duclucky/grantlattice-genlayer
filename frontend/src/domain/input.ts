import type { Address } from "./types";


export function parseGrantId(value: FormDataEntryValue | null): string {
  const parsed = String(value ?? "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/u.test(parsed)) {
    throw new Error("Grant ID must be 3-80 characters and start with a letter or number.");
  }
  return parsed;
}

export function parseAddress(value: FormDataEntryValue | null): Address {
  const parsed = String(value ?? "");
  if (!/^0x[a-fA-F0-9]{40}$/u.test(parsed)) {
    throw new Error("Enter a valid 20-byte EVM address.");
  }
  return parsed as Address;
}

export function parseCsvInput(value: FormDataEntryValue | null): string[] {
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length < 1 || items.length > 16) {
    throw new Error("Enter between 1 and 16 scope items.");
  }
  if (new Set(items).size !== items.length) {
    throw new Error("Scope items contain duplicates.");
  }
  if (items.some((item) => !/^[A-Za-z0-9._:/-]{1,64}$/u.test(item))) {
    throw new Error("Scope items contain invalid characters.");
  }
  return items;
}

export function assertAsciiClauseText(value: FormDataEntryValue | null): string {
  const parsed = String(value ?? "");
  if (parsed.length < 1 || parsed.length > 600 || !/^[\x20-\x7e]+$/u.test(parsed)) {
    throw new Error("Clause text must be 1-600 printable ASCII characters.");
  }
  return parsed;
}

export function epochSeconds(value: FormDataEntryValue | null): number {
  const milliseconds = new Date(String(value ?? "")).getTime();
  if (!Number.isFinite(milliseconds)) throw new Error("Enter a valid expiry time.");
  const seconds = Math.floor(milliseconds / 1_000);
  if (seconds <= Math.floor(Date.now() / 1_000)) {
    throw new Error("Expiry must be in the future; equality is already late.");
  }
  return seconds;
}

export function createNonce(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The transaction could not be completed.";
}
