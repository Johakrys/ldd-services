-- =====================================================================
--  LDD Services — El manager puede registrar horas para los empleados
--  asignados a las tareas de SUS proyectos (no solo para sí mismo).
--  (SELECT y UPDATE ya lo permitían; faltaba en INSERT.)
-- =====================================================================

drop policy if exists time_entries_insert on public.time_entries;
create policy time_entries_insert on public.time_entries
  for insert to authenticated with check (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or (project_id is not null and public.is_manager_of(project_id))
  );
