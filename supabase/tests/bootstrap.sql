-- Minimal Auth contract for a disposable database; no real accounts or secrets.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
end $$;
do $bootstrap$ begin
  if to_regprocedure('auth.uid()') is null then
    execute $function$create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$$function$;
  end if;
end $bootstrap$;
grant usage on schema public, auth to anon, authenticated, service_role;
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
