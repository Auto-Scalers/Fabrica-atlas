/**
 * Vault Cryptographic Module (Server-Only)
 *
 * AES-256-GCM encryption with scrypt key derivation.
 * Uses only Node.js built-in `crypto` — no external dependencies.
 *
 * DO NOT import from client components — `crypto` is server-only.
 */

import {
  scryptSync,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  timingSafeEqual,
} from "crypto";

import type { FieldOpsCredential } from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────────────

/** AES-256 requires a 32-byte (256-bit) key */
const SCRYPT_KEY_LEN = 32;

/** 256-bit random salt for scrypt */
const SCRYPT_SALT_LEN = 32;

/** scrypt cost parameter — ~100ms on modern hardware, memory-hard */
const SCRYPT_COST = 16384; // N

/** scrypt block size parameter */
const SCRYPT_BLOCK_SIZE = 8; // r

/** scrypt parallelization parameter */
const SCRYPT_PARALLELIZATION = 1; // p

/** GCM standard IV length: 96 bits (12 bytes) */
const IV_LEN = 12;

/** Prefix for scrypt-based master key hashes */
const MASTER_HASH_PREFIX = "scrypt:";

// ─── Key Derivation ────────────────────────────────────────────────────────

/**
 * Derive a 256-bit encryption key from a password and salt using scrypt.
 *
 * scrypt is memory-hard, making brute-force attacks expensive on GPUs/ASICs.
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, SCRYPT_KEY_LEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
}

// ─── Master Password Hashing ──────────────────────────────────────────────

/**
 * Hash a master password with scrypt + random salt.
 *
 * Returns a self-describing string: "scrypt:<salt_hex>:<hash_hex>"
 */
export function hashMasterPassword(password: string): string {
  const salt = randomBytes(SCRYPT_SALT_LEN);
  const hash = deriveKey(password, salt);
  return `${MASTER_HASH_PREFIX}${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a master password against a stored hash.
 *
 * Supports both:
 * - New format: "scrypt:<salt_hex>:<hash_hex>" (scrypt with salt)
 * - Legacy format: raw SHA-256 hex string (migration support)
 *
 * Uses timing-safe comparison to prevent side-channel attacks.
 */
export function verifyMasterPassword(
  password: string,
  storedHash: string,
): boolean {
  if (isLegacyHash(storedHash)) {
    // Legacy SHA-256 comparison (for migration)
    const legacyHash = createHash("sha256").update(password).digest("hex");
    // Still use timing-safe comparison even for legacy
    const a = Buffer.from(legacyHash, "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  // Parse "scrypt:<salt_hex>:<hash_hex>"
  const parts = storedHash.slice(MASTER_HASH_PREFIX.length).split(":");
  if (parts.length !== 2) return false;

  const [saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expectedHash = Buffer.from(hashHex, "hex");

  const derivedHash = deriveKey(password, salt);

  if (derivedHash.length !== expectedHash.length) return false;
  return timingSafeEqual(derivedHash, expectedHash);
}

// ─── Encryption / Decryption ───────────────────────────────────────────────

/**
 * Encrypt credential data with AES-256-GCM.
 *
 * @param plaintext  - The secret (API key, token, etc.)
 * @param password   - Master password (used to derive encryption key)
 * @param salt       - Encryption salt (stored as `masterKeySalt` in credentials file)
 * @returns Hex-encoded ciphertext, IV, and authentication tag
 */
export function encryptCredential(
  plaintext: string,
  password: string,
  salt: Buffer,
): { encryptedData: string; iv: string; authTag: string } {
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LEN);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt credential data with AES-256-GCM.
 *
 * @throws Error if auth tag verification fails (tampered data or wrong password)
 */
export function decryptCredential(
  encryptedData: string,
  iv: string,
  authTag: string,
  password: string,
  salt: Buffer,
): string {
  const key = deriveKey(password, salt);

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, "hex")),
    decipher.final(), // Throws if auth tag verification fails
  ]);

  return decrypted.toString("utf-8");
}

// ─── Legacy Detection ──────────────────────────────────────────────────────

/**
 * Check if a stored master key hash is in the legacy SHA-256 format
 * (i.e., does NOT start with "scrypt:").
 */
export function isLegacyHash(storedHash: string): boolean {
  return !storedHash.startsWith(MASTER_HASH_PREFIX);
}

/**
 * Check if a credential was stored with the old base64 placeholder.
 * Legacy credentials have no `authTag` (undefined, null, or empty string).
 */
export function isLegacyCredential(credential: FieldOpsCredential): boolean {
  return !credential.authTag;
}

/**
 * Generate a new random encryption salt (32 bytes, hex-encoded).
 * Called once when the vault is first initialized.
 */
export function generateEncryptionSalt(): string {
  return randomBytes(SCRYPT_SALT_LEN).toString("hex");
}

/**
 * Migrate a legacy base64-encoded credential to AES-256-GCM encryption.
 *
 * Decodes the base64 plaintext, then re-encrypts with real crypto.
 */
export function migrateLegacyCredential(
  credential: FieldOpsCredential,
  password: string,
  salt: Buffer,
): { encryptedData: string; iv: string; authTag: string } {
  // Legacy credentials used base64 encoding, not encryption
  const plaintext = Buffer.from(credential.encryptedData, "base64").toString(
    "utf-8",
  );
  return encryptCredential(plaintext, password, salt);
}
