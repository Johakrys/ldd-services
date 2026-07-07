-- =====================================================================
--  LDD Services — Gastos por proyecto (con foto de la factura).
--  Reutiliza el bucket privado job-photos (prefijo expenses/) para las
--  fotos, así que no necesita políticas de storage nuevas.
-- =====================================================================

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  amount       numeric(12,2) not null check (amount >= 0),
  reason       text not null,
  receipt_path text,
  spent_at     date not null default ((now() at time zone 'utc')::date),
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists expenses_project_id_idx on public.expenses (project_id);

alter table public.expenses enable row level security;

-- Ver: quien puede ver el proyecto. Crear/editar/borrar: quien lo gestiona
-- (admin o manager del proyecto). Mismos helpers que usa la tabla photos.
create policy expenses_select on public.expenses
  for select to authenticated using (public.can_view_project(project_id));

create policy expenses_insert on public.expenses
  for insert to authenticated with check (public.can_manage_project(project_id));

create policy expenses_update on public.expenses
  for update to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

create policy expenses_delete on public.expenses
  for delete to authenticated using (public.can_manage_project(project_id));
