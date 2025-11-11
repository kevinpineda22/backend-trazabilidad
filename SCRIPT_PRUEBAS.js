// PRUEBA RÁPIDA DEL SISTEMA
// Copia estos comandos en la consola del navegador para probar

/* ============================================
   PRUEBA 1: Generar un Token (requiere login)
   ============================================ */

// Obtén tu token JWT del localStorage
const miToken = localStorage.getItem('token');

// Genera un token de empleado
fetch('http://localhost:3000/api/trazabilidad/tokens/generar', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${miToken}`
  },
  body: JSON.stringify({
    tipo: 'empleado' // o 'cliente' o 'proveedor'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Token generado:', data);
  console.log('🔗 Link de registro:', data.url_registro);
  // Copia el url_registro y ábrelo en otra ventana
});

/* ============================================
   PRUEBA 2: Validar un Token (público, no requiere login)
   ============================================ */

// Reemplaza TOKEN_AQUI con el token que obtuviste en la prueba anterior
const tokenParaValidar = 'TOKEN_AQUI';

fetch(`http://localhost:3000/api/trazabilidad/tokens/validar/${tokenParaValidar}`)
.then(res => res.json())
.then(data => {
  console.log('✅ Validación del token:', data);
  // Debe devolver: { valido: true, tipo: 'empleado', message: 'Token válido.' }
});

/* ============================================
   PRUEBA 3: Listar Tokens Generados (requiere login)
   ============================================ */

fetch('http://localhost:3000/api/trazabilidad/tokens/listar', {
  headers: {
    'Authorization': `Bearer ${miToken}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Tokens generados:', data);
  console.table(data); // Muestra en tabla bonita
});

/* ============================================
   PRUEBA 4: Registrar un Empleado (público, no requiere login)
   ============================================ */

// Reemplaza TOKEN_AQUI con tu token
const tokenDeRegistro = 'TOKEN_AQUI';

fetch(`http://localhost:3000/api/trazabilidad/registro-publico/empleado/${tokenDeRegistro}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    nombre: 'Juan',
    apellidos: 'Pérez García',
    cedula: '1234567890',
    contacto: '3001234567',
    correo_electronico: 'juan.perez@email.com',
    direccion: 'Calle 123 #45-67',
    codigo_ciudad: '11001',
    url_hoja_de_vida: 'https://drive.google.com/file/d/123abc',
    url_cedula: 'https://drive.google.com/file/d/456def',
    url_certificado_bancario: 'https://drive.google.com/file/d/789ghi',
    url_habeas_data: 'https://drive.google.com/file/d/012jkl'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Registro enviado:', data);
  // Debe devolver: { message: 'Registro enviado. Está pendiente de aprobación.' }
});

/* ============================================
   PRUEBA 5: Ver Registros Pendientes (requiere login)
   ============================================ */

fetch('http://localhost:3000/api/trazabilidad/aprobaciones/pendientes', {
  headers: {
    'Authorization': `Bearer ${miToken}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Registros pendientes:', data);
  console.table(data);
  // Guarda el ID del primer registro para la siguiente prueba
  if (data.length > 0) {
    console.log('📝 ID del primer registro:', data[0].id);
  }
});

/* ============================================
   PRUEBA 6: Aprobar un Registro (requiere login)
   ============================================ */

// Reemplaza ID_REGISTRO con el ID que obtuviste en la prueba anterior
const idRegistroParaAprobar = 'ID_REGISTRO';

fetch(`http://localhost:3000/api/trazabilidad/aprobaciones/aprobar/${idRegistroParaAprobar}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${miToken}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Registro aprobado:', data);
  // El registro ahora debería aparecer en empleados_contabilidad
});

/* ============================================
   PRUEBA 7: Rechazar un Registro (requiere login)
   ============================================ */

const idRegistroParaRechazar = 'ID_REGISTRO';

fetch(`http://localhost:3000/api/trazabilidad/aprobaciones/rechazar/${idRegistroParaRechazar}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${miToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    motivo: 'Documentos incompletos'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Registro rechazado:', data);
});

/* ============================================
   PRUEBA 8: Ver Historial (requiere login)
   ============================================ */

fetch('http://localhost:3000/api/trazabilidad/aprobaciones/historial', {
  headers: {
    'Authorization': `Bearer ${miToken}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Historial de aprobaciones:', data);
  console.table(data);
});

/* ============================================
   VERIFICACIÓN EN SUPABASE
   ============================================ */

// Después de las pruebas, verifica en Supabase:

// 1. Ver tokens generados:
/*
SELECT * FROM tokens_registro ORDER BY created_at DESC;
*/

// 2. Ver registros pendientes:
/*
SELECT 
  id,
  tipo,
  estado,
  datos->>'nombre' as nombre,
  datos->>'cedula' as cedula,
  created_at
FROM registros_pendientes 
ORDER BY created_at DESC;
*/

// 3. Ver empleados creados:
/*
SELECT * FROM empleados_contabilidad ORDER BY created_at DESC;
*/

// 4. Estadísticas:
/*
SELECT 
  tipo,
  estado,
  COUNT(*) as cantidad
FROM registros_pendientes
GROUP BY tipo, estado;
*/

/* ============================================
   NOTAS IMPORTANTES
   ============================================ */

/*
✅ FLUJO CORRECTO:
1. Generar token (Prueba 1)
2. Copiar el link generado
3. Abrir link en ventana privada/incógnito
4. Completar formulario (o usar Prueba 4)
5. Ver en pendientes (Prueba 5)
6. Aprobar (Prueba 6)
7. Verificar en SuperAdmin

⚠️ IMPORTANTE:
- Los tokens expiran en 3 días
- Cada token solo se puede usar una vez
- El registro va a "pendientes", no directo a la tabla principal
- Después de aprobar, el registro se crea en la tabla correspondiente

🔧 TROUBLESHOOTING:
- Si dice "Token inválido": Verifica que el token existe en la BD
- Si dice "Token ya usado": Genera un nuevo token
- Si dice "Token expirado": El token tiene más de 3 días
- Si no ves pendientes: Verifica que el registro se envió correctamente

📱 PRUEBA DESDE EL NAVEGADOR:
1. Ve a http://localhost:5173/gestion-tokens
2. Click en "Generar Link Empleado"
3. Copia el link
4. Ábrelo en ventana incógnito
5. Completa el formulario
6. Ve a http://localhost:5173/aprobaciones
7. Aprueba el registro
8. Ve a SuperAdmin y verifica que aparece
*/

console.log('🚀 Script de pruebas cargado. Sigue las instrucciones arriba.');
