-- =====================================================================
--  LDD Services — Todo usuario que inicia sesión es también un empleado
--
--  Admin y manager NO son solo roles de permiso: también participan en
--  proyectos, tienen tareas y acumulan horas como cualquier trabajador.
--  Por eso, al crear un usuario (auth.users) le creamos su ficha en
--  employees, enlazada por user_id. Los trabajadores de terreno sin login
--  siguen existiendo como employees sin user_id.
-- =====================================================================

-- El nombre completo puede venir en una sola palabra; permitimos apellido nulo.
alter table public.employees
  alter column last_name drop not null;

-- Trigger de alta: ahora crea profile + employee.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', new.email);
begin
  -- Perfil (rol por defecto 'employee').
  insert into public.profiles (id, full_name)
  values (new.id, v_name)
  on conflict (id) do nothing;

  -- Ficha de empleado enlazada al usuario.
  insert into public.employees (user_id, first_name, last_name, email)
  values (
    new.id,
    split_part(v_name, ' ', 1),                       -- primer nombre
    nullif(regexp_replace(v_name, '^\S+\s*', ''), ''), -- resto (o null)
    new.email
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Backfill: crear ficha de empleado para usuarios existentes que no la tengan.
insert into public.employees (user_id, first_name, last_name, email)
select
  u.id,
  split_part(coalesce(p.full_name, u.email), ' ', 1),
  nullif(regexp_replace(coalesce(p.full_name, u.email), '^\S+\s*', ''), ''),
  u.email
from auth.users u
join public.profiles p on p.id = u.id
where not exists (
  select 1 from public.employees e where e.user_id = u.id
);
