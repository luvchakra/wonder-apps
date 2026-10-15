-- Bulk import of site copy (used once, on 2026-10-15, to move the copy out of the code).
-- Guarded by the 'content' write key. After the import that key's hash was replaced with
-- random bytes, so nobody holds a key and the function refuses every call. To use it again
-- (e.g. to restore supabase/seed/content.json), set a new hash in the SQL editor:
--   update private.write_keys set sha256 = extensions.digest('<new key>', 'sha256') where name = 'content';
create function public.import_content_documents(write_key text, docs jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  expected bytea;
  d jsonb;
  n integer := 0;
begin
  select sha256 into expected from private.write_keys where name = 'content';
  if expected is null or write_key is null
     or extensions.digest(write_key, 'sha256') <> expected then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(docs) <> 'array' then
    raise exception 'docs must be an array' using errcode = '22023';
  end if;
  for d in select * from jsonb_array_elements(docs) loop
    insert into public.content_documents (kind, slug, position, data)
    values (d ->> 'kind', d ->> 'slug', coalesce((d ->> 'position')::int, 0), d -> 'data')
    on conflict (kind, slug) do update set position = excluded.position, data = excluded.data;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.import_content_documents(text, jsonb) from public;
grant execute on function public.import_content_documents(text, jsonb) to anon, authenticated;
