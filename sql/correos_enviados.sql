-- =====================================================================
-- REGISTRO DE CORREOS ENVIADOS
--
-- Hasta ahora un correo que fallaba (contraseña SMTP vencida, variable de
-- destinatario vacía, Outlook que lo rechaza) solo dejaba un console.error en
-- Vercel, y nadie del equipo tiene acceso a esos logs. El registro se aprobaba
-- igual y nadie se enteraba de que el encargado nunca recibió el aviso.
--
-- Cada intento de envío deja UNA fila: enviado, fallido (con el error) o
-- sin_destinatario (la variable de entorno no está configurada). La Hoja de
-- Vida Digital muestra las de cada empleado.
--
-- "enviado" = Outlook lo aceptó. No prueba que llegó a la bandeja (spam,
-- reglas del buzón): para eso está el seguimiento de mensajes de Microsoft 365.
--
-- Correr UNA vez en el SQL Editor de Supabase. Si el backend se despliega
-- antes, los correos salen igual: solo falla (y se loguea) la escritura acá.
-- =====================================================================

create table if not exists public.correos_enviados (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  -- registro_recibido | registro_aprobado | usuario_siesa | entidad_creada | aviso_tesoreria
  evento text not null,
  entidad_tipo text check (entidad_tipo in ('empleado', 'cliente', 'proveedor')),
  -- Cédula o NIT normalizado (solo dígitos, sin ceros a la izquierda).
  documento text,
  destinatarios text,
  asunto text,
  estado text not null check (estado in ('enviado', 'fallido', 'sin_destinatario')),
  error text,
  message_id text
);

create index if not exists correos_enviados_documento_idx
  on public.correos_enviados (entidad_tipo, documento, creado_en desc);

-- Solo el backend (service key) lee y escribe. Sin políticas = el navegador no
-- puede tocarla con la clave pública.
alter table public.correos_enviados enable row level security;
