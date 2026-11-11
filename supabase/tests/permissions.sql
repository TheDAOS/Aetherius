begin;
insert into public.user_github_tokens(user_id, encrypted_token) values ('00000000-0000-0000-0000-000000000001', 'synthetic-token');
insert into public.vaults(user_id, github_owner, github_repo) values ('00000000-0000-0000-0000-000000000002', 'other', 'other-vault');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ begin
  begin
    perform encrypted_token from public.user_github_tokens;
    raise exception 'FAIL: authenticated user can read provider credentials';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.vaults) then raise exception 'FAIL: another user vault visible'; end if;
end $$;
insert into public.vaults(user_id, github_owner, github_repo) values ('00000000-0000-0000-0000-000000000001', 'owner', 'own-vault');
update public.vaults set branch = 'feature/notes' where user_id = auth.uid();
do $$ begin
  if (select count(*) from public.vaults) <> 1 then raise exception 'FAIL: own vault inaccessible'; end if;
  if (select branch from public.vaults) <> 'feature/notes' then raise exception 'FAIL: own update rejected'; end if;
  begin
    insert into public.vaults(user_id, github_owner, github_repo) values ('00000000-0000-0000-0000-000000000002', 'other', 'unauthorized');
    raise exception 'FAIL: inserted vault for another user';
  exception when insufficient_privilege then null; end;
  begin
    update public.vaults set user_id = '00000000-0000-0000-0000-000000000002';
    raise exception 'FAIL: reassigned vault ownership';
  exception when insufficient_privilege then null; end;
  begin
    update public.vaults set id = gen_random_uuid();
    raise exception 'FAIL: mutated immutable id';
  exception when raise_exception then
    if SQLERRM not like 'Cannot modify immutable column:%' then raise; end if;
  end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform encrypted_token from public.user_github_tokens;
    raise exception 'FAIL: anonymous user can read provider credentials';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ begin
  if (select count(*) from public.user_github_tokens) <> 1 then raise exception 'FAIL: service token access failed'; end if;
end $$;
rollback;
