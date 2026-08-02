import { describe, it, expect, beforeAll } from "vitest";
import { encryptPii, decryptPii } from "../backend/crypto";

describe("PII Encryption", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-for-unit-tests-only-32chars";
  });

  it("encrypts and decrypts aadhaar numbers", () => {
    const plaintext = "1234-5678-9012";
    const encrypted = encryptPii(plaintext);
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(plaintext);

    const decrypted = decryptPii(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("encrypts and decrypts licence numbers", () => {
    const plaintext = "WB-02-2024-123456";
    const encrypted = encryptPii(plaintext);
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(plaintext);

    const decrypted = decryptPii(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("returns null for null input", () => {
    expect(encryptPii(null)).toBeNull();
    expect(decryptPii(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(encryptPii(undefined)).toBeNull();
    expect(decryptPii(undefined)).toBeNull();
  });

  it("returns null for tampered ciphertext", () => {
    const result = decryptPii("invalid:format:data");
    expect(result).toBeNull();
  });

  it("produces different ciphertexts for same plaintext (IV randomization)", () => {
    const plaintext = "1234-5678-9012";
    const enc1 = encryptPii(plaintext);
    const enc2 = encryptPii(plaintext);
    expect(enc1).not.toBe(enc2);
  });
});
