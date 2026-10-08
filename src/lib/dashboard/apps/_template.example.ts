// Reference shape for an app module. Not imported anywhere (leading underscore, .example.ts).
import type { AppDashboard } from "../types";

export const example: AppDashboard = {
  slug: "wonderexample",
  envVar: "WONDEREXAMPLE_DATABASE_URL",
  focus: "Are new households finishing setup and coming back the next week?",
  activeDefinition: "A user is active on a day if they created or completed at least one outcome that day.",
  metrics: [
    {
      kind: "stat", id: "total-users", section: "audience", label: "Total users", format: "int", snapshot: true, headline: true,
      hint: "Accounts that exist today, excluding deleted ones.",
      sql: `SELECT count(*)::numeric AS value FROM public.profiles WHERE deleted_at IS NULL`,
    },
    {
      kind: "stat", id: "new-users", section: "audience", label: "New users", format: "int", headline: true,
      hint: "Accounts created in the window.",
      sql: `SELECT count(*) FILTER (WHERE created_at >= $1 AND created_at < $2)::numeric AS value,
                   count(*) FILTER (WHERE created_at >= $3 AND created_at < $1)::numeric AS prev
            FROM public.profiles WHERE deleted_at IS NULL`,
    },
    {
      kind: "series", id: "signups", section: "audience", label: "Signups per day", format: "int", style: "bars",
      sql: `SELECT date_trunc('day', created_at AT TIME ZONE $4)::date AS day, count(*)::numeric AS value
            FROM public.profiles WHERE created_at >= $1 AND created_at < $2 GROUP BY 1 ORDER BY 1`,
    },
    {
      kind: "breakdown", id: "plan-mix", section: "revenue", label: "Plan mix", format: "int",
      sql: `SELECT plan AS label, count(*)::numeric AS value FROM public.subscriptions WHERE status = 'active' GROUP BY 1 ORDER BY 2 DESC`,
    },
  ],
};
