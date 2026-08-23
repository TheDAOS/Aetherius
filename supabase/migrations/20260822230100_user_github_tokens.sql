-- Server-side GitHub token storage (Rule #4 compliance)
-- Tokens are stored here instead of being passed from client to Edge Function
create table public.user_github_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_token text not null,
  scopes text not null default 'repo',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.user_github_tokens enable row level security;

-- Users can only access their own token row
create policy "Users can view their own token."
  on public.user_github_tokens for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own token."
  on public.user_github_tokens for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own token."
  on public.user_github_tokens for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Users can delete their own token."
  on public.user_github_tokens for delete
  using ( auth.uid() = user_id );

-- Auto-update updated_at
create trigger on_github_token_updated
  before update on public.user_github_tokens
  for each row execute procedure public.handle_updated_at();
