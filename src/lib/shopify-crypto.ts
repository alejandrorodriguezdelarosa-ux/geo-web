import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const raw = process.env.SHOPIFY_TOKEN_KEY;
  if (!raw) {
    throw new Error(
      "SHOPIFY_TOKEN_KEY is not set. Generate one with: openssl rand -hex 32"
    );
  }
  let key: Buffer;
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(
      `SHOPIFY_TOKEN_KEY must be 32 bytes (got ${key.length}). ` +
        "Generate a valid key with: openssl rand -hex 32"
    );
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(enc: string): string {
  const key = getKey();
  const parts = enc.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format (expected iv:authTag:ciphertext)");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  if (iv.length !== IV_BYTES) {
    throw new Error(`Invalid IV length: expected ${IV_BYTES}, got ${iv.length}`);
  }
  if (authTag.length !== TAG_BYTES) {
    throw new Error(`Invalid auth tag length: expected ${TAG_BYTES}, got ${authTag.length}`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    throw new Error(
      "Decryption failed: authentication tag mismatch. " +
        "The data may have been tampered with or the key is wrong."
    );
  }
}
