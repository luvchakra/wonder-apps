-- WonderApps' own database (Supabase project `wonderapps`, ap-south-1).
--
-- What lives here: the site's copy (one JSON document per product, legal page, deck and
-- tracker description) and a daily snapshot of every product's public engineering tracker.
-- What never lives here: anything about a person. Contact-form messages are emailed, not
-- stored; the founder dashboard still reads each product live and keeps nothing.
--
-- Access: the site reads with the publishable (anon) key, so every public table is
-- read-only for anon and authenticated. Copy is edited by the owner in the Supabase
-- dashboard; every change is kept in private.content_revisions. Snapshots are written only
-- through public.record_progress_snapshot, which requires the write key whose SHA-256
-- is stored in private.write_keys.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------- content

create table public.content_documents (
  kind text not null check (kind in ('site', 'startup', 'deck_copy', 'legal', 'tracker')),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  position integer not null default 0,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (kind, slug)
);

comment on table public.content_documents is
  'Site copy, one JSON document per (kind, slug). The site validates every document against its schema in src/lib/content/schema.ts before rendering it.';

create table private.content_revisions (
  id bigint generated always as identity primary key,
  kind text not null,
  slug text not null,
  op text not null,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now(),
  changed_by text not null default current_user
);

create function private.track_content_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  insert into private.content_revisions (kind, slug, op, old_data, new_data)
  values (
    coalesce(new.kind, old.kind),
    coalesce(new.slug, old.slug),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then old.data end,
    case when tg_op in ('INSERT', 'UPDATE') then new.data end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger content_documents_track_insert_update
  before insert or update on public.content_documents
  for each row execute function private.track_content_change();
create trigger content_documents_track_delete
  after delete on public.content_documents
  for each row execute function private.track_content_change();

alter table public.content_documents enable row level security;
create policy "content is public" on public.content_documents for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.content_documents from anon, authenticated;

-- ---------------------------------------------------------------- progress history

create table public.progress_snapshots (
  id bigint generated always as identity primary key,
  product_slug text not null check (product_slug ~ '^[a-z0-9-]+$'),
  captured_on date not null,
  captured_at timestamptz not null default now(),
  -- live: the daily cron read the product's tracker; backfill: rebuilt from the tracker's git history.
  source text not null check (source in ('live', 'backfill')),
  source_commit text,
  source_last_updated text,
  current_focus text,
  total integer not null check (total >= 0),
  done integer not null check (done >= 0),
  partial integer not null check (partial >= 0),
  not_started integer not null check (not_started >= 0),
  set_aside integer not null check (set_aside >= 0),
  unique (product_slug, captured_on)
);

create table public.progress_snapshot_rows (
  snapshot_id bigint not null references public.progress_snapshots (id) on delete cascade,
  position integer not null,
  row_id text not null,
  name text not null,
  total integer not null check (total >= 0),
  done integer not null check (done >= 0),
  partial integer not null check (partial >= 0),
  not_started integer not null check (not_started >= 0),
  set_aside integer not null check (set_aside >= 0),
  status text not null,
  note text,
  primary key (snapshot_id, row_id)
);

create index progress_snapshots_product_day on public.progress_snapshots (product_slug, captured_on desc);

alter table public.progress_snapshots enable row level security;
alter table public.progress_snapshot_rows enable row level security;
create policy "snapshots are public" on public.progress_snapshots for select to anon, authenticated using (true);
create policy "snapshot rows are public" on public.progress_snapshot_rows for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.progress_snapshots, public.progress_snapshot_rows from anon, authenticated;

-- ---------------------------------------------------------------- the one write path

create table private.write_keys (
  name text primary key,
  sha256 bytea not null
);

/**
 * Records one product's snapshot for one day. The first snapshot of a day wins: a second
 * call for the same product and day returns null and changes nothing, so the cron and the
 * backfill can both be re-run safely.
 * payload = { product_slug, captured_on, source, source_commit?, source_last_updated?,
 *             current_focus?, rows: [{ id, name, total, done, partial, notStarted, setAside, status, note? }] }
 */
create function public.record_progress_snapshot(write_key text, payload jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  expected bytea;
  snap_id bigint;
  r jsonb;
  i integer := 0;
begin
  select sha256 into expected from private.write_keys where name = 'progress';
  if expected is null or write_key is null
     or extensions.digest(write_key, 'sha256') <> expected then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(payload -> 'rows') <> 'array' or jsonb_array_length(payload -> 'rows') = 0 then
    raise exception 'a snapshot needs at least one row' using errcode = '22023';
  end if;

  insert into public.progress_snapshots
    (product_slug, captured_on, source, source_commit, source_last_updated, current_focus,
     total, done, partial, not_started, set_aside)
  select payload ->> 'product_slug', (payload ->> 'captured_on')::date, payload ->> 'source',
         payload ->> 'source_commit', left(payload ->> 'source_last_updated', 40), left(payload ->> 'current_focus', 4000),
         coalesce(sum((x ->> 'total')::int), 0), coalesce(sum((x ->> 'done')::int), 0),
         coalesce(sum((x ->> 'partial')::int), 0), coalesce(sum((x ->> 'notStarted')::int), 0),
         coalesce(sum((x ->> 'setAside')::int), 0)
    from jsonb_array_elements(payload -> 'rows') x
  on conflict (product_slug, captured_on) do nothing
  returning id into snap_id;

  if snap_id is null then
    return null;
  end if;

  for r in select * from jsonb_array_elements(payload -> 'rows') loop
    insert into public.progress_snapshot_rows
      (snapshot_id, position, row_id, name, total, done, partial, not_started, set_aside, status, note)
    values (snap_id, i, r ->> 'id', left(r ->> 'name', 200), (r ->> 'total')::int, (r ->> 'done')::int,
            (r ->> 'partial')::int, (r ->> 'notStarted')::int, (r ->> 'setAside')::int,
            left(r ->> 'status', 60), left(r ->> 'note', 1000));
    i := i + 1;
  end loop;
  return snap_id;
end;
$$;

revoke all on function public.record_progress_snapshot(text, jsonb) from public;
grant execute on function public.record_progress_snapshot(text, jsonb) to anon, authenticated;

-- Supabase creates this helper in every new project; nobody outside the database should run it.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
