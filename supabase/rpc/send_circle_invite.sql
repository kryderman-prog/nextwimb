-- Atomic "Send Request" flow:
-- 1) Create a circle
-- 2) Add the sender as a member
-- 3) Create an invitation for the target user

create or replace function public.send_circle_invite(
  p_circle_name text,
  p_invited_user_id uuid,
  p_invited_by_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
  v_existing_circle_id uuid;
begin
  -- Must be authenticated (Supabase)
  if auth.uid() is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  -- Prevent spoofing the inviter
  if auth.uid() <> p_invited_by_user_id then
    return json_build_object('error', 'Unauthorized');
  end if;

  -- prevent self-invite
  if p_invited_user_id = p_invited_by_user_id then
    return json_build_object('error', 'Cannot invite yourself');
  end if;

  if p_circle_name is null or length(trim(p_circle_name)) = 0 then
    return json_build_object('error', 'Circle name is required');
  end if;

  -- Serialize for this user pair to prevent double-click / concurrent duplicates.
  perform pg_advisory_xact_lock(
    hashtextextended('send_circle_invite:' || p_invited_by_user_id::text || ':' || p_invited_user_id::text, 0)
  );

  -- Prevent duplicate pending/accepted invites from the same sender to the same target.
  select ci.circle_id
    into v_existing_circle_id
  from public.circle_invitations ci
  where ci.invited_by_user_id = p_invited_by_user_id
    and ci.invited_user_id = p_invited_user_id
    and ci.status in ('pending', 'accepted')
  order by ci.created_at desc
  limit 1;

  if v_existing_circle_id is not null then
    return json_build_object('error', 'Invite already exists', 'circle_id', v_existing_circle_id);
  end if;

  -- create circle
  insert into public.circles (name, created_by)
  values (p_circle_name, p_invited_by_user_id)
  returning id into v_circle_id;

  -- add creator as member
  insert into public.circle_members (circle_id, user_id)
  values (v_circle_id, p_invited_by_user_id)
  on conflict (circle_id, user_id) do nothing;

  -- create invitation
  insert into public.circle_invitations (
    circle_id,
    invited_user_id,
    invited_by_user_id,
    status
  )
  values (
    v_circle_id,
    p_invited_user_id,
    p_invited_by_user_id,
    'pending'
  );

  return json_build_object('success', true, 'circle_id', v_circle_id);

exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

revoke all on function public.send_circle_invite(text, uuid, uuid) from public;
grant execute on function public.send_circle_invite(text, uuid, uuid) to authenticated;
