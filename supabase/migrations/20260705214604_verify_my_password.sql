-- =====================================================================
--  Verifica si la contraseña recibida corresponde a la del propio
--  usuario autenticado. Se usa para exigir la contraseña actual antes
--  de permitir cambiarla.
-- =====================================================================

create or replace function public.verify_my_password(p_password text)
returns boolean
language sql
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and encrypted_password = extensions.crypt(p_password, encrypted_password)
  );
$function$;

grant execute on function public.verify_my_password(text) to authenticated;
