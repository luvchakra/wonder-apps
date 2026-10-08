import { startups } from "@/content/startups";
import { appColor } from "./colors";
import { dashboardConfig } from "./config";
import { delta, formatValue, tone, type Delta } from "./format";
import { result } from "./load";
import { PORTFOLIO_KEYS, attention, headlineStats, rollup } from "./portfolio";
import { apps } from "./registry";
import type { AppSnapshot, Format, Window } from "./types";
import { daysIn, windowLabel } from "./window";

export type Cadence = "weekly" | "monthly" | "custom";

export type Newsletter = { subject: string; html: string; text: string; preheader: string; highlights: string[] };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const nameOf = (slug: string) => startups.find((s) => s.slug === slug)?.name ?? slug;

const TONE = { good: "#0a8a0a", bad: "#d14343", neutral: "#8a8a8f" } as const;
const ARROW = (d: Delta | null) => (d?.dir === "up" || d?.dir === "new" ? "▲" : d?.dir === "down" ? "▼" : "–");

/** Auto-written highlights: the biggest real movements first, then anything that needs a look. */
function highlights(snaps: Record<string, AppSnapshot>): string[] {
  type H = { score: number; text: string };
  const out: H[] = [];
  for (const a of apps) {
    const s = snaps[a.slug];
    if (!s || (s.status !== "ok" && s.status !== "partial")) continue;
    for (const m of headlineStats(a)) {
      if (m.kind !== "stat" || m.snapshot) continue;
      const r = result(s, m.id, "stat");
      const d = delta(r?.value ?? null, r?.prev);
      if (!r || r.value == null || !d || d.pct == null || (r.value < 5 && (r.prev ?? 0) < 5)) continue;
      if (Math.abs(d.pct) < 15) continue;
      const verb = d.pct > 0 ? "up" : "down";
      out.push({ score: Math.abs(d.pct), text: `${nameOf(a.slug)}: ${m.label.toLowerCase()} ${verb} ${Math.abs(Math.round(d.pct))}% to ${formatValue(r.value, m.format)}.` });
    }
  }
  const moves = out.sort((x, y) => y.score - x.score).slice(0, 4).map((h) => h.text);
  const flags = attention(snaps)
    .filter((t) => t.level !== "info" && !moves.some((m) => m.toLowerCase().includes(t.title.toLowerCase())))
    .slice(0, 3)
    .map((t) => `${nameOf(t.slug)}: ${t.title.toLowerCase()}${t.detail ? ` (${t.detail})` : ""}.`);
  return [...moves, ...flags];
}

const cell = (label: string, value: string, d: Delta | null, good: "up" | "down" | "neutral" | undefined, last = false) => {
  const t = tone(d, good);
  return `<td width="25%" valign="top" style="padding:14px 14px 12px;${last ? "" : "border-right:1px solid #ececef;"}">
<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a8a8f;line-height:1.3">${esc(label)}</div>
<div style="font-size:26px;font-weight:700;letter-spacing:-.02em;color:#111;margin-top:6px;line-height:1">${esc(value)}</div>
<div style="font-size:12px;margin-top:7px;color:#555">${d ? `<span style="color:${TONE[t]}">${ARROW(d)}</span> <strong style="color:#111">${esc(d.text)}</strong> <span style="color:#8a8a8f">vs previous</span>` : '<span style="color:#8a8a8f">&nbsp;</span>'}</div>
</td>`;
};

