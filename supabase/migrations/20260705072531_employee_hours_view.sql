-- =====================================================================
--  LDD Services — Horas trabajadas y pago por empleado
--
--  Suma las horas de time_entries por empleado y, con su tarifa
--  (employee_rates), calcula el monto a pagar. Base para las secciones
--  "Registro de horas" y "Pagos" (nómina por horas).
-- =====================================================================

create or replace view public.v_employee_hours as
select
  e.id as employee_id,
  trim(e.first_name || ' ' || coalesce(e.last_name, '')) as full_name,
  e.position,
  e.is_active,
  coalesce(sum(te.hours), 0) as total_hours,
  r.hourly_rate,
  coalesce(sum(te.hours), 0) * coalesce(r.hourly_rate, 0) as amount_due
from public.employees e
left join public.time_entries te on te.employee_id = e.id
left join public.employee_rates r on r.employee_id = e.id
group by e.id, e.first_name, e.last_name, e.position, e.is_active, r.hourly_rate;

-- Respeta la RLS de quien consulta (admin ve todas las tarifas;
-- cada empleado solo la suya, por la RLS de employee_rates).
alter view public.v_employee_hours set (security_invoker = on);

grant select on public.v_employee_hours to authenticated;
