import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dashboardConfig, SESSION_TTL_S } from "./config";

/**
 * Stateless signed tokens (no database anywhere): `v1.<payload>.<signature>`,
 * where the signature is HMAC-SHA256 under a key derived per purpose, so a sign-in
 * link can never be replayed as a session or the other way round.
 */
type Purpose = "session" | "login";

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

const keyFor = (secret: string, purpose: Purpose) => createHmac("sha256", secret).update(`wonderapps-dashboard:${purpose}`).digest();

export function signToken(purpose: Purpose, claims: Record<string, string | number>, ttlSeconds: number): string | null {
  const secret = dashboardConfig.secret();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload = b64u(JSON.stringify({ ...claims, typ: purpose, iat: now, exp: now + ttlSeconds }));
  const sig = createHmac("sha256", keyFor(secret, purpose)).update(`v1.${payload}`).digest();
  return `v1.${payload}.${b64u(sig)}`;
}

export type Claims = Record<string, string | number> & { typ: Purpose; iat: number; exp: number };

export function verifyToken(purpose: Purpose, token: string | undefined | null): Claims | null {
  const secret = dashboardConfig.secret();
  if (!secret || !token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const expected = createHmac("sha256", keyFor(secret, purpose)).update(`v1.${parts[1]}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(parts[2], "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Claims;
    if (claims.typ !== purpose || typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export const newNonce = () => randomBytes(24).toString("base64url");
export const hashNonce = (nonce: string) => createHash("sha256").update(nonce).digest("hex");

export function makeSessionToken(email: string): string | null {
  return signToken("session", { sub: email.toLowerCase(), sv: dashboardConfig.sessionVersion() }, SESSION_TTL_S);
}

/** Valid signature + not expired + same session version + address still on the allow-list. */
export function sessionFromToken(token: string | undefined | null): { email: string } | null {
  const c = verifyToken("session", token);
  if (!c || typeof c.sub !== "string" || c.sv !== dashboardConfig.sessionVersion()) return null;
  if (!dashboardConfig.isAllowed(c.sub)) return null;
  return { email: c.sub };
}
