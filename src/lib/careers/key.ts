import "server-only";
import { restRpc } from "@/lib/content/supabase";
import { decrypt, encrypt, encryptionReady } from "./crypto";

/**
 * The WonderJobs career-site key. Stored encrypted in WonderApps' database (migration 0006),
 * set from /dashboard/careers by a signed-in admin; WONDERJOBS_CAREERS_KEY is only a fallback
 * when the database has none. The plain key never leaves the server: callers outside this
 * module and the WonderJobs client only ever see the mask.
 */

export const KEY_PATTERN = /^wjcs_[A-Za-z0-9_-]{16,200}$/;

export const maskKey = (key: string) => `wjcs_••••••••${key.slice(-4)}`;
const maskLast4 = (last4: string) => `wjcs_••••••••${last4}`;

const writeKey = () => process.env.PROGRESS_WRITE_KEY || "";

type Stored = { key_ciphertext: string | null; key_last4: string | null; updated_at: string; updated_by: string };

export type KeySource = "database" | "environment";
export type ResolvedKey = { key: string; source: KeySource } | { key: null; reason: string };

let memo: { at: number; value: ResolvedKey } | null = null;
const MEMO_MS = 30_000;

async function readStored(): Promise<Stored | null> {
  if (!writeKey()) return null;
  const rows = await restRpc<Stored[]>("careers_key_get", { write_key: writeKey() });
  return rows[0] ?? null;
}

/** The key to call WonderJobs with. The reason is for admins only, never for visitors. */
export async function resolveKey(): Promise<ResolvedKey> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value;
  let value: ResolvedKey;
  let dbProblem = "";
  try {
    const s = await readStored();
    const plain = s?.key_ciphertext ? decrypt(s.key_ciphertext) : null;
    if (plain && KEY_PATTERN.test(plain)) value = { key: plain, source: "database" };
    else {
      if (s?.key_ciphertext) dbProblem = "The saved key can't be decrypted (the encryption secret changed). Paste it again.";
      value = { key: null, reason: "" };
    }
  } catch {
    dbProblem = "The saved key couldn't be read from the database.";
    value = { key: null, reason: "" };
  }
  if (!value.key) {
    const env = (process.env.WONDERJOBS_CAREERS_KEY ?? "").trim();
    value = KEY_PATTERN.test(env)
      ? { key: env, source: "environment" }
      : { key: null, reason: dbProblem || "No WonderJobs career-site key is saved. Paste one in the dashboard under Careers." };
  }
  memo = { at: Date.now(), value };
  return value;
}

export type AuditEntry = { action: "save" | "clear"; actor: string; last4: string | null; at: string };
export type KeyStatus = {
  mask: string | null;
  source: KeySource | null;
  updatedAt: string | null;
  updatedBy: string | null;
  canSave: boolean;
  problem: string | null;
  audit: AuditEntry[];
};

/** What the admin page shows: the mask, never the key. */
export async function keyStatus(): Promise<KeyStatus> {
  const resolved = await resolveKey();
  let stored: Stored | null = null;
  let audit: AuditEntry[] = [];
  try {
    stored = await readStored();
    if (writeKey())
      audit = (await restRpc<{ action: "save" | "clear"; actor: string; key_last4: string | null; at: string }[]>("careers_key_audit_recent", { write_key: writeKey() })).map(
        (a) => ({ action: a.action, actor: a.actor, last4: a.key_last4, at: a.at }),
      );
  } catch {
    /* reported through resolved.reason */
  }
  const canSave = !!writeKey() && encryptionReady();
  return {
    mask: resolved.key ? (resolved.source === "database" && stored?.key_last4 ? maskLast4(stored.key_last4) : maskKey(resolved.key)) : null,
    source: resolved.key ? resolved.source : null,
    updatedAt: stored?.updated_at ?? null,
    updatedBy: stored?.updated_by ?? null,
    canSave,
    problem: "reason" in resolved ? resolved.reason : null,
    audit,
  };
}

export type SaveResult = { ok: true; mask: string | null } | { ok: false; error: string };

/** Saves (or, with null, clears) the key. The audit row is written by the same database call. */
export async function setKey(raw: string | null, actor: string): Promise<SaveResult> {
  if (!writeKey()) return { ok: false, error: "PROGRESS_WRITE_KEY isn't set on this deployment, so the key can't be stored." };
  if (!encryptionReady()) return { ok: false, error: "No encryption secret is configured on this deployment." };
  let ciphertext: string | null = null;
  let last4: string | null = null;
  if (raw !== null) {
    const key = raw.trim();
    if (!KEY_PATTERN.test(key)) return { ok: false, error: "That isn't a career-site key. It starts with wjcs_." };
    ciphertext = encrypt(key);
    last4 = key.slice(-4);
  }
  try {
    await restRpc("careers_key_set", { write_key: writeKey(), p_ciphertext: ciphertext, p_last4: last4, p_actor: actor });
  } catch {
    return { ok: false, error: "The database refused the change. Try again." };
  }
  memo = null;
  console.log(`[careers] key ${raw === null ? "cleared" : `saved (…${last4})`} by ${actor}`);
  return { ok: true, mask: last4 ? maskLast4(last4) : null };
}

/** For tests. */
export const forgetKeyMemo = () => {
  memo = null;
};
