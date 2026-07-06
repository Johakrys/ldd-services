-- =====================================================================
--  LDD Services — Equipo por proyecto (para exportar)
--
--  El equipo = manager del proyecto + empleados asignados a sus tareas,
--  como una lista de nombres separados por coma.
-- =====================================================================

create or replace view public.v_project_team as
select
  p.id as project_id,
  string_agg(distinct m.name, ', ') as team
from public.projects p
left join lateral (
  select trim(e.first_name || ' ' || coalesce(e.last_name, '')) as name
  from public.employees e
  where e.id = p.manager_id
  union
  select trim(e.first_name || ' ' || coalesce(e.last_name, '')) as name
  from public.jobs j
  join public.job_assignments ja on ja.job_id = j.id
  join public.employees e on e.id = ja.employee_id
  where j.project_id = p.id
) m on true
group by p.id;

alter view public.v_project_team set (security_invoker = on);

grant select on public.v_project_team to authenticated;
