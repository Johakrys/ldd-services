-- =====================================================================
--  LDD Services — Nómina con estado pagado / pendiente
--
--  Cada registro de horas puede marcarse como pagado. Las horas NO pagadas
--  forman la "nómina pendiente" (unpaid_hours × tarifa). Al marcar a un
--  empleado como pagado, sus horas pendientes pasan a pagadas.
-- =====================================================================

alter table public.time_entries
  add column is_paid boolean not null default false,
  add column paid_at timestamptz;

-- Recreamos la vista agregando horas/monto pendientes (columnas al final).
create or replace view public.v_employee_hours as
select
  e.id as employee_id,
  trim(e.first_name || ' ' || coalesce(e.last_name, '')) as full_name,
  e.position,
  e.is_active,
  coalesce(sum(te.hours), 0) as total_hours,
  r.hourly_rate,
  coalesce(sum(te.hours), 0) * coalesce(r.hourly_rate, 0) as amount_due,
  coalesce(sum(te.hours) filter (where not te.is_paid), 0) as unpaid_hours,
  coalesce(sum(te.hours) filter (where not te.is_paid), 0) * coalesce(r.hourly_rate, 0) as amount_pending
from public.employees e
left join public.time_entries te on te.employee_id = e.id
left join public.employee_rates r on r.employee_id = e.id
group by e.id, e.first_name, e.last_name, e.position, e.is_active, r.hourly_rate;

alter view public.v_employee_hours set (security_invoker = on);
grant select on public.v_employee_hours to authenticated;
