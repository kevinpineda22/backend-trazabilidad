# Sistema de Aprobación con Tokens de Registro

## 📋 Descripción

Sistema completo de gestión de registros con aprobación previa. Permite generar links únicos con tokens temporales para que terceros (empleados, clientes o proveedores) se auto-registren. Los registros pasan por un proceso de aprobación antes de ser agregados al sistema principal.

## ✨ Características Principales

### 🔐 Gestión de Tokens
- Generación de tokens únicos con validez de 3 días
- Links de un solo uso (se invalidan después del registro)
- Diferenciación por tipo: empleado, cliente, proveedor
- Seguimiento completo de tokens generados

### 📝 Registro Público
- Formularios públicos accesibles mediante token
- Validación automática de tokens (expiración y uso)
- Interfaz amigable para diferentes tipos de registro
- Soporte para URLs de documentos

### ✅ Panel de Aprobaciones
- Vista de registros pendientes de aprobación
- Aprobación o rechazo con motivo
- Historial completo de decisiones
- Vista previa de documentos adjuntos

### 🔄 Flujo de Trabajo

```
1. Usuario genera token → Link se copia
2. Link se envía a tercero → Tercero completa formulario
3. Registro queda pendiente → Aparece en Panel de Aprobaciones
4. Se aprueba el registro → Se crea en tabla principal (SuperAdmin)
```

## 🛠️ Instalación

### Backend

1. **Ejecutar el script SQL en Supabase:**
   ```sql
   -- Ejecuta el archivo database_schema.sql en el editor SQL de Supabase
   ```

2. **Verificar las rutas en app.js:**
   ```javascript
   app.use(`${apiBase}/tokens`, tokensRoutes);
   app.use(`${apiBase}/aprobaciones`, aprobacionesRoutes);
   app.use(`${apiBase}/registro-publico`, registroPublicoRoutes);
   ```

3. **Configurar variable de entorno (opcional):**
   ```env
   FRONTEND_URL=https://tu-dominio.com
   ```

### Frontend

1. **Importar componentes en tu router:**
   ```javascript
   import GestionTokens from './trazabilidad_contabilidad/GestionTokens';
   import PanelAprobaciones from './trazabilidad_contabilidad/PanelAprobaciones';
   import RegistroPublico from './trazabilidad_contabilidad/RegistroPublico';
   ```

2. **Agregar rutas:**
   ```javascript
   // Rutas protegidas (requieren autenticación)
   <Route path="/gestion-tokens" element={<GestionTokens />} />
   <Route path="/aprobaciones" element={<PanelAprobaciones />} />
   
   // Ruta pública (sin autenticación)
   <Route path="/registro/:tipo/:token" element={<RegistroPublico />} />
   ```

## 📡 Endpoints del API

### Tokens

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/trazabilidad/tokens/generar` | ✅ | Genera un nuevo token |
| GET | `/api/trazabilidad/tokens/listar` | ✅ | Lista tokens del usuario |
| GET | `/api/trazabilidad/tokens/validar/:token` | ❌ | Valida un token (público) |

### Aprobaciones

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/trazabilidad/aprobaciones/pendientes` | ✅ | Obtiene registros pendientes |
| POST | `/api/trazabilidad/aprobaciones/aprobar/:id` | ✅ | Aprueba un registro |
| POST | `/api/trazabilidad/aprobaciones/rechazar/:id` | ✅ | Rechaza un registro |
| GET | `/api/trazabilidad/aprobaciones/historial` | ✅ | Obtiene historial completo |

### Registro Público

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/trazabilidad/registro-publico/empleado/:token` | ❌ | Registro de empleado |
| POST | `/api/trazabilidad/registro-publico/cliente/:token` | ❌ | Registro de cliente |
| POST | `/api/trazabilidad/registro-publico/proveedor/:token` | ❌ | Registro de proveedor |

## 💡 Uso

### 1. Generar Token

```javascript
// Desde el componente GestionTokens
// Click en "Generar Link Empleado/Cliente/Proveedor"
// El sistema genera automáticamente:
// - Token único de 64 caracteres
// - URL completa: https://tu-sitio.com/registro/empleado/abc123...
// - Validez de 3 días
```

### 2. Compartir Link

```
Copia el link generado y envíalo a la persona que debe registrarse.
El link tiene el formato:
https://tu-sitio.com/registro/{tipo}/{token}
```

### 3. Registro Externo

```
La persona accede al link y completa el formulario.
Al enviar, el registro queda "pendiente" de aprobación.
El token se marca como "usado" automáticamente.
```

### 4. Aprobar/Rechazar

```
En el Panel de Aprobaciones:
- Revisa los datos y documentos
- Aprueba: El registro se crea en la tabla principal
- Rechaza: Proporciona un motivo (opcional)
```

## 🗄️ Estructura de Base de Datos

### Tabla: `tokens_registro`
```sql
- id (UUID, PK)
- token (VARCHAR, UNIQUE)
- tipo (empleado|cliente|proveedor)
- expiracion (TIMESTAMP)
- usado (BOOLEAN)
- fecha_uso (TIMESTAMP)
- generado_por (UUID, FK → auth.users)
- created_at (TIMESTAMP)
```

### Tabla: `registros_pendientes`
```sql
- id (UUID, PK)
- tipo (empleado|cliente|proveedor)
- estado (pendiente|aprobado|rechazado)
- user_id (UUID, FK → auth.users)
- token (VARCHAR)
- datos (JSONB) ← Almacena todo el formulario
- aprobado_por (UUID, FK → auth.users)
- fecha_aprobacion (TIMESTAMP)
- rechazado_por (UUID, FK → auth.users)
- motivo_rechazo (TEXT)
- fecha_rechazo (TIMESTAMP)
- created_at (TIMESTAMP)
```

## 🔒 Seguridad

- **Tokens únicos**: Imposible de predecir (32 bytes aleatorios)
- **Expiración automática**: 3 días de validez
- **Un solo uso**: Se invalidan después del primer registro
- **RLS activado**: Políticas de seguridad en Supabase
- **Validación de tipo**: El token debe coincidir con el tipo de formulario

## 🎨 Componentes Frontend

### `GestionTokens.jsx`
- Generación de tokens por tipo
- Listado de tokens creados
- Estado visual (activo/usado/expirado)
- Copiar link al portapapeles

### `PanelAprobaciones.jsx`
- Tab de pendientes y historial
- Tarjetas con información del registro
- Botones de aprobar/rechazar
- Modal para motivo de rechazo
- Preview de documentos

### `RegistroPublico.jsx`
- Validación automática del token
- Formularios específicos por tipo
- Mensajes de error/éxito
- Interfaz sin autenticación

## 🚀 Próximas Mejoras (Opcionales)

- [ ] Notificaciones por email al aprobar/rechazar
- [ ] Exportar registros pendientes a Excel
- [ ] Dashboard con estadísticas de aprobaciones
- [ ] Sistema de comentarios en registros pendientes
- [ ] Renovación de tokens expirados
- [ ] Firma digital para aprobaciones

## 📞 Soporte

Para dudas o problemas:
1. Revisa los logs del backend en consola
2. Verifica que las tablas existan en Supabase
3. Confirma que las políticas RLS estén activas
4. Valida que el token esté en el formato correcto

## 📄 Licencia

Este sistema es parte del proyecto de Trazabilidad de Contabilidad.
