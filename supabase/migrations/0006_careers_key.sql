-- The WonderJobs career-site key (wjcs_…) for /careers (2026-10-21).
--
-- The key is encrypted by the app (AES-256-GCM) before it reaches the database; only the
-- ciphertext and the last four characters are stored. Every save and clear is kept in the
-- audit table (who, when, last four only). Both tables are private; the functions below
-- require the write key (the 'progress' row of private.write_keys), like the dashboard's.
-- No DELETE anywhere: clearing sets the ciphertext to null.

create table private.careers_settings (
  id smallint primary key default 1 check (id = 1),
  key_ciphertext text,
  key_last4 text check (key_last4 is null or key_last4 ~ '^[A-Za-z0-9_-]{4}$'),
  updated_at timestamptz not null default now(),
  updated_by text not null
);

create table private.careers_key_audit (
  id bigint generated always as identity primary key,
  action text not null check (action in ('save', 'clear')),
  actor text not null,
  key_last4 text,
  at timestamptz not null default now()
);

comment on table private.careers_settings is 'Encrypted WonderJobs career-site key (ciphertext + last four). Read and written only through public.careers_key_* with the write key.';
comment on table private.careers_key_audit is 'Every save and clear of the careers key: who, when, last four characters only.';

create function public.careers_key_get(write_key text)
returns table (key_ciphertext text, key_last4 text, updated_at timestamptz, updated_by text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.dashboard_key_ok(write_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select s.key_ciphertext, s.key_last4, s.updated_at, s.updated_by from private.careers_settings s where s.id = 1;
end;
$$;

create function public.careers_key_set(write_key text, p_ciphertext text, p_last4 text, p_actor text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.dashboard_key_ok(write_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_actor is null or length(p_actor) = 0 or length(p_actor) > 200 then
    raise exception 'actor required' using errcode = '22023';
  end if;
  if p_ciphertext is not null and (length(p_ciphertext) > 2000 or p_last4 is null) then
    raise exception 'bad key payload' using errcode = '22023';
  end if;
  insert into private.careers_settings (id, key_ciphertext, key_last4, updated_at, updated_by)
  values (1, p_ciphertext, case when p_ciphertext is null then null else p_last4 end, now(), p_actor)
  on conflict (id) do update set key_ciphertext = excluded.key_ciphertext, key_last4 = excluded.key_last4,
    updated_at = now(), updated_by = excluded.updated_by;
  insert into private.careers_key_audit (action, actor, key_last4)
  values (case when p_ciphertext is null then 'clear' else 'save' end, p_actor, case when p_ciphertext is null then null else p_last4 end);
end;
$$;

create function public.careers_key_audit_recent(write_key text)
returns table (action text, actor text, key_last4 text, at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.dashboard_key_ok(write_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select a.action, a.actor, a.key_last4, a.at from private.careers_key_audit a order by a.at desc limit 20;
end;
$$;

revoke all on function public.careers_key_get(text) from public;
revoke all on function public.careers_key_set(text, text, text, text) from public;
revoke all on function public.careers_key_audit_recent(text) from public;
grant execute on function public.careers_key_get(text) to anon, authenticated;
grant execute on function public.careers_key_set(text, text, text, text) to anon, authenticated;
grant execute on function public.careers_key_audit_recent(text) to anon, authenticated;
