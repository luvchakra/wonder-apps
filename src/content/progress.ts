/**
 * Shapes and arithmetic for the portfolio engineering tracker (/appstracker). The numbers are
 * not kept here: each product's tracker is recorded daily in the database
 * (`progress_snapshots`, written by /api/cron/progress) and read back through
 * `src/lib/content/load.ts`. How each product is described (stage, methodology, row notes)
 * is a `tracker` document in `content_documents`.
 *
 * Row shape is normalized across five differently-structured trackers:
 *   - WonderHome groups by backlog "modules" (docs/PROGRESS.md, generated)
 *   - WonderJobs groups by "epics" (docs/PROGRESS.md)
 *   - Wonder Creator groups by capability (docs/progress.md)
 *   - WonderArk groups by backlog documents (docs/PROGRESS-TRACKER.md, generated)
 *   - WonderID (formerly WonderAgent) groups by module "agents" (docs/PROGRESS.md, generated)
 * `setAside` means deliberately descoped or superseded by later work — not
 * abandoned and not simply "not done" — and is called out as such in the UI.
 */

export type ProgressRow = {
  id: string;
  name: string;
  total: number;
  done: number;
  partial: number;
  notStarted: number;
  setAside: number;
  status: string;
  note?: string;
};

export type ProductProgress = {
  slug: string;
  name: string;
  accent: string;
  stage: string;
  currentFocus: string;
  lastUpdated: string;
  sourceLabel: string;
  sourceUrl: string;
  rowLabel: string;
  methodology: string;
  rows: ProgressRow[];
};

function sum(rows: ProgressRow[], key: keyof Pick<ProgressRow, "total" | "done" | "partial" | "notStarted" | "setAside">) {
  return rows.reduce((n, r) => n + r[key], 0);
}

export type PortfolioTotals = {
  total: number;
  done: number;
  partial: number;
  notStarted: number;
  setAside: number;
  activeCompletionPct: number;
};

export function totalsFor(rows: ProgressRow[]): PortfolioTotals {
  const total = sum(rows, "total");
  const done = sum(rows, "done");
  const partial = sum(rows, "partial");
  const notStarted = sum(rows, "notStarted");
  const setAside = sum(rows, "setAside");
  const activeTotal = total - setAside;
  // Floor, not round: 223 of 224 must read 99%, never a 100% that isn't true.
  return { total, done, partial, notStarted, setAside, activeCompletionPct: activeTotal > 0 ? Math.floor((done / activeTotal) * 100) : 0 };
}

/**
 * Values a live traction item can quote, all from one product's latest snapshot:
 * {done} {total} {active} {remaining} {partial} {notStarted} {setAside} {pct} {rows} {rowsDone}.
 * {pct} is floored like every completion figure on the site.
 */
export function tractionVars(rows: ProgressRow[]): Record<string, string> {
  const t = totalsFor(rows);
  const active = t.total - t.setAside;
  const n = (v: number) => v.toLocaleString("en-US");
  return {
    done: n(t.done),
    total: n(t.total),
    active: n(active),
    remaining: n(active - t.done),
    partial: n(t.partial),
    notStarted: n(t.notStarted),
    setAside: n(t.setAside),
    pct: String(t.activeCompletionPct),
    rows: n(rows.length),
    rowsDone: n(rows.filter((r) => r.status === "Done").length),
  };
}

/** Fills {name} placeholders; an unknown name is an error, never a blank on the page. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in vars)) throw new Error(`Unknown placeholder {${k}} in "${template}"`);
    return vars[k];
  });
}
