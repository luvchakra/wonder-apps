import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Encryption at rest for the careers key. AES-256-GCM with a key derived (HKDF) from
 * CAREERS_KEY_SECRET, or from DASHBOARD_SESSION_SECRET when that isn't set, so no new
 * variable is needed. Rotating the secret makes the stored key unreadable: an admin then
 * pastes it again (the env fallback keeps working meanwhile).
 */
function encKey(): Buffer | null {
  const secret = process.env.CAREERS_KEY_SECRET || process.env.DASHBOARD_SESSION_SECRET || "";
  if (secret.length < 32) return null;
  return Buffer.from(hkdfSync("sha256", secret, "wonderapps", "careers-key:v1", 32));
}

export const encryptionReady = () => encKey() !== null;

export function encrypt(plain: string): string {
  const k = encKey();
  if (!k) throw new Error("No encryption secret is configured.");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

/** Null when the value can't be decrypted (wrong or rotated secret, tampered data). */
export function decrypt(box: string): string | null {
  const k = encKey();
  const [v, iv, tag, ct] = box.split(".");
  if (!k || v !== "v1" || !iv || !tag || !ct) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
