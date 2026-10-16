import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { sampleId, sha256Fallback, sha256Bytes } from "../src/lib/local-crypto";
const bytes = (text: string) =>
  new TextEncoder().encode(text).buffer as ArrayBuffer;
test("pure SHA256 fallback matches canonical vectors and multi-block file bytes", async () => {
  for (const value of [
    "",
    "abc",
    "The quick brown fox jumps over the lazy dog",
    "a".repeat(1000000),
  ]) {
    const expected = createHash("sha256").update(value).digest("hex");
    assert.equal(sha256Fallback(bytes(value)), expected);
    assert.equal(await sha256Bytes(bytes(value)), expected);
  }
  const binary = Uint8Array.from({ length: 65537 }, (_, i) => i % 251);
  assert.equal(
    sha256Fallback(binary.buffer),
    createHash("sha256").update(binary).digest("hex"),
  );
});
test("HTTP preview fallback IDs and file hashes work without randomUUID or SubtleCrypto", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  let serial = 0;
  try {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues: (out: Uint8Array) => {
          out.fill(++serial);
          return out;
        },
      },
    });
    const first = sampleId("file"),
      second = sampleId("file");
    assert.match(first, /^file_[0-9a-f]{32}$/);
    assert.notEqual(first, second);
    assert.equal(
      await sha256Bytes(bytes("abc")),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
    });
    const ids = new Set(Array.from({ length: 1000 }, () => sampleId("sample")));
    assert.equal(ids.size, 1000);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else Reflect.deleteProperty(globalThis, "crypto");
  }
});
