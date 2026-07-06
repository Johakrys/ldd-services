-- =====================================================================
--  LDD Services — Nómina semanal (sábado a viernes, pago el viernes)
--
--  Cada registro de horas cae en la semana que TERMINA el viernes en o
--  después de su fecha (dow: viernes = 5). Ese viernes es el día de pago.
--  Solo horas cerradas (te.hours) y sin pagar forman lo pendiente.
-- =====================================================================

create or replace view public.v_employee_week_hours as
select
  te.employee_id,
  (te.clock_in::date + ((5 - extract(dow from te.clock_in)::int + 7) % 7))::date as pay_friday,
  sum(te.hours) as total_hours,
  coalesce(sum(te.hours) filter (where not te.is_paid), 0) as unpaid_hours,
  coalesce(sum(te.hours) filter (where not te.is_paid), 0) * coalesce(r.hourly_rate, 0) as amount_pending
from public.time_entries te
left join public.employee_rates r on r.employee_id = te.employee_id
where te.hours is not null
group by te.employee_id, pay_friday, r.hourly_rate;

alter view public.v_employee_week_hours set (security_invoker = on);

grant select on public.v_employee_week_hours to authenticated;
