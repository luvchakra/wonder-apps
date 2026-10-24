# Operations runbook

Reference values and one-off steps. The rules that apply to every change are in `CLAUDE.md`.

## Vercel

- Account `kunals-projects-9f64757f` (Hobby, team `team_nGnxn1FrUI78kVpMm12R7FIF`; moved from
  `luvchakras-projects` on 2026-10-15). Project `prj_eAN93HE8LG4URCWU0JlhBQtokWuM`.
- The deployment cap is shared with WonderHome, which is in the same account.
- Crons (`vercel.json`, UTC): progress `01:10` daily; dashboard `02:40` daily; newsletter
  weekly `Mon 03:30`; newsletter monthly `1st 03:45`.

## Email

- `src/lib/mailer.ts` defaults: `SMTP_HOST` `smtpout.secureserver.net`, `SMTP_PORT` `465`,
  `SMTP_USER` `connect@wonderapps.biz`.
- Variables are listed in `.env.example`.

## Rotate the progress write key

1. Set the new `PROGRESS_WRITE_KEY` in Vercel.
2. In the Supabase SQL editor, store its hash:
   `update private.write_keys set sha256 = extensions.digest('<key>', 'sha256') where name = 'progress';`
