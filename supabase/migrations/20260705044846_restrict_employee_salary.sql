-- =====================================================================
--  LDD Services — Privacidad del sueldo por hora
--
--  Regla: 👑 admin ve TODOS los sueldos | cada empleado ve SOLO el suyo |
--         nadie ve el sueldo de sus compañeros.
--
--  Como RLS filtra filas (no columnas), sacamos hourly_rate de `employees`
--  y lo movemos a su propia tabla `employee_rates` con RLS por fila.
-- =====================================================================

-- 1. Tabla dedicada al sueldo (una fila por empleado)
create table public.employee_rates (
  employee_id uuid primary key references public.employees (id) on delete cascade,
  hourly_rate numeric(10,2),
  updated_at  timestamptz not null default now()
);

-- 2. Migrar los valores existentes (si los hubiera) y quitar la columna vieja
insert into public.employee_rates (employee_id, hourly_rate)
select id, hourly_rate from public.employees where hourly_rate is not null;

alter table public.employees drop column hourly_rate;

-- 3. Mantener updated_at al día
create trigger t_employee_rates_updated
  before update on public.employee_rates
  for each row execute function extensions.moddatetime (updated_at);

-- 4. Seguridad por fila
alter table public.employee_rates enable row level security;

-- ver: admin (todos) o el propio empleado (solo su fila)
create policy employee_rates_select on public.employee_rates
  for select to authenticated
  using (public.is_admin() or employee_id = public.current_employee_id());

-- crear/editar/borrar sueldos: solo admin
create policy employee_rates_write on public.employee_rates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
