/**
 * Public copy never names the stack or vendors behind a product. The live
 * tracker rows come straight from each product's repo, so they pass through
 * this before display.
 */
const RULES: [RegExp, string][] = [
  [/Razorpay\s*\+\s*Stripe/gi, "payment providers"],
  [/Razorpay|Stripe/gi, "payment provider"],
  [/Supabase|PostgreSQL|Postgres/gi, "database"],
  [/\bRLS\b|row[- ]level security/gi, "data isolation"],
  [/Vercel/gi, "hosting"],
  [/Playwright/gi, "browser"],
];

export function scrub(text: string): string;
export function scrub(text: string | undefined): string | undefined;
export function scrub(text: string | undefined) {
  if (!text) return text;
  return RULES.reduce((t, [re, to]) => t.replace(re, to), text);
}
