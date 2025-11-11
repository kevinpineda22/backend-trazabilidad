# CHECKLIST DE IMPLEMENTACIÓN
# Sistema de Aprobación con Tokens

## ✅ BACKEND

### Archivos Creados
- [x] controllers/tokensController.js
- [x] controllers/aprobacionesController.js
- [x] controllers/registroPublicoController.js
- [x] routes/tokensRoutes.js
- [x] routes/aprobacionesRoutes.js
- [x] routes/registroPublicoRoutes.js

### Modificaciones en Archivos Existentes
- [x] app.js - Importar nuevas rutas
- [x] app.js - Agregar uso de rutas

### Base de Datos (Supabase)
- [ ] Ejecutar database_schema.sql en Supabase SQL Editor
- [ ] Verificar que tabla 'tokens_registro' existe
- [ ] Verificar que tabla 'registros_pendientes' existe
- [ ] Verificar que políticas RLS estén activas

### Variables de Entorno
- [ ] FRONTEND_URL configurada en .env (opcional)
- [ ] SUPABASE_URL configurada
- [ ] SUPABASE_KEY configurada

---

## ✅ FRONTEND

### Componentes Creados
- [x] trazabilidad_contabilidad/GestionTokens.jsx
- [x] trazabilidad_contabilidad/GestionTokens.css
- [x] trazabilidad_contabilidad/PanelAprobaciones.jsx
- [x] trazabilidad_contabilidad/PanelAprobaciones.css
- [x] trazabilidad_contabilidad/RegistroPublico.jsx
- [x] trazabilidad_contabilidad/RegistroPublico.css

### Integración en Router
- [ ] Importar componentes en archivo de rutas
- [ ] Agregar ruta /gestion-tokens (protegida)
- [ ] Agregar ruta /aprobaciones (protegida)
- [ ] Agregar ruta /registro/:tipo/:token (pública)

### Navegación
- [ ] Agregar botones/links al menú principal
- [ ] Agregar acceso desde SuperAdminContabilidad

### Variables de Entorno
- [ ] VITE_API_URL configurada en .env

---

## 🧪 PRUEBAS

### Prueba 1: Generar Token
1. [ ] Ir a /gestion-tokens
2. [ ] Click en "Generar Link Empleado"
3. [ ] Verificar que aparece en la lista
4. [ ] Verificar que estado es "activo"
5. [ ] Copiar el link

### Prueba 2: Registro Público
1. [ ] Abrir el link en navegador privado (sin sesión)
2. [ ] Verificar que muestra formulario de empleado
3. [ ] Completar todos los campos
4. [ ] Enviar formulario
5. [ ] Verificar mensaje de éxito
6. [ ] Intentar acceder nuevamente al link
7. [ ] Verificar que dice "token ya usado"

### Prueba 3: Aprobación
1. [ ] Ir a /aprobaciones
2. [ ] Verificar que aparece el registro en "Pendientes"
3. [ ] Click en "Aprobar"
4. [ ] Verificar mensaje de éxito
5. [ ] Ir a SuperAdminContabilidad
6. [ ] Verificar que el empleado aparece en la tabla

### Prueba 4: Rechazo
1. [ ] Generar nuevo token para cliente
2. [ ] Completar registro desde el link
3. [ ] Ir a /aprobaciones
4. [ ] Click en "Rechazar"
5. [ ] Escribir motivo de rechazo
6. [ ] Confirmar rechazo
7. [ ] Ir a tab "Historial"
8. [ ] Verificar que aparece como rechazado

### Prueba 5: Token Expirado
1. [ ] En Supabase, actualizar un token:
   ```sql
   UPDATE tokens_registro
   SET expiracion = NOW() - INTERVAL '1 day'
   WHERE id = 'algún-id';
   ```
2. [ ] Intentar acceder al link
3. [ ] Verificar que dice "token expirado"

---

## 📊 VERIFICACIÓN DE DATOS

### Verificar Tokens en Base de Datos
```sql
SELECT 
  id,
  tipo,
  usado,
  expiracion,
  created_at,
  CASE 
    WHEN usado THEN 'usado'
    WHEN expiracion < NOW() THEN 'expirado'
    ELSE 'activo'
  END as estado
FROM tokens_registro
ORDER BY created_at DESC;
```

### Verificar Registros Pendientes
```sql
SELECT 
  id,
  tipo,
  estado,
  datos->>'nombre' as nombre,
  datos->>'cedula' as cedula,
  created_at
FROM registros_pendientes
ORDER BY created_at DESC;
```

### Verificar Aprobaciones
```sql
SELECT 
  tipo,
  estado,
  COUNT(*) as cantidad
FROM registros_pendientes
GROUP BY tipo, estado;
```

---

## 🐛 TROUBLESHOOTING

### Error: "Token no encontrado"
- Verificar que la tabla tokens_registro existe
- Verificar que el token está en la base de datos
- Verificar políticas RLS

### Error: "Error al guardar en base de datos"
- Verificar que registros_pendientes existe
- Verificar que las columnas JSONB están bien formadas
- Revisar logs del backend

### Error: CORS
- Verificar corsConfig.js
- Agregar origen del frontend en whitelist

### Error: "Usuario no autenticado"
- Verificar que el token JWT está en localStorage
- Verificar que authMiddleware funciona correctamente

### Los registros aprobados no aparecen en SuperAdmin
- Verificar que el campo user_id se está guardando
- Verificar que las queries en adminController incluyen los nuevos registros

---

## 📚 DOCUMENTACIÓN ADICIONAL

- README_SISTEMA_APROBACION.md - Documentación completa
- EJEMPLO_INTEGRACION.js - Ejemplos de uso
- database_schema.sql - Script SQL con comentarios

---

## 🚀 DEPLOYMENT

### Vercel (Backend)
- [ ] Variables de entorno configuradas
- [ ] vercel.json actualizado (si es necesario)

### Frontend (Vercel/Netlify/etc)
- [ ] VITE_API_URL apuntando a producción
- [ ] Build exitoso
- [ ] Rutas funcionando correctamente

---

## ✨ MEJORAS FUTURAS

- [ ] Notificaciones email al aprobar/rechazar
- [ ] Dashboard de estadísticas
- [ ] Sistema de comentarios
- [ ] Exportar a Excel
- [ ] Renovar tokens expirados
- [ ] QR codes para los links

---

## 📝 NOTAS

- Los tokens tienen validez de 3 días
- Los registros pendientes se almacenan en JSONB
- Las URLs de documentos deben ser públicas
- El sistema soporta múltiples tokens activos simultáneamente
- Los tokens usados no se pueden reutilizar

---

## ✅ COMPLETADO

Una vez hayas verificado todos los items, tu sistema estará completamente funcional.

Para probar rápidamente todo:
1. Ejecuta el SQL en Supabase
2. Reinicia el backend
3. Accede a /gestion-tokens
4. Genera un token
5. Abre el link en otra ventana
6. Completa el formulario
7. Aprueba desde /aprobaciones
8. Verifica en SuperAdmin

¡Listo! 🎉
