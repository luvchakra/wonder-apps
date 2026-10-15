-- The most recent snapshot per product, for the site's headline numbers.
create view public.progress_latest with (security_invoker = true) as
  select distinct on (product_slug) *
    from public.progress_snapshots
   order by product_slug, captured_on desc;

grant select on public.progress_latest to anon, authenticated;
