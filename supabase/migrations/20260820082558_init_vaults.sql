-- Create vaults table
create table public.vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  github_owner text not null,
  github_repo text not null,
  branch text not null default 'main',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, github_owner, github_repo)
);

-- Set up Row Level Security
alter table public.vaults enable row level security;

-- Create Policies
create policy "Users can view their own vaults."
  on public.vaults for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own vaults."
  on public.vaults for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own vaults."
  on public.vaults for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own vaults."
  on public.vaults for delete
  using ( auth.uid() = user_id );

-- Create updated_at trigger function if not exists (standard practice)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- We don't have an updated_at column on vaults currently, but good to have. Let's add it.
alter table public.vaults add column updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

create trigger on_vault_updated
  before update on public.vaults
  for each row execute procedure public.handle_updated_at();
