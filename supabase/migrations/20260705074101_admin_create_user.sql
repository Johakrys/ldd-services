-- =====================================================================
--  LDD Services — Creación de usuarios (empleados con login) por el admin
--
--  Crear una cuenta de acceso no puede hacerse desde la app (requiere la
--  llave de servicio). Esta función corre en la base con SECURITY DEFINER,
--  verifica que quien la llama sea admin, crea el usuario en auth y fija su
--  rol. El trigger handle_new_user crea el perfil y la ficha de empleado.
-- =====================================================================

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
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    false, false
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

  -- handle_new_user ya insertó profile + employee; fijamos el rol elegido.
  update public.profiles set role = p_role where id = v_id;

  return v_id;
end;
$$;

-- Solo usuarios autenticados pueden invocarla (la función valida que sea admin).
revoke all on function public.admin_create_user(text, text, text, public.user_role) from public, anon;
grant execute on function public.admin_create_user(text, text, text, public.user_role) to authenticated;
