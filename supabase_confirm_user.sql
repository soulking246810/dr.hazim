-- Function to allow admins to confirm users without email verification
-- Run this in your Supabase SQL Editor

create or replace function admin_confirm_user(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the executor is an admin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Not authorized';
  end if;
  
  -- Confirm the user
  update auth.users
  set email_confirmed_at = now()
  where id = target_user_id;
end;
$$;

-- Grant execute permission to authenticated users (RLS inside function handles security)
grant execute on function admin_confirm_user to authenticated;

-- OPTIONAL: Run this once to confirm ALL existing users immediately
-- update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
