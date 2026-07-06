-- Ajuste cosmético del texto del pago: horas sin ".0" innecesario.

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
      || ' por '
      || case when g.hours = floor(g.hours)
              then to_char(g.hours, 'FM999990')
              else to_char(g.hours, 'FM999990.9') end
      || ' h.',
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
