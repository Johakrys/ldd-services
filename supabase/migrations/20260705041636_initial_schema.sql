-- =====================================================================
--  LDD Services — Esquema de base de datos (PostgreSQL / Supabase)
--  App de gestión para empresa de landscaping (una sola empresa).
--
--  Orden: extensiones -> enums -> tablas -> índices -> triggers -> vistas -> RLS
--  Todas las tablas usan UUID como PK y timestamptz para fechas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensiones
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "moddatetime" schema extensions; -- trigger updated_at

-- ---------------------------------------------------------------------
-- 1. Tipos enumerados (ENUM)
-- ---------------------------------------------------------------------
create type user_role       as enum ('admin', 'manager', 'employee');
create type project_status  as enum ('lead', 'quoted', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled');
create type job_status      as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type priority_level  as enum ('low', 'medium', 'high', 'urgent');
create type payment_status  as enum ('pending', 'partial', 'paid', 'overdue', 'refunded');
create type payment_method  as enum ('cash', 'check', 'card', 'transfer', 'other');
create type photo_type      as enum ('before', 'after', 'progress');
create type notification_type as enum ('job', 'payment', 'checklist', 'system', 'assignment');

-- =====================================================================
-- 2. USUARIOS Y EMPLEADOS
-- =====================================================================

-- 🔐 Perfil de cada usuario que inicia sesión (1:1 con auth.users de Supabase)
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,
  role        user_role not null default 'employee',
  is_active   boolean   not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 👷 Empleados de la empresa. Un empleado de campo puede existir sin login;
--    si usa la app, se enlaza con auth.users vía user_id.
create table employees (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users (id) on delete set null,
  first_name   text not null,
  last_name    text not null,
  email        text,
  phone        text,
  position     text,                      -- ej: 'Jardinero', 'Capataz'
  hourly_rate  numeric(10,2),             -- tarifa por hora para costeo
  hire_date    date,
  is_active    boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =====================================================================
-- 3. CLIENTES, PROPIEDADES Y PROYECTOS
-- =====================================================================

-- 👥 Clientes
create table clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  company_name  text,
  email         text,
  phone         text,
  billing_address text,
  notes         text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 🏡 Propiedades (una propiedad pertenece a un cliente) — 📍 incluye ubicación
create table properties (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients (id) on delete cascade,
  label       text,                       -- ej: 'Casa principal', 'Oficina'
  address     text not null,
  city        text,
  state       text,
  zip_code    text,
  latitude    numeric(9,6),               -- 📍 geolocalización
  longitude   numeric(9,6),
  size_sqft   numeric(12,2),              -- superficie del terreno
  access_notes text,                      -- ej: código de portón, dónde estacionar
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 📂 Proyectos (pertenecen a una propiedad; client_id derivado para consultas rápidas)
create table projects (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references properties (id) on delete cascade,
  client_id      uuid not null references clients (id)   on delete cascade,
  name           text not null,
  description    text,
  status         project_status not null default 'lead',
  priority       priority_level not null default 'medium',
  start_date     date,
  end_date       date,
  estimated_cost numeric(12,2),
  actual_cost    numeric(12,2),
  manager_id     uuid references employees (id) on delete set null,
  created_by     uuid references profiles (id)  on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- =====================================================================
-- 4. CALENDARIO DE TRABAJOS Y ASIGNACIONES
-- =====================================================================

-- 📅 Trabajos / visitas agendadas dentro de un proyecto
create table jobs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects (id) on delete cascade,
  title           text not null,
  description     text,
  status          job_status not null default 'scheduled',
  scheduled_start timestamptz,
  scheduled_end   timestamptz,
  actual_start    timestamptz,
  actual_end      timestamptz,
  latitude        numeric(9,6),           -- 📍 puede diferir de la propiedad
  longitude       numeric(9,6),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 👷 Asignación de empleados a trabajos (N:M)
create table job_assignments (
  job_id      uuid not null references jobs (id)      on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  role        text,                       -- ej: 'líder', 'ayudante'
  assigned_at timestamptz not null default now(),
  primary key (job_id, employee_id)
);

-- =====================================================================
-- 5. CHECKLISTS
-- =====================================================================

-- ✅ Un proyecto puede tener varias checklists
create table checklists (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now()
);

create table checklist_items (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references checklists (id) on delete cascade,
  description   text not null,
  is_completed  boolean not null default false,
  completed_by  uuid references employees (id) on delete set null,
  completed_at  timestamptz,
  sort_order    integer not null default 0
);

-- =====================================================================
-- 6. FOTOS (antes / después / progreso)
-- =====================================================================

-- 📷 Foto guardada en Supabase Storage; storage_path apunta al bucket
create table photos (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  job_id      uuid references jobs (id) on delete set null,
  type        photo_type not null default 'progress',
  storage_path text not null,             -- ruta dentro del bucket de Storage
  caption     text,
  latitude    numeric(9,6),
  longitude   numeric(9,6),
  taken_at    timestamptz,
  uploaded_by uuid references employees (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- 7. MATERIALES Y PLANTAS (catálogo + uso por proyecto)
-- =====================================================================

-- 📦 Catálogo de materiales
create table materials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  unit        text,                        -- ej: 'saco', 'm3', 'unidad'
  unit_cost   numeric(10,2),
  supplier    text,
  stock_qty   numeric(12,2) default 0,     -- inventario disponible (opcional)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Materiales usados en un proyecto (N:M con cantidad y costo congelado)
create table project_materials (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects (id)  on delete cascade,
  material_id        uuid not null references materials (id) on delete restrict,
  quantity           numeric(12,2) not null default 1,
  unit_cost_snapshot numeric(10,2),        -- costo al momento de usarlo
  notes              text,
  created_at         timestamptz not null default now()
);

-- 🌳 Catálogo de plantas
create table plants (
  id             uuid primary key default gen_random_uuid(),
  common_name    text not null,
  scientific_name text,
  category       text,                     -- ej: 'árbol', 'arbusto', 'cubresuelo'
  description    text,
  unit_cost      numeric(10,2),
  sun_exposure   text,                     -- ej: 'pleno sol', 'sombra parcial'
  water_needs    text,                     -- ej: 'bajo', 'medio', 'alto'
  image_url      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Plantas usadas/plantadas en un proyecto (N:M)
create table project_plants (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects (id) on delete cascade,
  plant_id       uuid not null references plants (id)   on delete restrict,
  quantity       integer not null default 1,
  location_notes text,                     -- dónde se plantó en la propiedad
  planted_date   date,
  created_at     timestamptz not null default now()
);

-- =====================================================================
-- 8. REGISTRO DE HORAS
-- =====================================================================

-- ⏱️ Fichaje de horas por empleado (opcionalmente ligado a un job/proyecto)
create table time_entries (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  project_id  uuid references projects (id) on delete set null,
  job_id      uuid references jobs (id)     on delete set null,
  clock_in    timestamptz not null,
  clock_out   timestamptz,
  -- horas calculadas automáticamente cuando hay clock_out
  hours       numeric(6,2) generated always as (
                case when clock_out is not null
                     then round(extract(epoch from (clock_out - clock_in)) / 3600.0, 2)
                     else null end
              ) stored,
  notes       text,
  is_approved boolean not null default false,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- 9. PAGOS
-- =====================================================================

-- 💵 Pagos / cobros asociados a un proyecto
create table payments (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects (id) on delete cascade,
  client_id      uuid not null references clients (id)  on delete cascade,
  amount         numeric(12,2) not null,
  method         payment_method,
  status         payment_status not null default 'pending',
  invoice_number text,
  due_date       date,
  paid_date      date,
  notes          text,
  created_by     uuid references profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- =====================================================================
-- 10. NOTIFICACIONES
-- =====================================================================

-- 🔔 Notificaciones dirigidas a un usuario (profile)
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  type         notification_type not null default 'system',
  title        text not null,
  body         text,
  -- referencia genérica opcional a la entidad relacionada (proyecto, job, etc.)
  related_table text,
  related_id    uuid,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- 11. ÍNDICES (claves foráneas y columnas de filtro frecuente)
-- =====================================================================
create index idx_employees_user          on employees (user_id);
create index idx_properties_client        on properties (client_id);
create index idx_projects_property        on projects (property_id);
create index idx_projects_client          on projects (client_id);
create index idx_projects_status          on projects (status);
create index idx_jobs_project             on jobs (project_id);
create index idx_jobs_scheduled_start     on jobs (scheduled_start);
create index idx_jobs_status              on jobs (status);
create index idx_job_assignments_employee on job_assignments (employee_id);
create index idx_checklists_project       on checklists (project_id);
create index idx_checklist_items_list     on checklist_items (checklist_id);
create index idx_photos_project           on photos (project_id);
create index idx_photos_job               on photos (job_id);
create index idx_project_materials_proj   on project_materials (project_id);
create index idx_project_plants_proj      on project_plants (project_id);
create index idx_time_entries_employee    on time_entries (employee_id);
create index idx_time_entries_project     on time_entries (project_id);
create index idx_payments_project         on payments (project_id);
create index idx_payments_status          on payments (status);
create index idx_notifications_recipient  on notifications (recipient_id, is_read);

-- =====================================================================
-- 12. TRIGGERS updated_at (mantiene la columna al día en cada UPDATE)
-- =====================================================================
create trigger t_profiles_updated  before update on profiles  for each row execute function extensions.moddatetime (updated_at);
create trigger t_employees_updated  before update on employees for each row execute function extensions.moddatetime (updated_at);
create trigger t_clients_updated    before update on clients    for each row execute function extensions.moddatetime (updated_at);
create trigger t_properties_updated before update on properties for each row execute function extensions.moddatetime (updated_at);
create trigger t_projects_updated   before update on projects   for each row execute function extensions.moddatetime (updated_at);
create trigger t_jobs_updated       before update on jobs       for each row execute function extensions.moddatetime (updated_at);
create trigger t_materials_updated  before update on materials  for each row execute function extensions.moddatetime (updated_at);
create trigger t_plants_updated     before update on plants     for each row execute function extensions.moddatetime (updated_at);
create trigger t_payments_updated   before update on payments   for each row execute function extensions.moddatetime (updated_at);

-- =====================================================================
-- 13. VISTAS PARA EL DASHBOARD 📈
-- =====================================================================

-- Resumen financiero y de avance por proyecto
create or replace view v_project_summary as
select
  p.id,
  p.name,
  p.status,
  c.name as client_name,
  p.estimated_cost,
  coalesce(pay.total_paid, 0)                       as total_paid,
  coalesce(hrs.total_hours, 0)                      as total_hours,
  coalesce(chk.done_items, 0)                       as checklist_done,
  coalesce(chk.total_items, 0)                      as checklist_total
from projects p
join clients c on c.id = p.client_id
left join (
  select project_id, sum(amount) as total_paid
  from payments where status = 'paid' group by project_id
) pay on pay.project_id = p.id
left join (
  select project_id, sum(hours) as total_hours
  from time_entries group by project_id
) hrs on hrs.project_id = p.id
left join (
  select cl.project_id,
         count(ci.*) filter (where ci.is_completed) as done_items,
         count(ci.*)                                as total_items
  from checklists cl
  join checklist_items ci on ci.checklist_id = cl.id
  group by cl.project_id
) chk on chk.project_id = p.id;

-- Ingresos cobrados por mes (para gráficas del dashboard)
create or replace view v_monthly_revenue as
select
  date_trunc('month', paid_date)::date as month,
  sum(amount)                          as revenue,
  count(*)                             as payments_count
from payments
where status = 'paid' and paid_date is not null
group by 1
order by 1;

-- Trabajos de hoy (agenda del día)
create or replace view v_todays_jobs as
select j.*, p.name as project_name
from jobs j
join projects p on p.id = j.project_id
where j.scheduled_start::date = current_date
order by j.scheduled_start;

-- =====================================================================
-- 14. ROW LEVEL SECURITY (punto de partida)
--     Activa RLS en todo. Política inicial: cualquier usuario autenticado
--     puede leer/escribir. LUEGO debes endurecer por rol (admin/manager/
--     employee) según tus reglas de negocio.
-- =====================================================================
alter table profiles          enable row level security;
alter table employees         enable row level security;
alter table clients           enable row level security;
alter table properties        enable row level security;
alter table projects          enable row level security;
alter table jobs              enable row level security;
alter table job_assignments   enable row level security;
alter table checklists        enable row level security;
alter table checklist_items   enable row level security;
alter table photos            enable row level security;
alter table materials         enable row level security;
alter table project_materials enable row level security;
alter table plants            enable row level security;
alter table project_plants    enable row level security;
alter table time_entries      enable row level security;
alter table payments          enable row level security;
alter table notifications     enable row level security;

-- Política de arranque (MUY permisiva — reemplazar por reglas por rol).
-- Ejemplo aplicado a cada tabla:
--   create policy "auth_all" on <tabla>
--     for all to authenticated using (true) with check (true);
-- Se deja comentado para que definas el modelo de permisos definitivo.
