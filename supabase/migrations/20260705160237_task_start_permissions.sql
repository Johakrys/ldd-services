-- =====================================================================
--  LDD Services — Permisos para iniciar/finalizar tareas (a nivel de tarea)
--
--    admin    -> cualquier tarea
--    manager  -> cualquier tarea de un proyecto que él gestiona
--    empleado -> solo tareas asignadas a él (asignación a NIVEL de tarea)
-- =====================================================================

-- ¿el usuario está asignado a ESTA tarea (job) en concreto?
create or replace function public.is_assigned_to_job(jid uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.job_assignments ja
    where ja.job_id = jid and ja.employee_id = public.current_employee_id()
  );
$$;

-- Subir foto: admin/manager del proyecto, o empleado asignado a ESA tarea.
drop policy if exists photos_insert on public.photos;
create policy photos_insert on public.photos
  for insert to authenticated with check (
    public.can_manage_project(project_id)
    or (job_id is not null and public.is_assigned_to_job(job_id))
  );

-- Actualizar la tarea (iniciar/finalizar): además de admin/manager
-- (política jobs_write), el empleado asignado a ESA tarea.
drop policy if exists jobs_update_assigned on public.jobs;
create policy jobs_update_assigned on public.jobs
  for update to authenticated
  using (public.is_assigned_to_job(id))
  with check (public.is_assigned_to_job(id));
