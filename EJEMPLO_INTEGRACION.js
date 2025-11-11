// EJEMPLO DE INTEGRACIÓN EN TU APP PRINCIPAL
// Este archivo muestra cómo integrar los nuevos componentes

/* ============================================
   1. EJEMPLO DE ROUTER (React Router v6)
   ============================================ */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SuperAdminContabilidad from './trazabilidad_contabilidad/SuperAdminContabilidad';
import GestionTokens from './trazabilidad_contabilidad/GestionTokens';
import PanelAprobaciones from './trazabilidad_contabilidad/PanelAprobaciones';
import RegistroPublico from './trazabilidad_contabilidad/RegistroPublico';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas protegidas (con autenticación) */}
        <Route path="/admin" element={<SuperAdminContabilidad />} />
        <Route path="/gestion-tokens" element={<GestionTokens />} />
        <Route path="/aprobaciones" element={<PanelAprobaciones />} />
        
        {/* Ruta pública (sin autenticación) */}
        <Route path="/registro/:tipo/:token" element={<RegistroPublico />} />
      </Routes>
    </BrowserRouter>
  );
}

/* ============================================
   2. AGREGAR NAVEGACIÓN EN SIDEBAR/MENÚ
   ============================================ */

// Ejemplo de botones en tu SuperAdminContabilidad o componente de navegación

<div className="menu-navegacion">
  <button onClick={() => navigate('/aprobaciones')}>
    📋 Panel de Aprobaciones
  </button>
  <button onClick={() => navigate('/gestion-tokens')}>
    🔗 Gestión de Links
  </button>
  <button onClick={() => navigate('/admin')}>
    👥 SuperAdmin
  </button>
</div>

/* ============================================
   3. FLUJO RECOMENDADO DE USO
   ============================================ */

/*
PASO 1: Usuario va a "Gestión de Links"
  - Click en "Generar Link Empleado"
  - Sistema genera: https://tu-sitio.com/registro/empleado/abc123...
  - Copia el link

PASO 2: Envía el link por email/WhatsApp
  - La persona externa accede al link
  - Completa el formulario de registro
  - Al enviar, el registro queda "pendiente"

PASO 3: Usuario va a "Panel de Aprobaciones"
  - Ve la tarjeta del nuevo registro
  - Revisa la información y documentos
  - Click en "Aprobar" o "Rechazar"

PASO 4: Si aprueba
  - El registro se crea automáticamente en:
    * empleados_contabilidad
    * clientes_contabilidad
    * proveedores_contabilidad
  - Ahora aparece en SuperAdminContabilidad

RESULTADO: Ya no hay que crear directamente desde CreacionEmpleado.jsx
            Todo pasa primero por aprobación.
*/

/* ============================================
   4. MODIFICAR COMPONENTES EXISTENTES (OPCIONAL)
   ============================================ */

// Si quieres deshabilitar la creación directa en tus componentes actuales:

// En CreacionSubirEmpleado.jsx
const CreacionSubirEmpleado = () => {
  return (
    <div>
      <p className="aviso-aprobacion">
        ⚠️ Nota: Los registros ahora requieren aprobación previa.
        Por favor, usa la "Gestión de Links" para generar un link de registro.
      </p>
      {/* El formulario puede quedar deshabilitado o redirigir a GestionTokens */}
    </div>
  );
};

/* ============================================
   5. VARIABLES DE ENTORNO
   ============================================ */

// En tu archivo .env (Frontend)
/*
VITE_API_URL=http://localhost:3000
*/

// En tu archivo .env (Backend)
/*
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=tu_supabase_url
SUPABASE_KEY=tu_supabase_key
*/

/* ============================================
   6. EJEMPLO DE LLAMADA API DESDE OTRO COMPONENTE
   ============================================ */

// Si necesitas verificar registros pendientes desde otro lugar:

import axios from 'axios';

const verificarPendientes = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/trazabilidad/aprobaciones/pendientes`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    const cantidadPendientes = response.data.length;
    console.log(`Hay ${cantidadPendientes} registros pendientes de aprobación`);
    
    // Puedes mostrar un badge en el menú:
    // <span className="badge-notificacion">{cantidadPendientes}</span>
    
  } catch (error) {
    console.error('Error:', error);
  }
};

/* ============================================
   7. PERSONALIZACIÓN DE ESTILOS
   ============================================ */

// Los archivos CSS están listos, pero puedes personalizarlos:
// - GestionTokens.css
// - PanelAprobaciones.css
// - RegistroPublico.css

// Ejemplo de sobrescritura de colores:
/*
:root {
  --color-primario: #667eea;
  --color-exito: #28a745;
  --color-error: #dc3545;
  --color-warning: #ffc107;
}
*/

export default App;
