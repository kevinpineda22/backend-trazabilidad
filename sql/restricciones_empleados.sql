-- ============================================================================
--  Restricciones del empleado en la Hoja de Vida Digital (2026-10-02)
-- ============================================================================
--  Correr en el proyecto PRINCIPAL de Supabase (pitpougbnibmfrjykzet), en el
--  SQL Editor, ANTES de desplegar el backend con este cambio. Sin las tablas,
--  la sección "Restricciones" muestra un error al abrir la Hoja de Vida (el
--  resto de la pantalla funciona igual).
--
--  Por qué por CÉDULA y no como columna de empleados_contabilidad: el archivador
--  muestra también a quienes están en SIESA y nunca llenaron autogestión (no
--  tienen fila en empleados_contabilidad), y una restricción no debe perderse
--  si la persona vuelve a registrarse. La cédula se guarda normalizada como la
--  compara el backend: solo dígitos, sin ceros a la izquierda.
--
--  ⚠️ Suelen ser restricciones médicas o laborales: dato sensible (Ley 1581).
--  RLS activo y SIN políticas: solo el backend (service role) lee y escribe.
--
--  Idempotente: se puede correr más de una vez.
-- ============================================================================

create table if not exists public.empleados_restricciones (
  cedula                 text primary key,
  restricciones          text not null default '',
  actualizado_por        uuid,
  actualizado_por_nombre text,
  updated_at             timestamptz not null default now()
);

comment on table public.empleados_restricciones is
  'Restricciones vigentes del empleado (texto libre). Una fila por cédula normalizada.';

-- Cada guardado deja una copia: quién escribió qué y cuándo. Una restricción
-- que se levanta y vuelve a aparecer no se pierde al editar el texto.
create table if not exists public.empleados_restricciones_historial (
  id                     bigint generated always as identity primary key,
  cedula                 text not null,
  restricciones          text not null,
  actualizado_por        uuid,
  actualizado_por_nombre text,
  created_at             timestamptz not null default now()
);

create index if not exists empleados_restricciones_historial_cedula_idx
  on public.empleados_restricciones_historial (cedula, created_at desc);

alter table public.empleados_restricciones enable row level security;
alter table public.empleados_restricciones_historial enable row level security;
