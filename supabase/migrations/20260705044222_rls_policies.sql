-- =====================================================================
--  LDD Services — Seguridad (RLS), funciones auxiliares y triggers de auth
--
--  Modelo de permisos:
--    👑 admin    -> acceso total a todo
--    🧑‍💼 manager  -> gestiona (CRUD) los proyectos donde es projects.manager_id
--                    y todo lo que cuelga de ellos; ve pagos de esos proyectos
--    👷 employee -> VE las tareas de los proyectos donde está asignado
--                   (vía job_assignments) y puede: registrar SUS horas,
--                   marcar checklists y subir fotos de esos proyectos.
--                   NO ve pagos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Funciones auxiliares (SECURITY DEFINER para no chocar con RLS)
--    Todas son STABLE y con search_path vacío por seguridad.
-- ---------------------------------------------------------------------

-- id del empleado que corresponde al usuario logueado (o NULL)
create or replace function public.current_employee_id()
returns uuid
language sql stable security definer set search_path = '' as $$
  select e.id from public.employees e where e.user_id = auth.uid();
$$;

-- rol del usuario logueado, leído desde profiles
create or replace function public.auth_role()
returns public.user_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.auth_role() = 'admin', false);
$$;

-- ¿el usuario es el manager de este proyecto?
create or replace function public.is_manager_of(pid uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid and p.manager_id = public.current_employee_id()
  );
$$;

-- ¿el usuario está asignado a algún trabajo de este proyecto?
create or replace function public.is_assigned_to(pid uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.job_assignments ja
    join public.jobs j on j.id = ja.job_id
    where j.project_id = pid
      and ja.employee_id = public.current_employee_id()
  );
$$;

-- puede VER el proyecto (admin, su manager, o asignado)
create or replace function public.can_view_project(pid uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.is_manager_of(pid) or public.is_assigned_to(pid);
$$;

-- puede GESTIONAR el proyecto (admin o su manager)
create or replace function public.can_manage_project(pid uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.is_manager_of(pid);
$$;

-- ---------------------------------------------------------------------
-- 2. Alta automática de perfil al registrarse + candado de cambio de rol
-- ---------------------------------------------------------------------

-- Cada usuario nuevo en auth.users recibe una fila en profiles (rol 'employee')
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un usuario de la app NO puede auto-ascenderse de rol; solo el admin
-- (o el backend/SQL, donde auth.uid() es NULL) puede cambiar el rol.
create or replace function public.guard_role_change()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar el rol de un usuario';
  end if;
  return new;
end;
$$;

drop trigger if exists t_profiles_role_guard on public.profiles;
create trigger t_profiles_role_guard
  before update on public.profiles
  for each row execute function public.guard_role_change();

-- =====================================================================
-- 3. POLÍTICAS RLS  (usuarios NO autenticados = sin acceso)
--    service_role (backend) ignora RLS por diseño.
-- =====================================================================

-- ---------- profiles (directorio de la empresa) ----------
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles
  for insert to authenticated with check (public.is_admin());
create policy profiles_delete on public.profiles
  for delete to authenticated using (public.is_admin());

-- ---------- employees (directorio del personal) ----------
-- NOTA: hourly_rate (sueldo) queda visible para todos los autenticados.
--       Si quieres ocultarlo a los empleados, luego lo movemos a una
--       vista restringida o revocamos el privilegio de esa columna.
create policy employees_select on public.employees
  for select to authenticated using (true);
create policy employees_write on public.employees
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- clients ----------
-- admin: todo | manager/employee: solo clientes de proyectos que ven
create policy clients_select on public.clients
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.projects p
      where p.client_id = clients.id and public.can_view_project(p.id)
    )
  );
create policy clients_write on public.clients
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- properties ----------
create policy properties_select on public.properties
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.projects p
      where p.property_id = properties.id and public.can_view_project(p.id)
    )
  );
create policy properties_write on public.properties
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- projects ----------
create policy projects_select on public.projects
  for select to authenticated using (public.can_view_project(id));
-- crear/borrar proyectos: solo admin (el admin asigna el manager)
create policy projects_insert on public.projects
  for insert to authenticated with check (public.is_admin());
create policy projects_delete on public.projects
  for delete to authenticated using (public.is_admin());
-- editar proyecto: admin o su manager
create policy projects_update on public.projects
  for update to authenticated
  using (public.can_manage_project(id))
  with check (public.can_manage_project(id));

-- ---------- jobs (tareas del calendario) ----------
create policy jobs_select on public.jobs
  for select to authenticated using (public.can_view_project(project_id));
create policy jobs_write on public.jobs
  for all to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

-- ---------- job_assignments ----------
create policy job_assignments_select on public.job_assignments
  for select to authenticated using (
    exists (select 1 from public.jobs j
            where j.id = job_assignments.job_id and public.can_view_project(j.project_id))
  );
