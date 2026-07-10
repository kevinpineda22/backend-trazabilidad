-- =====================================================================
-- ARCHIVADOR DE EXPEDIENTES
-- Carpetas y archivos dinámicos por expediente (cliente/empleado/proveedor).
-- Convive con los documentos fijos existentes; NO los reemplaza.
--
-- Correr una sola vez en el SQL Editor de Supabase.
-- =====================================================================

-- 1. Carpetas del archivador -------------------------------------------------
create table if not exists public.expediente_carpetas (
  id               uuid primary key default gen_random_uuid(),
  expediente_tipo  text not null check (expediente_tipo in ('cliente', 'empleado', 'proveedor')),
  expediente_id    uuid not null,
  nombre           text not null,
  created_by       uuid,
  created_at       timestamptz not null default now()
);

comment on table public.expediente_carpetas is
  'Carpetas dinámicas del archivador de cada expediente (ej. "2026", "Contratos").';

-- Buscar carpetas de un expediente puntual es la consulta más frecuente.
create index if not exists idx_carpetas_expediente
  on public.expediente_carpetas (expediente_tipo, expediente_id);

-- 2. Archivos dentro de cada carpeta -----------------------------------------
create table if not exists public.expediente_archivos (
  id           uuid primary key default gen_random_uuid(),
  carpeta_id   uuid not null references public.expediente_carpetas (id) on delete cascade,
  nombre       text not null,
  url_archivo  text not null,
  uploaded_by  uuid,
  created_at   timestamptz not null default now()
);

comment on table public.expediente_archivos is
  'Archivos guardados dentro de una carpeta del archivador. Borrar la carpeta borra sus archivos (cascade).';

-- Listar los archivos de una carpeta.
create index if not exists idx_archivos_carpeta
  on public.expediente_archivos (carpeta_id);

-- 3. RLS ---------------------------------------------------------------------
-- El backend accede con la Service Role Key (bypass de RLS), igual que el resto
-- de tablas del módulo. Habilitamos RLS sin políticas para bloquear el acceso
-- directo con la clave anónima desde el navegador.
alter table public.expediente_carpetas enable row level security;
alter table public.expediente_archivos enable row level security;
