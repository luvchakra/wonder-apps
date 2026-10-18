-- Day-by-day history of the founder dashboard's single-number metrics (founder's request,
-- 2026-10-18). Every collection keeps one row per product, period and day in
-- private.dashboard_snapshots (0004); this returns just the stat values from those rows, so
-- the dashboard can draw users, active users, revenue and the rest over time without
-- shipping every stored chart. Same rules as 0004: key-protected, aggregates only.

create function public.dashboard_stat_history(write_key text, p_period text, p_since date)
returns table (product_slug text, captured_on date, stats jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.dashboard_key_ok(write_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select s.product_slug, s.captured_on,
           coalesce((select jsonb_object_agg(e.key, e.value -> 'value')
                       from jsonb_each(s.results) e
                      where e.value ->> 'kind' = 'stat'), '{}'::jsonb)
      from private.dashboard_snapshots s
     where s.period = p_period and s.captured_on >= p_since
       and s.status in ('ok', 'partial')
     order by s.captured_on, s.product_slug;
end;
$$;

revoke all on function public.dashboard_stat_history(text, text, date) from public;
grant execute on function public.dashboard_stat_history(text, text, date) to anon, authenticated;