create policy job_assignments_write on public.job_assignments
  for all to authenticated
  using (
    exists (select 1 from public.jobs j
            where j.id = job_assignments.job_id and public.can_manage_project(j.project_id))
  )
  with check (
    exists (select 1 from public.jobs j
            where j.id = job_assignments.job_id and public.can_manage_project(j.project_id))
  );

-- ---------- checklists ----------
create policy checklists_select on public.checklists
  for select to authenticated using (public.can_view_project(project_id));
create policy checklists_write on public.checklists
  for all to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

-- ---------- checklist_items ----------
-- ver: quien ve el proyecto | crear/borrar: admin/manager
-- actualizar (marcar completado): admin/manager O empleado asignado
create policy checklist_items_select on public.checklist_items
  for select to authenticated using (
    exists (select 1 from public.checklists c
            where c.id = checklist_items.checklist_id and public.can_view_project(c.project_id))
  );
create policy checklist_items_insert on public.checklist_items
  for insert to authenticated with check (
    exists (select 1 from public.checklists c
            where c.id = checklist_items.checklist_id and public.can_manage_project(c.project_id))
  );
create policy checklist_items_delete on public.checklist_items
  for delete to authenticated using (
    exists (select 1 from public.checklists c
            where c.id = checklist_items.checklist_id and public.can_manage_project(c.project_id))
  );
create policy checklist_items_update on public.checklist_items
  for update to authenticated
  using (
    exists (select 1 from public.checklists c
            where c.id = checklist_items.checklist_id
              and (public.can_manage_project(c.project_id) or public.is_assigned_to(c.project_id)))
  )
  with check (
    exists (select 1 from public.checklists c
            where c.id = checklist_items.checklist_id
              and (public.can_manage_project(c.project_id) or public.is_assigned_to(c.project_id)))
  );

-- ---------- photos ----------
-- ver: quien ve el proyecto | subir: admin/manager O empleado asignado
-- editar/borrar: solo admin/manager (evita que se borren evidencias)
create policy photos_select on public.photos
  for select to authenticated using (public.can_view_project(project_id));
create policy photos_insert on public.photos
  for insert to authenticated with check (
    public.can_manage_project(project_id) or public.is_assigned_to(project_id)
  );
create policy photos_update on public.photos
  for update to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));
create policy photos_delete on public.photos
  for delete to authenticated using (public.can_manage_project(project_id));

-- ---------- materials (catálogo global de referencia) ----------
create policy materials_select on public.materials
  for select to authenticated using (true);
create policy materials_write on public.materials
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- project_materials ----------
create policy project_materials_select on public.project_materials
  for select to authenticated using (public.can_view_project(project_id));
create policy project_materials_write on public.project_materials
  for all to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

-- ---------- plants (catálogo global de referencia) ----------
create policy plants_select on public.plants
  for select to authenticated using (true);
create policy plants_write on public.plants
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- project_plants ----------
create policy project_plants_select on public.project_plants
  for select to authenticated using (public.can_view_project(project_id));
create policy project_plants_write on public.project_plants
  for all to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

-- ---------- time_entries (registro de horas) ----------
-- ver: admin | dueño de la fila | manager del proyecto
-- crear/editar: admin | el propio empleado (sus horas) | manager del proyecto
create policy time_entries_select on public.time_entries
  for select to authenticated using (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or (project_id is not null and public.is_manager_of(project_id))
  );
create policy time_entries_insert on public.time_entries
  for insert to authenticated with check (
    public.is_admin()
    or employee_id = public.current_employee_id()
  );
create policy time_entries_update on public.time_entries
  for update to authenticated
  using (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or (project_id is not null and public.is_manager_of(project_id))
  )
  with check (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or (project_id is not null and public.is_manager_of(project_id))
  );
create policy time_entries_delete on public.time_entries
  for delete to authenticated using (
    public.is_admin() or employee_id = public.current_employee_id()
  );

-- ---------- payments (financiero: empleados NO acceden) ----------
create policy payments_select on public.payments
  for select to authenticated using (public.can_manage_project(project_id));
create policy payments_write on public.payments
  for all to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

-- ---------- notifications (cada quien las suyas) ----------
create policy notifications_select on public.notifications
  for select to authenticated using (recipient_id = auth.uid() or public.is_admin());
create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid() or public.is_admin())
  with check (recipient_id = auth.uid() or public.is_admin());
create policy notifications_delete on public.notifications
  for delete to authenticated using (recipient_id = auth.uid() or public.is_admin());
create policy notifications_insert on public.notifications
  for insert to authenticated with check (public.is_admin());

-- =====================================================================
-- 4. Vistas del dashboard: respetar la RLS del usuario que consulta
--    (sin esto, las vistas correrían con permisos del dueño y saltarían
--     la seguridad, dejando ver TODO a cualquiera).
-- =====================================================================
alter view public.v_project_summary set (security_invoker = on);
alter view public.v_monthly_revenue set (security_invoker = on);
alter view public.v_todays_jobs    set (security_invoker = on);
