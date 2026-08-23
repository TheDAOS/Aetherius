-- Add CHECK constraints for data integrity
alter table public.vaults
  add constraint github_owner_not_empty CHECK (char_length(trim(github_owner)) > 0),
  add constraint github_repo_not_empty CHECK (char_length(trim(github_repo)) > 0),
  add constraint branch_not_empty CHECK (char_length(trim(branch)) > 0),
  add constraint github_owner_format CHECK (github_owner ~ '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$'),
  add constraint github_repo_format CHECK (github_repo ~ '^[a-zA-Z0-9._-]+$');

-- Add explicit WITH CHECK to UPDATE policy
drop policy if exists "Users can update their own vaults." on public.vaults;
create policy "Users can update their own vaults."
  on public.vaults for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- Protect immutable columns from modification
create or replace function public.protect_immutable_columns()
returns trigger as $$
begin
  if NEW.id != OLD.id then
    raise exception 'Cannot modify immutable column: id';
  end if;
  if NEW.created_at != OLD.created_at then
    raise exception 'Cannot modify immutable column: created_at';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger protect_vault_immutable_columns
  before update on public.vaults
  for each row execute function public.protect_immutable_columns();
