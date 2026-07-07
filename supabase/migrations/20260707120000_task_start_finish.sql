-- =====================================================================
--  LDD Services — Iniciar / finalizar tarea contando a TODOS los asignados.
--
--  Al iniciar una tarea, se abre una sesión de horas para cada empleado
--  asignado (no solo para quien la inicia). Así, si 2 trabajadores tardan
--  1 hora, el proyecto acumula 2 horas (horas-persona).
--
--  Son SECURITY DEFINER para poder registrar a todos los asignados aunque
--  quien la inicie sea un empleado (cuyo RLS solo le deja registrar lo suyo).
--  Igual validan permiso: admin, manager del proyecto, o asignado a la tarea.
-- =====================================================================

create or replace function public.start_task(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_emp uuid;
begin
  select project_id into v_project from public.jobs where id = p_job_id;
  if v_project is null then
    raise exception 'Tarea no encontrada';
  end if;

  v_emp := public.current_employee_id();
  if not (
    public.is_admin()
    or public.is_manager_of(v_project)
    or exists (select 1 from public.job_assignments ja
               where ja.job_id = p_job_id and ja.employee_id = v_emp)
  ) then
    raise exception 'Sin permiso para iniciar esta tarea';
  end if;

  -- Abre una sesión para cada asignado que no tenga ya una abierta.
  insert into public.time_entries (job_id, project_id, employee_id, clock_in)
  select p_job_id, v_project, ja.employee_id, now()
  from public.job_assignments ja
  where ja.job_id = p_job_id
    and not exists (
      select 1 from public.time_entries te
      where te.job_id = p_job_id
        and te.employee_id = ja.employee_id
        and te.clock_out is null
    );

  update public.jobs
     set status = 'in_progress', actual_start = coalesce(actual_start, now())
   where id = p_job_id;
end;
$$;

create or replace function public.finish_task(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_emp uuid;
begin
  select project_id into v_project from public.jobs where id = p_job_id;
  if v_project is null then
    raise exception 'Tarea no encontrada';
  end if;

  v_emp := public.current_employee_id();
  if not (
    public.is_admin()
    or public.is_manager_of(v_project)
    or exists (select 1 from public.job_assignments ja
               where ja.job_id = p_job_id and ja.employee_id = v_emp)
  ) then
    raise exception 'Sin permiso para finalizar esta tarea';
  end if;

  -- Cierra todas las sesiones abiertas de la tarea (de todos los asignados).
  update public.time_entries
     set clock_out = now()
   where job_id = p_job_id and clock_out is null;

  update public.jobs
     set status = 'completed', actual_end = now()
   where id = p_job_id;
end;
$$;

grant execute on function public.start_task(uuid) to authenticated;
grant execute on function public.finish_task(uuid) to authenticated;
