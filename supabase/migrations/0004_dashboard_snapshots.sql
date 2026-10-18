-- Founder dashboard snapshots (founder's decision, 2026-10-18).
--
-- The dashboard and the newsletters used to query each product's database live on every
-- request. They now read the numbers WonderApps collected: once a day (Vercel Cron) and
-- whenever the founder presses Refresh. Only finished aggregates are kept (the same metric
-- results the dashboard draws: counts, sums, series, breakdowns, cohorts), never anything
-- about a person.
--
-- Privacy: the publishable key is public and public tables are readable with it, so these
-- rows live in the private schema. They are written and read only through the two
-- functions below, and both require the write key whose SHA-256 is in private.write_keys
-- (the 'progress' row, the same key the progress recorder uses).

create table private.dashboard_snapshots (
  product_slug text not null check (product_slug ~ '^[a-z0-9-]+$'),
  period text not null check (period in ('7d', '30d', '90d', 'weekly', 'monthly')),
  captured_on date not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  window_prev_start timestamptz not null,
  window_tz text not null,
  window_days integer not null check (window_days between 1 and 400),
  status text not null check (status in ('ok', 'partial', 'not_configured', 'unreachable')),
  note text,
  results jsonb not null check (jsonb_typeof(results) = 'object'),
  fetched_at timestamptz not null,
  stored_at timestamptz not null default now(),
  primary key (product_slug, period, captured_on)
);

comment on table private.dashboard_snapshots is
  'Founder dashboard metric results per product and period, one row per day (Refresh overwrites today''s). Aggregates only. Read and written only through public.record_dashboard_snapshot / public.dashboard_snapshots_latest with the write key.';

create function private.dashboard_key_ok(write_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.write_keys
     where name = 'progress' and write_key is not null
       and sha256 = extensions.digest(write_key, 'sha256')
  );
$$;
revoke all on function private.dashboard_key_ok(text) from public, anon, authenticated;

-- payload: { "rows": [ { product_slug, period, captured_on, window: { start, end, prev_start, tz, days },
--                        status, note, results, fetched_at }, ... ] }. Returns how many rows were stored.
create function public.record_dashboard_snapshot(write_key text, payload jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if not private.dashboard_key_ok(write_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(payload -> 'rows') <> 'array' or jsonb_array_length(payload -> 'rows') = 0 then
    raise exception 'a snapshot needs at least one row' using errcode = '22023';
  end if;
  if jsonb_array_length(payload -> 'rows') > 100 then
    raise exception 'too many rows' using errcode = '22023';
  end if;

  insert into private.dashboard_snapshots
    (product_slug, period, captured_on, window_start, window_end, window_prev_start, window_tz,
     window_days, status, note, results, fetched_at, stored_at)
  select x ->> 'product_slug', x ->> 'period', (x ->> 'captured_on')::date,
         (x -> 'window' ->> 'start')::timestamptz, (x -> 'window' ->> 'end')::timestamptz,
         (x -> 'window' ->> 'prev_start')::timestamptz, left(x -> 'window' ->> 'tz', 64),
         (x -> 'window' ->> 'days')::int, x ->> 'status', left(x ->> 'note', 500),
         coalesce(x -> 'results', '{}'::jsonb), (x ->> 'fetched_at')::timestamptz, now()
    from jsonb_array_elements(payload -> 'rows') x
  on conflict (product_slug, period, captured_on) do update set
    window_start = excluded.window_start, window_end = excluded.window_end,
    window_prev_start = excluded.window_prev_start, window_tz = excluded.window_tz,
    window_days = excluded.window_days, status = excluded.status, note = excluded.note,
    results = excluded.results, fetched_at = excluded.fetched_at, stored_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.record_dashboard_snapshot(text, jsonb) from public;
grant execute on function public.record_dashboard_snapshot(text, jsonb) to anon, authenticated;

-- The most recent row for every (product, period).
create function public.dashboard_snapshots_latest(write_key text)
returns table (
  product_slug text, period text, captured_on date, window_start timestamptz, window_end timestamptz,
  window_prev_start timestamptz, window_tz text, window_days integer, status text, note text,
  results jsonb, fetched_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.dashboard_key_ok(write_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select distinct on (s.product_slug, s.period)
           s.product_slug, s.period, s.captured_on, s.window_start, s.window_end, s.window_prev_start,
           s.window_tz, s.window_days, s.status, s.note, s.results, s.fetched_at
      from private.dashboard_snapshots s
     order by s.product_slug, s.period, s.captured_on desc;
end;
$$;

revoke all on function public.dashboard_snapshots_latest(text) from public;
grant execute on function public.dashboard_snapshots_latest(text) to anon, authenticated;
