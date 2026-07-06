-- =====================================================================
--  LDD Services — Historial de pagos por empleado
--
--  Cada semana ya pagada (is_paid) agrupada por su viernes de pago:
--  horas, monto y cuándo se pagó. Base del "historial de pagos".
-- =====================================================================

create or replace view public.v_employee_payments as
select
  te.employee_id,
  (te.clock_in::date + ((5 - extract(dow from te.clock_in)::int + 7) % 7))::date as pay_friday,
  max(te.paid_at) as paid_at,
  sum(te.hours) as hours,
  sum(te.hours) * coalesce(r.hourly_rate, 0) as amount
from public.time_entries te
left join public.employee_rates r on r.employee_id = te.employee_id
where te.hours is not null and te.is_paid = true
group by te.employee_id, pay_friday, r.hourly_rate;

alter view public.v_employee_payments set (security_invoker = on);

grant select on public.v_employee_payments to authenticated;
