-- Script SQL para crear las tablas necesarias en Supabase
-- Ejecuta este script en el editor SQL de Supabase

-- ============================================
-- Tabla: tokens_registro
-- Almacena los tokens de registro temporales
-- ============================================
CREATE TABLE IF NOT EXISTS tokens_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('empleado', 'cliente', 'proveedor')),
  expiracion TIMESTAMP WITH TIME ZONE NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  fecha_uso TIMESTAMP WITH TIME ZONE,
  generado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens_registro(token);
CREATE INDEX IF NOT EXISTS idx_tokens_usado ON tokens_registro(usado);
CREATE INDEX IF NOT EXISTS idx_tokens_tipo ON tokens_registro(tipo);
CREATE INDEX IF NOT EXISTS idx_tokens_generado_por ON tokens_registro(generado_por);

-- ============================================
-- Tabla: registros_pendientes
-- Almacena los registros que esperan aprobación
-- ============================================
CREATE TABLE IF NOT EXISTS registros_pendientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('empleado', 'cliente', 'proveedor')),
  estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token VARCHAR(255) NOT NULL,
  datos JSONB NOT NULL,
  aprobado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  rechazado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  motivo_rechazo TEXT,
  fecha_rechazo TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_registros_estado ON registros_pendientes(estado);
CREATE INDEX IF NOT EXISTS idx_registros_tipo ON registros_pendientes(tipo);
CREATE INDEX IF NOT EXISTS idx_registros_user_id ON registros_pendientes(user_id);
CREATE INDEX IF NOT EXISTS idx_registros_created_at ON registros_pendientes(created_at DESC);

-- ============================================
-- Políticas de seguridad (RLS - Row Level Security)
-- ============================================

-- Habilitar RLS en las tablas
ALTER TABLE tokens_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_pendientes ENABLE ROW LEVEL SECURITY;

-- Políticas para tokens_registro
-- Los usuarios autenticados pueden insertar tokens
CREATE POLICY "Usuarios autenticados pueden crear tokens"
  ON tokens_registro
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = generado_por);

-- Los usuarios pueden ver sus propios tokens
CREATE POLICY "Usuarios pueden ver sus tokens"
  ON tokens_registro
  FOR SELECT
  TO authenticated
  USING (auth.uid() = generado_por);

-- Permitir validación pública de tokens (solo lectura específica)
CREATE POLICY "Validación pública de tokens"
  ON tokens_registro
  FOR SELECT
  TO anon
  USING (true);

-- Permitir actualización de tokens (marcar como usado)
CREATE POLICY "Sistema puede actualizar tokens"
  ON tokens_registro
  FOR UPDATE
  TO authenticated, anon
  USING (true);

-- Políticas para registros_pendientes
-- Cualquiera puede insertar registros pendientes (para registro público)
CREATE POLICY "Inserción pública de registros"
  ON registros_pendientes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Los usuarios autenticados pueden ver todos los registros pendientes
CREATE POLICY "Usuarios autenticados ven registros pendientes"
  ON registros_pendientes
  FOR SELECT
  TO authenticated
  USING (true);

-- Los usuarios autenticados pueden actualizar registros (aprobar/rechazar)
CREATE POLICY "Usuarios autenticados actualizan registros"
  ON registros_pendientes
  FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- Comentarios para documentación
-- ============================================
COMMENT ON TABLE tokens_registro IS 'Almacena tokens temporales para registro de empleados, clientes y proveedores';
COMMENT ON TABLE registros_pendientes IS 'Almacena registros que requieren aprobación antes de ser añadidos a las tablas principales';

COMMENT ON COLUMN tokens_registro.token IS 'Token único de 64 caracteres hexadecimales';
COMMENT ON COLUMN tokens_registro.tipo IS 'Tipo de registro: empleado, cliente o proveedor';
COMMENT ON COLUMN tokens_registro.expiracion IS 'Fecha y hora de expiración del token (3 días después de creación)';
COMMENT ON COLUMN tokens_registro.usado IS 'Indica si el token ya fue utilizado';

COMMENT ON COLUMN registros_pendientes.datos IS 'Datos del registro en formato JSON';
COMMENT ON COLUMN registros_pendientes.estado IS 'Estado del registro: pendiente, aprobado o rechazado';
