import { getStartups } from "@/lib/content/load";
import { apps } from "./registry";

export type DashProduct = { slug: string; name: string; oneLiner: string | null };

/**
 * The products in dashboard order, named from the site's copy. The dashboard must still work if
 * that read fails, so a product then falls back to its slug rather than taking the page down.
 */
export async function dashProducts(): Promise<DashProduct[]> {
  const list = await getStartups().catch((e: unknown) => {
    console.error("[dashboard] product names unavailable:", e instanceof Error ? e.message : e);
    return null;
  });
  return apps.map((a) => {
    const s = list?.find((x) => x.slug === a.slug);
    return { slug: a.slug, name: s?.name ?? a.slug, oneLiner: s?.oneLiner ?? null };
  });
}

export const namesOf = (products: DashProduct[]): Record<string, string> => Object.fromEntries(products.map((p) => [p.slug, p.name]));