/** Daily bars as table cells (SVG and CSS charts are unreliable in mail clients). */
function bars(values: number[], color: string) {
  const max = Math.max(...values, 1);
  const H = 44;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;margin-top:12px"><tr>${values
    .map((v) => `<td valign="bottom" height="${H}" style="padding:0 1px;height:${H}px"><div style="height:${Math.max(2, Math.round((v / max) * H))}px;background:${color};border-radius:3px 3px 0 0;opacity:${v === 0 ? 0.25 : 1};font-size:0;line-height:0">&nbsp;</div></td>`)
    .join("")}</tr></table>`;
}

export function buildNewsletter(opts: { snaps: Record<string, AppSnapshot>; w: Window; cadence: Cadence }): Newsletter {
  const { snaps, w, cadence } = opts;
  const origin = dashboardConfig.origin();
  const roll = rollup(snaps, w);
  const hl = highlights(snaps);
  const period = windowLabel(w);
  const monthName = new Intl.DateTimeFormat("en-GB", { timeZone: w.tz, month: "long", year: "numeric" }).format(w.start);
  const kicker = cadence === "weekly" ? "Weekly briefing" : cadence === "monthly" ? "Monthly briefing" : "Briefing";
  const title = cadence === "monthly" ? monthName : period;
  const days = daysIn(w);

  const newD = delta(roll.newUsers, roll.prevNewUsers);
  const summary =
    roll.newUsers != null
      ? `${formatValue(roll.newUsers, "int")} new signups across the portfolio${newD && newD.dir !== "flat" && newD.pct != null ? `, ${newD.dir === "new" ? "from none" : `${newD.pct > 0 ? "up" : "down"} ${Math.abs(Math.round(newD.pct))}%`} on the previous period` : ""}.`
      : "Here is how the portfolio moved.";
  const preheader = hl[0] ?? summary;
  const first = hl.find((h) => /\d+%/.test(h));
  const subject = `WonderApps ${kicker.toLowerCase().replace(" briefing", "")} · ${title}${first ? `: ${first.replace(/^[^:]+: /, "").replace(/\.$/, "")}` : ""}`.slice(0, 120);

  const strip = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ececef;border-radius:14px;background:#fff"><tr>${[
    cell("Users", formatValue(roll.users, "int"), null, "up"),
    cell("New signups", formatValue(roll.newUsers, "int"), newD, "up"),
    cell("Monthly active", formatValue(roll.mau, "int"), null, "up"),
    cell("Paying", formatValue(roll.paying, "int"), null, "up", true),
  ].join("")}</tr></table>`;

  const blocks = apps
    .map((a) => {
      const s = snaps[a.slug];
      const color = appColor(a.slug);
      const live = s && (s.status === "ok" || s.status === "partial");
      let body: string;
      if (!live) {
        body = `<p style="margin:12px 0 0;font-size:13px;color:#8a8a8f">${s?.status === "unreachable" ? "Couldn't reach this product's database this time." : "Not connected to the dashboard yet."}</p>`;
      } else {
        const stats = headlineStats(a).slice(0, 4);
        const cells = stats.map((m, i) => {
          if (m.kind !== "stat") return "";
          const r = result(s, m.id, "stat");
          return cell(m.label, formatValue(r?.value, m.format as Format), m.snapshot ? null : delta(r?.value ?? null, r?.prev), m.good, i === stats.length - 1);
        });
        while (cells.length < 4) cells.push('<td width="25%"></td>');
        const sid = PORTFOLIO_KEYS[a.slug]?.signups;
        const sr = sid ? result(s, sid, "series") : null;
        let chart = "";
        if (sr) {
          const idx = new Map(days.map((d, i) => [d, i]));
          const vals = Array(days.length).fill(0) as number[];
          for (const p of sr.points) {
            const i = idx.get(p.day);
            if (i != null) vals[i] += p.value;
          }
          chart = `<div style="padding:4px 14px 14px"><div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a8a8f;margin-top:10px">New signups per day</div>${bars(vals, color)}</div>`;
        }
        const flags = attention({ [a.slug]: s }).filter((t) => t.level !== "info").slice(0, 2);
        const flagHtml = flags.length
          ? `<div style="margin:0 14px 14px;padding:10px 12px;background:#fff6e6;border-radius:10px;font-size:12.5px;color:#7a5200">${flags.map((t) => `<div>⚠ ${esc(t.title)}${t.detail ? `: ${esc(t.detail)}` : ""}</div>`).join("")}</div>`
          : "";
        body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid #ececef"><tr>${cells.join("")}</tr></table>${chart}${flagHtml}`;
      }
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #ececef;border-radius:14px;background:#fff;border-top:4px solid ${color}"><tr><td style="padding:16px 14px 0">
<div style="font-size:17px;font-weight:700;color:#111">${esc(nameOf(a.slug))}</div>
<div style="font-size:12.5px;color:#6e6e73;margin-top:3px;line-height:1.45">${esc(a.focus)}</div>
${body}
</td></tr></table>`;
    })
    .join("");

  const hlHtml = hl.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #ececef;border-radius:14px;background:#fff"><tr><td style="padding:16px 18px">
<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a8a8f">Highlights</div>
${hl.map((h) => `<div style="margin-top:9px;font-size:14px;line-height:1.5;color:#222"><span style="color:#6132fd">●</span>&nbsp; ${esc(h)}</div>`).join("")}
</td></tr></table>`
    : "";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#f2f2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px">
<tr><td style="background:#0c0c0e;border-radius:18px;padding:26px 24px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><img src="${origin}/brands/wonderapps/mark.png" width="38" alt="WonderApps" style="display:block;border:0"></td>
<td align="right" valign="middle" style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8c8b84">${esc(kicker)}</td></tr></table>
<div style="font-size:30px;line-height:1.1;font-weight:700;letter-spacing:-.025em;color:#fff;margin-top:22px">${esc(title)}</div>
<div style="font-size:15px;line-height:1.5;color:#c3c2b7;margin-top:10px">${esc(summary)}</div>
</td></tr>
<tr><td style="padding-top:16px">${strip}${hlHtml}${blocks}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:26px 0 8px">
<a href="${origin}/dashboard" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px">Open the full dashboard</a>
</td></tr></table>
<p style="text-align:center;font-size:11.5px;line-height:1.6;color:#8a8a8f;margin:14px 0 0">Aggregate counts only, read live from each product. No names, emails or content.<br>Period: ${esc(period)} (${esc(w.tz.replace("_", " "))}). Sent to the WonderApps founder list.</p>
</td></tr></table></td></tr></table></body></html>`;

  const lines = [
    `WonderApps ${kicker} · ${title}`,
    summary,
    "",
    `Users ${formatValue(roll.users, "int")} · New signups ${formatValue(roll.newUsers, "int")} · Monthly active ${formatValue(roll.mau, "int")} · Paying ${formatValue(roll.paying, "int")}`,
    ...(hl.length ? ["", "Highlights", ...hl.map((h) => `- ${h}`)] : []),
    ...apps.flatMap((a) => {
      const s = snaps[a.slug];
      if (!s || (s.status !== "ok" && s.status !== "partial")) return ["", `${nameOf(a.slug)}: no data this time`];
      return [
        "",
        nameOf(a.slug),
        ...headlineStats(a).slice(0, 4).flatMap((m) => {
          if (m.kind !== "stat") return [];
          const r = result(s, m.id, "stat");
          const d = m.snapshot ? null : delta(r?.value ?? null, r?.prev);
          return [`  ${m.label}: ${formatValue(r?.value, m.format)}${d ? ` (${d.text} vs previous)` : ""}`];
        }),
      ];
    }),
    "",
    `Dashboard: ${origin}/dashboard`,
  ];
  return { subject, html, text: lines.join("\n"), preheader, highlights: hl };
}
