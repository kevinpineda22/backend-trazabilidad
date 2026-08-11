-- ============================================================================
--  Evidencia de consentimiento SAGRILAFT para clientes y proveedores
-- ============================================================================
--
--  Contexto: hasta ahora la aceptación de cláusulas era un checkbox de UI que
--  nunca se persistía. Sin estas columnas el comprobante descargable no tiene
--  respaldo: afirmaría una aceptación que no está registrada en ninguna parte.
--
--  Ejecutar una sola vez en el SQL Editor de Supabase.
--  Es idempotente: se puede correr de nuevo sin romper nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Clientes
-- ---------------------------------------------------------------------------
ALTER TABLE public.clientes_contabilidad
  ADD COLUMN IF NOT EXISTS acepta_habeas_data              boolean,
  ADD COLUMN IF NOT EXISTS acepta_firma_digital            boolean,
  ADD COLUMN IF NOT EXISTS acepta_origen_fondos            boolean,
  ADD COLUMN IF NOT EXISTS consentimiento_clausulas        jsonb,
  ADD COLUMN IF NOT EXISTS consentimiento_bundle_version   text,
  ADD COLUMN IF NOT EXISTS consentimiento_fecha            timestamptz,
  ADD COLUMN IF NOT EXISTS consentimiento_ip               text,
  ADD COLUMN IF NOT EXISTS consentimiento_user_agent       text,
  ADD COLUMN IF NOT EXISTS consentimiento_token            text,
  ADD COLUMN IF NOT EXISTS consentimiento_hash             text;

-- ---------------------------------------------------------------------------
-- 2. Proveedores
-- ---------------------------------------------------------------------------
ALTER TABLE public.proveedores_contabilidad
  ADD COLUMN IF NOT EXISTS acepta_habeas_data              boolean,
  ADD COLUMN IF NOT EXISTS acepta_firma_digital            boolean,
  ADD COLUMN IF NOT EXISTS acepta_origen_fondos            boolean,
  ADD COLUMN IF NOT EXISTS consentimiento_clausulas        jsonb,
  ADD COLUMN IF NOT EXISTS consentimiento_bundle_version   text,
  ADD COLUMN IF NOT EXISTS consentimiento_fecha            timestamptz,
  ADD COLUMN IF NOT EXISTS consentimiento_ip               text,
  ADD COLUMN IF NOT EXISTS consentimiento_user_agent       text,
  ADD COLUMN IF NOT EXISTS consentimiento_token            text,
  ADD COLUMN IF NOT EXISTS consentimiento_hash             text;

-- ---------------------------------------------------------------------------
-- 3. Comentarios de documentación
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.clientes_contabilidad.consentimiento_hash IS
  'SHA-256 que sella cláusulas + textos + identidad + fecha + IP + token. Si no coincide al recalcularlo, el registro fue alterado después de la aceptación.';
COMMENT ON COLUMN public.clientes_contabilidad.consentimiento_clausulas IS
  'Arreglo [{clave, version, aceptada}]. La versión permite reconstruir el texto exacto que la contraparte aceptó.';
COMMENT ON COLUMN public.proveedores_contabilidad.consentimiento_hash IS
  'SHA-256 que sella cláusulas + textos + identidad + fecha + IP + token. Si no coincide al recalcularlo, el registro fue alterado después de la aceptación.';
COMMENT ON COLUMN public.proveedores_contabilidad.consentimiento_clausulas IS
  'Arreglo [{clave, version, aceptada}]. La versión permite reconstruir el texto exacto que la contraparte aceptó.';

-- ---------------------------------------------------------------------------
-- 4. Índices para auditoría
--    Permiten responder "¿quiénes NO tienen consentimiento registrado?" sin
--    recorrer la tabla completa.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clientes_consentimiento_fecha
  ON public.clientes_contabilidad (consentimiento_fecha);
CREATE INDEX IF NOT EXISTS idx_proveedores_consentimiento_fecha
  ON public.proveedores_contabilidad (consentimiento_fecha);

-- ---------------------------------------------------------------------------
-- 5. Verificación posterior a la ejecución
-- ---------------------------------------------------------------------------
-- SELECT column_name, data_type
--   FROM information_schema.columns
--  WHERE table_name = 'clientes_contabilidad'
--    AND column_name LIKE 'consentimiento%' OR column_name LIKE 'acepta_%';
