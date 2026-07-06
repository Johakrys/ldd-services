-- =====================================================================
--  LDD Services — Descuento de horas EN VIVO por bloques de 30 minutos
--
--  Para tareas en curso (time_entries sin clock_out), el proyecto descuenta
--  el tiempo transcurrido redondeado hacia abajo a bloques de 30 min:
--    0–29 min → 0 h · 30–59 min → 0.5 h · 60–89 min → 1 h · ...
--  Al finalizar (clock_out), se usa el tiempo real exacto.
-- =====================================================================

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
  select
    project_id,
    sum(
      case
        when clock_out is not null then hours
        -- sesión en curso: bloques completos de 30 min transcurridos
        else floor(extract(epoch from (now() - clock_in)) / 1800.0) * 0.5
      end
    ) as total_hours
  from public.time_entries
  group by project_id
) hrs on hrs.project_id = p.id
left join (
  select cl.project_id,
         count(ci.*) filter (where ci.is_completed) as done_items,
         count(ci.*)                                as total_items
  from public.checklists cl
  join public.checklist_items ci on ci.checklist_id = cl.id
  group by cl.project_id
) chk on chk.project_id = p.id;

alter view public.v_project_summary set (security_invoker = on);
