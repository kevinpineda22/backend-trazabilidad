-- ============================================================================
--  Autorización de uso de foto — 5 empleados sin dato (2026-09-30)
-- ============================================================================
--  CONTEXTO: estas 5 fotos de autogestión se recuperaron el 2026-09-22 con
--  foto_perfil_empleados.sql. En ese momento el formulario perdía la respuesta
--  de la casilla, así que `autoriza_uso_imagen` quedó en NULL (no consta).
--
--  ORIGEN DE LA AUTORIZACIÓN: Gestión Humana habló con las 5 personas y
--  autorizaron el uso de su fotografía en comunicaciones internas. Lo confirmó
--  Johan Sánchez el 2026-09-30. NO vino del formulario.
--
--  El `autoriza_uso_imagen is null` del WHERE evita pisar una respuesta que
--  el empleado haya dado después por otro camino.
--
--  DESPUÉS de correr esto, enviar las fotos al banco (desde backendTrazabilidad):
--    node tools/enviarFotosAutogestionAlBanco.js --aplicar --cedulas=1039198181,1104407244,21856310,70326649,75059896
-- ============================================================================

-- 1. Revisar ANTES (solo lectura): deben salir exactamente estas 5 filas.
select cedula, nombre, apellidos, autoriza_uso_imagen
from public.empleados_contabilidad
where id in (
  '4c498d40-320d-4873-bea1-850c4081267c', -- JUAN PABLO RINCON ABELLO
  '8ecf305a-f926-47e0-b9d2-f770be0cc62b', -- LUIS ALBERTO ARRIETA AMBROSIO
  '21f38ab3-08bc-41e7-a3fa-15a90d934876', -- LINA MARIA VELÁSQUEZ PARDO
  '2e81c0a6-e573-4682-9a67-440bdfd227e8', -- GIOVANNY ANTONIO VILLA CARMONA
  '9d079e98-8f87-4159-9be8-d61d25d4a0bf'  -- DAGOBER VALENCIA CASTAÑEDA
)
  and autoriza_uso_imagen is null;

-- 2. Marcar la autorización.
update public.empleados_contabilidad
set autoriza_uso_imagen = true
where id in (
  '4c498d40-320d-4873-bea1-850c4081267c',
  '8ecf305a-f926-47e0-b9d2-f770be0cc62b',
  '21f38ab3-08bc-41e7-a3fa-15a90d934876',
  '2e81c0a6-e573-4682-9a67-440bdfd227e8',
  '9d079e98-8f87-4159-9be8-d61d25d4a0bf'
)
  and autoriza_uso_imagen is null
returning cedula, nombre, apellidos, autoriza_uso_imagen;
