-- =====================================================================
--  Permite a un administrador resetear la contraseña de un usuario.
--  Deja must_change_password = true para forzar el cambio en el próximo
--  inicio de sesión.
-- =====================================================================

create or replace function public.admin_reset_password(p_user_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede resetear contraseñas';
  end if;
  if p_user_id is null then
    raise exception 'Usuario inválido';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'No se encontró el usuario';
  end if;

  update public.profiles
  set must_change_password = true
  where id = p_user_id;
end;
$function$;

grant execute on function public.admin_reset_password(uuid, text) to authenticated;
