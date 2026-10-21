import assert from "node:assert/strict";
import { test } from "node:test";
import { decrypt, encrypt } from "../../src/lib/careers/crypto";
import { forgetKeyMemo, keyStatus, maskKey, resolveKey, setKey } from "../../src/lib/careers/key";
import { captureLogs, json, KEY, scriptedFetch } from "./helpers";

process.env.DASHBOARD_SESSION_SECRET = "s".repeat(48);

test("the key is masked to its last four characters", () => {
  assert.equal(maskKey(KEY), "wjcs_••••••••WXYZ");
});

test("encryption round-trips and the ciphertext doesn't contain the key", () => {
  const box = encrypt(KEY);
  assert.ok(!box.includes(KEY) && !box.includes("wjcs_"));
  assert.equal(decrypt(box), KEY);
  assert.equal(decrypt(box.slice(0, -2) + "AA"), null, "tampering is detected");
});

test("saving stores only ciphertext and last four, with the actor for the audit row", async () => {
  process.env.PROGRESS_WRITE_KEY = "write-key";
  const { f, calls } = scriptedFetch([json(200, null)]);
  const orig = globalThis.fetch;
  globalThis.fetch = f;
  try {
    const { result, logs } = await captureLogs(() => setKey(`  ${KEY} `, "admin@example.invalid"));
    assert.deepEqual(result, { ok: true, mask: "wjcs_••••••••WXYZ" });
    assert.match(calls[0].url, /\/rpc\/careers_key_set$/);
    const body = JSON.parse(calls[0].body!);
    assert.equal(body.p_actor, "admin@example.invalid");
    assert.equal(body.p_last4, "WXYZ");
    assert.ok(!calls[0].body!.includes(KEY), "plain key never sent to the database");
    assert.equal(decrypt(body.p_ciphertext), KEY);
    assert.ok(!logs.includes(KEY));
  } finally {
    globalThis.fetch = orig;
  }
});

test("clearing sends a null ciphertext (the database writes the 'clear' audit row)", async () => {
  process.env.PROGRESS_WRITE_KEY = "write-key";
  const { f, calls } = scriptedFetch([json(200, null)]);
  const orig = globalThis.fetch;
  globalThis.fetch = f;
  try {
    const { result } = await captureLogs(() => setKey(null, "admin@example.invalid"));
    assert.deepEqual(result, { ok: true, mask: null });
    const body = JSON.parse(calls[0].body!);
    assert.equal(body.p_ciphertext, null);
    assert.equal(body.p_actor, "admin@example.invalid");
  } finally {
    globalThis.fetch = orig;
  }
});

test("a malformed key is refused before anything is stored", async () => {
  process.env.PROGRESS_WRITE_KEY = "write-key";
  const r = await setKey("sk_live_nope", "admin@example.invalid");
  assert.equal(r.ok, false);
});

test("the stored key wins over the environment, and the status shows only the mask", async () => {
  process.env.PROGRESS_WRITE_KEY = "write-key";
  process.env.WONDERJOBS_CAREERS_KEY = "wjcs_env_fallback_key_0000";
  const stored = [{ key_ciphertext: encrypt(KEY), key_last4: "WXYZ", updated_at: "2026-10-21T00:00:00Z", updated_by: "admin@example.invalid" }];
  const { f } = scriptedFetch([json(200, stored), json(200, stored), json(200, [{ action: "save", actor: "admin@example.invalid", key_last4: "WXYZ", at: "2026-10-21T00:00:00Z" }])]);
  const orig = globalThis.fetch;
  globalThis.fetch = f;
  try {
    forgetKeyMemo();
    const s = await keyStatus();
    assert.equal(s.mask, "wjcs_••••••••WXYZ");
    assert.equal(s.source, "database");
    assert.equal(s.audit[0].last4, "WXYZ");
    assert.ok(!JSON.stringify(s).includes(KEY), "the status never carries the key");
  } finally {
    globalThis.fetch = orig;
  }
});

test("with nothing stored, the environment variable is the fallback", async () => {
  process.env.PROGRESS_WRITE_KEY = "";
  process.env.WONDERJOBS_CAREERS_KEY = "wjcs_env_fallback_key_0000";
  forgetKeyMemo();
  const r = await resolveKey();
  assert.equal(r.key, "wjcs_env_fallback_key_0000");
  process.env.WONDERJOBS_CAREERS_KEY = "";
  forgetKeyMemo();
  const none = await resolveKey();
  assert.equal(none.key, null);
});

test("a save the database answers with 204 and no body counts as saved", async () => {
  process.env.PROGRESS_WRITE_KEY = "write-key";
  const { f } = scriptedFetch([new Response(null, { status: 204 })]);
  const orig = globalThis.fetch;
  globalThis.fetch = f;
  try {
    const { result } = await captureLogs(() => setKey(KEY, "admin@example.invalid"));
    assert.deepEqual(result, { ok: true, mask: "wjcs_••••••••WXYZ" });
  } finally {
    globalThis.fetch = orig;
  }
});
