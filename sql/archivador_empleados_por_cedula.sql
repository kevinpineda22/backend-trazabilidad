-- =====================================================================
-- ARCHIVADOR DE EMPLEADOS POR CÉDULA
--
-- Antes, la carpeta de un empleado colgaba del id de su registro de
-- autogestión (empleados_contabilidad.id). Eso dejaba sin archivador a todos
-- los que solo están en SIESA, que es la mayoría de los retirados. Y a un
-- retirado que pide un certificado un año después hay que encontrarle los
-- papeles.
--
-- Ahora las carpetas de empleados cuelgan de la CÉDULA normalizada (solo
-- dígitos, sin ceros a la izquierda; igual que normalizarCedula() del
-- backend). Así una persona tiene UN solo archivador: aunque no haya llenado
-- autogestión, o aunque la llene de nuevo y le quede otro id.
-- Clientes y proveedores no cambian: siguen por expediente_id.
--
-- Correr UNA vez en el SQL Editor de Supabase, ANTES de desplegar el backend.
-- =====================================================================

-- 0. Revisar primero (no modifica nada). Carpetas de empleado cuya cédula no
--    se puede resolver. Si devuelve filas, corregir la cédula del registro
--    antes de seguir: el paso 3 falla mientras queden carpetas sin cédula.
-- select c.id, c.nombre, c.expediente_id, e.cedula
-- from public.expediente_carpetas c
-- left join public.empleados_contabilidad e on e.id = c.expediente_id
-- where c.expediente_tipo = 'empleado'
--   and coalesce(regexp_replace(e.cedula, '\D', '', 'g'), '') = '';

begin;

-- 1. Columna nueva; expediente_id deja de ser obligatorio.
alter table public.expediente_carpetas
  add column if not exists cedula text;

alter table public.expediente_carpetas
  alter column expediente_id drop not null;

-- 2. Pasar las carpetas existentes de empleados a su cédula.
update public.expediente_carpetas c
set cedula = coalesce(
      nullif(ltrim(regexp_replace(e.cedula, '\D', '', 'g'), '0'), ''),
      nullif(regexp_replace(e.cedula, '\D', '', 'g'), '')
    ),
    expediente_id = null
from public.empleados_contabilidad e
where c.expediente_tipo = 'empleado'
  and c.expediente_id = e.id
  and nullif(regexp_replace(e.cedula, '\D', '', 'g'), '') is not null;

-- 3. Empleados: siempre por cédula. Clientes y proveedores: siempre por id.
--    Si queda alguna carpeta de empleado sin migrar, esto falla y el
--    rollback deja todo como estaba (ver el paso 0).
alter table public.expediente_carpetas
  drop constraint if exists expediente_carpetas_llave_chk;

alter table public.expediente_carpetas
  add constraint expediente_carpetas_llave_chk check (
    case
      when expediente_tipo = 'empleado'
        then cedula is not null and expediente_id is null
      else expediente_id is not null and cedula is null
    end
  );

create index if not exists idx_carpetas_cedula
  on public.expediente_carpetas (cedula)
  where cedula is not null;

commit;
