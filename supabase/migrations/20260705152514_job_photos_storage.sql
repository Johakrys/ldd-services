-- =====================================================================
--  LDD Services — Storage para fotos de tareas (antes/después) +
--  permitir que el empleado asignado inicie/finalice su tarea.
-- =====================================================================

-- Bucket privado para las fotos de las tareas.
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', false)
on conflict (id) do nothing;

-- Políticas: cualquier usuario autenticado (personal) puede leer/subir/
-- borrar objetos dentro del bucket job-photos.
create policy "job_photos_select" on storage.objects
  for select to authenticated using (bucket_id = 'job-photos');
create policy "job_photos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'job-photos');
create policy "job_photos_update" on storage.objects
  for update to authenticated using (bucket_id = 'job-photos');
create policy "job_photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'job-photos');

-- El empleado asignado a una tarea puede actualizarla (iniciar/finalizar),
-- además del admin/manager que ya podían (política jobs_write).
create policy jobs_update_assigned on public.jobs
  for update to authenticated
  using (public.is_assigned_to(project_id))
  with check (public.is_assigned_to(project_id));
