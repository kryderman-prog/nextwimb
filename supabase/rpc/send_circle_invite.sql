create or replace function public.send_circle_invite(
  p_circle_name text,
  p_invited_user_id uuid,
  p_invited_by_user_id uuid
)
returns json
language plpgsql
security definer
as $$
declare
  v_circle_id uuid;
begin

  -- prevent self-invite
  if p_invited_user_id = p_invited_by_user_id then
    raise exception 'Cannot invite yourself';
  end if;

  -- create circle
  insert into public.circles (name, created_by)
  values (p_circle_name, p_invited_by_user_id)
  returning id into v_circle_id;

  -- add creator as member
  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle_id, p_invited_by_user_id, 'member')
  on conflict (circle_id, user_id) do nothing;

  -- prevent duplicate invite (same sender → same user)
  if exists (
    select 1 from public.circle_invitations
    where invited_user_id = p_invited_user_id
    and invited_by_user_id = p_invited_by_user_id
    and status = 'pending'
  ) then
    raise exception 'Invite already exists';
  end if;

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

  return json_build_object(
    'success', true,
    'circle_id', v_circle_id
  );

end;
$$;

grant execute on function public.send_circle_invite(text, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
