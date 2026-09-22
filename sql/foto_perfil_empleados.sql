-- ============================================================================
--  Foto de perfil del empleado en la hoja de vida digital (2026-09-22)
-- ============================================================================
--  Correr en el proyecto PRINCIPAL de Supabase (pitpougbnibmfrjykzet), en el
--  SQL Editor, ANTES de desplegar el backend con este cambio.
--
--  Por qué el orden importa: `aprobacionesController` ahora manda
--  `url_foto_perfil` y `autoriza_uso_imagen` en el upsert a
--  `empleados_contabilidad`. Si las columnas no existen, PostgREST rechaza el
--  upsert y NINGÚN empleado se puede aprobar.
--
--  Idempotente: se puede correr más de una vez.
-- ============================================================================

-- 1. Columnas -----------------------------------------------------------------

alter table public.empleados_contabilidad
  add column if not exists url_foto_perfil text,
  add column if not exists autoriza_uso_imagen boolean;

comment on column public.empleados_contabilidad.url_foto_perfil is
  'Foto que el empleado adjuntó en autogestión. Documento del expediente.';
comment on column public.empleados_contabilidad.autoriza_uso_imagen is
  'Autorización del empleado para usar la foto en comunicaciones internas. NULL = no se le preguntó (registros anteriores al 2026-09-17).';

-- 2. Recuperar las fotos que quedaron sin registro -----------------------------
--  Desde el 2026-09-17 el formulario sube la foto a
--    documentos_contabilidad/empleados/AUTOGESTION_<cedula>/foto_perfil.jpg
--  pero el backend no la guardaba. El archivo existe; falta la referencia.
--  Solo se enlaza si el archivo EXISTE en Storage: nunca se escribe una URL que
--  daría 404. `autoriza_uso_imagen` NO se recupera: el dato se perdió, y
--  inventar un "sí" sería registrar una autorización que no consta.

-- 2a. Revisar ANTES qué se va a tocar (solo lectura):
select
  'pendiente' as origen,
  r.id,
  r.datos ->> 'cedula' as cedula,
  r.estado,
  r.created_at
from public.registros_pendientes r
where r.tipo = 'empleado'
  and coalesce(r.datos ->> 'url_foto_perfil', '') = ''
  and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'documentos_contabilidad'
      and o.name = 'empleados/AUTOGESTION_' || (r.datos ->> 'cedula') || '/foto_perfil.jpg'
  )
union all
select
  'empleado' as origen,
  e.id,
  e.cedula,
  null,
  e.created_at
from public.empleados_contabilidad e
where e.url_foto_perfil is null
  and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'documentos_contabilidad'
      and o.name = 'empleados/AUTOGESTION_' || e.cedula || '/foto_perfil.jpg'
  );

-- 2b. Registros pendientes (el JSON `datos`):
update public.registros_pendientes r
set datos = r.datos || jsonb_build_object(
  'url_foto_perfil',
  'https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/documentos_contabilidad/empleados/AUTOGESTION_'
    || (r.datos ->> 'cedula') || '/foto_perfil.jpg'
)
where r.tipo = 'empleado'
  and coalesce(r.datos ->> 'url_foto_perfil', '') = ''
  and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'documentos_contabilidad'
      and o.name = 'empleados/AUTOGESTION_' || (r.datos ->> 'cedula') || '/foto_perfil.jpg'
  );

-- 2c. Empleados ya aprobados:
update public.empleados_contabilidad e
set url_foto_perfil =
  'https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/documentos_contabilidad/empleados/AUTOGESTION_'
    || e.cedula || '/foto_perfil.jpg'
where e.url_foto_perfil is null
  and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'documentos_contabilidad'
      and o.name = 'empleados/AUTOGESTION_' || e.cedula || '/foto_perfil.jpg'
  );
