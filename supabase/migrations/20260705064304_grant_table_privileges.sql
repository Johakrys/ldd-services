-- =====================================================================
--  LDD Services — Privilegios de tabla para los roles de la API
--
--  La RLS filtra FILAS, pero el rol primero necesita privilegios de TABLA
--  (GRANT) para poder tocarla. Nuestras tablas se crearon sin estos grants,
--  así que 'authenticated' no podía leer/escribir nada. Aquí los otorgamos
--  y fijamos privilegios por defecto para tablas futuras.
-- =====================================================================

grant usage on schema public to authenticated, service_role;

-- Objetos existentes
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all routines in schema public to authenticated, service_role;

-- Objetos futuros (creados por el rol de migraciones)
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public
  grant execute on routines to authenticated, service_role;
