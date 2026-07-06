-- =====================================================================
--  Permite a cualquier usuario autenticado cambiar su PROPIO correo.
--  Actualiza auth.users, la identidad de email y la ficha de empleado.
-- =====================================================================

create or replace function public.update_my_email(p_email text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(p_email));
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if v_email is null or v_email = ''
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Correo inválido';
  end if;
  if exists (select 1 from auth.users where email = v_email and id <> v_uid) then
    raise exception 'Ya existe un usuario con ese correo';
  end if;

  update auth.users
  set email = v_email,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = v_uid;

  update auth.identities
  set identity_data = identity_data || jsonb_build_object('email', v_email),
      updated_at = now()
  where user_id = v_uid and provider = 'email';

  update public.employees
  set email = v_email
  where user_id = v_uid;
end;
$function$;

grant execute on function public.update_my_email(text) to authenticated;
