-- =====================================================================
--  LDD Services — Presupuesto de horas por proyecto
--
--  Al crear un proyecto se define cuántas horas se le destinan
--  (budgeted_hours). Cada hora registrada por CUALQUIER trabajador
--  (empleado, manager o admin) en time_entries de ese proyecto se
--  descuenta del total → horas restantes = presupuestadas - trabajadas.
--  Las horas son acumulativas entre todos los trabajadores.
-- =====================================================================

alter table public.projects
  add column budgeted_hours numeric(8,2);

-- Recreamos v_project_summary agregando horas presupuestadas y restantes.
-- (total_hours = suma de time_entries.hours de todos los trabajadores)
create or replace view public.v_project_summary as
select
  p.id,
  p.name,
  p.status,
  c.name as client_name,
  p.estimated_cost,
  coalesce(pay.total_paid, 0)   as total_paid,
  coalesce(hrs.total_hours, 0)  as total_hours,
  coalesce(chk.done_items, 0)   as checklist_done,
  coalesce(chk.total_items, 0)  as checklist_total,
  p.budgeted_hours,
  case
    when p.budgeted_hours is not null
    then p.budgeted_hours - coalesce(hrs.total_hours, 0)
    else null
  end as remaining_hours
from public.projects p
join public.clients c on c.id = p.client_id
left join (
  select project_id, sum(amount) as total_paid
  from public.payments where status = 'paid' group by project_id
) pay on pay.project_id = p.id
left join (
  select project_id, sum(hours) as total_hours
  from public.time_entries group by project_id
) hrs on hrs.project_id = p.id
left join (
  select cl.project_id,
         count(ci.*) filter (where ci.is_completed) as done_items,
         count(ci.*)                                as total_items
  from public.checklists cl
  join public.checklist_items ci on ci.checklist_id = cl.id
  group by cl.project_id
) chk on chk.project_id = p.id;

-- Mantener la seguridad de la vista (respeta la RLS de quien consulta).
alter view public.v_project_summary set (security_invoker = on);
