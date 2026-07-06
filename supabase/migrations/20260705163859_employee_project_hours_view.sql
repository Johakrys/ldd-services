-- =====================================================================
--  LDD Services — Horas trabajadas por empleado y proyecto
--
--  Detalle para desplegar en Pagos: al elegir un empleado, ver cuántas
--  horas trabajó en cada proyecto. Usa horas cerradas (te.hours).
-- =====================================================================

create or replace view public.v_employee_project_hours as
select
  te.employee_id,
  te.project_id,
  p.name as project_name,
  sum(te.hours) as total_hours
from public.time_entries te
join public.projects p on p.id = te.project_id
where te.hours is not null
group by te.employee_id, te.project_id, p.name;

alter view public.v_employee_project_hours set (security_invoker = on);

grant select on public.v_employee_project_hours to authenticated;
