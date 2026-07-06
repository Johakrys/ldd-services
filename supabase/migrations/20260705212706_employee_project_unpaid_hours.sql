-- =====================================================================
--  Agrega horas NO pagadas por empleado/proyecto, para que el desglose
--  "Horas por proyecto" en la pestaña "por pagar" muestre solo lo pendiente.
-- =====================================================================

create or replace view public.v_employee_project_hours as
select
  te.employee_id,
  te.project_id,
  p.name as project_name,
  pr.address as project_address,
  pr.city as project_city,
  sum(te.hours) as total_hours,
  coalesce(sum(te.hours) filter (where not te.is_paid), 0) as unpaid_hours
from public.time_entries te
join public.projects p on p.id = te.project_id
left join public.properties pr on pr.id = p.property_id
where te.hours is not null
group by te.employee_id, te.project_id, p.name, pr.address, pr.city;

alter view public.v_employee_project_hours set (security_invoker = on);
grant select on public.v_employee_project_hours to authenticated;
