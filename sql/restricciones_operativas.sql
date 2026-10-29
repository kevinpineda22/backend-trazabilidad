-- ============================================================================
--  Restricción OPERATIVA del empleado (visible para líderes) (2026-10-29)
-- ============================================================================
--  Correr en el proyecto PRINCIPAL de Supabase (pitpougbnibmfrjykzet), en el
--  SQL Editor, DESPUÉS de restricciones_empleados.sql y ANTES de desplegar el
--  backend con este cambio. Sin las columnas, leer y guardar las restricciones
--  de la Hoja de Vida falla.
--
--  Qué es: una versión corta (máx. 500 caracteres) de la limitación de trabajo,
--  por ejemplo "no levantar más de 10 kg". La escribe Talento Humano de forma
--  explícita, separada del texto libre `restricciones`.
--
--  ⚠️ NO debe contener diagnósticos ni información médica (Ley 1581): el texto
--  libre `restricciones` sigue siendo solo para Talento Humano; esta columna es
--  la única que se expone fuera de ese rol.
--
--  Idempotente: se puede correr más de una vez.
-- ============================================================================

alter table public.empleados_restricciones
  add column if not exists restriccion_operativa text not null default '';

alter table public.empleados_restricciones_historial
  add column if not exists restriccion_operativa text not null default '';

comment on column public.empleados_restricciones.restriccion_operativa is
  'Limitación de trabajo visible para líderes (máx. 500 caracteres). Sin diagnósticos.';
