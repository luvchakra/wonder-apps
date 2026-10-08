import { assertReadOnlySql } from "./db";
import type { AppDashboard } from "./types";
import { wonderark } from "./apps/wonderark";
import { wondercreator } from "./apps/wondercreator";
import { wonderhome } from "./apps/wonderhome";
import { wonderid } from "./apps/wonderid";
import { wonderjobs } from "./apps/wonderjobs";

/** Portfolio order: the same order as the public site. */
export const apps: AppDashboard[] = [wonderhome, wonderjobs, wondercreator, wonderark, wonderid];

// Fail the build, not a request, if a metric is not a plain read-only SELECT or an id repeats.
for (const a of apps) {
  const seen = new Set<string>();
  for (const m of a.metrics) {
    if (seen.has(m.id)) throw new Error(`Duplicate metric id ${a.slug}/${m.id}`);
    seen.add(m.id);
    assertReadOnlySql(m.sql, `${a.slug}/${m.id}`);
  }
}

export const appBySlug = (slug: string) => apps.find((a) => a.slug === slug);
