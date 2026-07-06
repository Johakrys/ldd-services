-- =====================================================================
--  LDD Services — Forzar cambio de contraseña en el primer inicio
--
--  El admin crea usuarios con una contraseña temporal. Al crearlos se marca
--  must_change_password = true; la app obliga a crear su propia contraseña
--  antes de usarla. El propio usuario apaga el flag al cambiarla.
-- =====================================================================

alter table public.profiles
  add column must_change_password boolean not null default false;

-- admin_create_user ahora marca al usuario para que cambie su contraseña.
create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role public.user_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede crear usuarios';
  end if;
  if v_email is null or v_email = '' then
    raise exception 'El correo es obligatorio';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Ya existe un usuario con ese correo';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    false, false,
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email),
    'email', v_id::text,
    now(), now(), now()
  );

  -- Rol elegido + obligar cambio de contraseña en el primer inicio.
  update public.profiles
  set role = p_role, must_change_password = true
  where id = v_id;

  return v_id;
end;
$$;
