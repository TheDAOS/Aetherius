-- Provider credentials are available only to the verified Edge Function service client.
revoke all on public.user_github_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.user_github_tokens to service_role;
drop policy if exists "Users can view their own token." on public.user_github_tokens;
drop policy if exists "Users can insert their own token." on public.user_github_tokens;
drop policy if exists "Users can update their own token." on public.user_github_tokens;
drop policy if exists "Users can delete their own token." on public.user_github_tokens;
-- Vault metadata remains protected by the existing per-user RLS policies.
grant select, insert, update, delete on public.vaults to authenticated;
