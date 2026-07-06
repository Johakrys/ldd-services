-- =====================================================================
--  Notificaciones automáticas:
--   1) Cuando se asigna una tarea a un empleado.
--   2) Cuando se le marca un pago (time_entries pasa a pagado).
--  Insertan filas en public.notifications para el usuario destinatario;
--  la app móvil las convierte en notificaciones locales.
-- =====================================================================

-- 1) Tarea asignada -----------------------------------------------------
create or replace function public.notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid;
  v_title text;
begin
  select user_id into v_user from public.employees where id = NEW.employee_id;
  if v_user is null then
    return NEW;
  end if;
  select title into v_title from public.jobs where id = NEW.job_id;

  insert into public.notifications (recipient_id, type, title, body, related_table, related_id)
  values (v_user, 'assignment', 'Nueva tarea asignada', coalesce(v_title, ''), 'jobs', NEW.job_id);

  return NEW;
end;
$function$;

drop trigger if exists trg_notify_task_assigned on public.job_assignments;
create trigger trg_notify_task_assigned
after insert on public.job_assignments
for each row execute function public.notify_task_assigned();

-- 2) Pago realizado -----------------------------------------------------
--  Trigger a nivel de sentencia: al marcar varias filas como pagadas en un
--  solo UPDATE, genera UNA notificación por empleado con el total.
create or replace function public.notify_payment()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.notifications (recipient_id, type, title, body, related_table)
  select
    e.user_id,
    'payment',
    'Pago recibido',
    'Se te pagó $' || to_char(g.hours * coalesce(r.hourly_rate, 0), 'FM999990.00')
      || ' por ' || to_char(g.hours, 'FM999990.9') || ' h.',
    'time_entries'
  from (
    select n.employee_id, sum(n.hours) as hours
    from newtab n
    join oldtab o on o.id = n.id
    where n.is_paid = true
      and coalesce(o.is_paid, false) = false
      and n.hours is not null
    group by n.employee_id
  ) g
  join public.employees e on e.id = g.employee_id
  left join public.employee_rates r on r.employee_id = g.employee_id
  where e.user_id is not null;

  return null;
end;
$function$;

drop trigger if exists trg_notify_payment on public.time_entries;
create trigger trg_notify_payment
after update on public.time_entries
referencing old table as oldtab new table as newtab
for each statement execute function public.notify_payment();
