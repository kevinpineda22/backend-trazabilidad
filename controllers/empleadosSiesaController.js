// Nómina activa para el panel de fotos de empleados.
//
// ⚠️ Esto devuelve datos personales de TODA la nómina (nombre, ingreso,
// contrato). `authMiddleware` solo prueba que quien llama tiene sesión, y
// cualquiera de los usuarios de la app la tiene. Por eso acá se exige, además,
// el mismo permiso que abre el panel de fotos: tener `/fotos-empleados` en
// `personal_routes`.
//
// Esa regla está escrita también en la Edge Function `fotos-empleados` del
// proyecto de fotos. Si cambia allá, cambia acá.
import { supabaseAxios } from "../services/supabaseClient.js";
import { obtenerEmpleadosActivos } from "../services/empleadosSiesaService.js";

const RUTA_PANEL = "/fotos-empleados";

const tienePermisoDeFotos = async (userId) => {
  const { data } = await supabaseAxios.get(
    `/profiles?user_id=eq.${userId}&select=role,personal_routes`,
  );
  const perfil = data?.[0];
  if (!perfil) return false;
  if (perfil.role === "super_admin") return true;
  const rutas = Array.isArray(perfil.personal_routes) ? perfil.personal_routes : [];
  return rutas.some((r) => r?.path === RUTA_PANEL);
};

/**
 * @route GET /api/trazabilidad/empleados-siesa
 * Devuelve la nómina activa indexada por cédula (sin ceros a la izquierda).
 * `?forzar=1` salta el caché de 15 minutos.
 */
export const listarEmpleadosActivos = async (req, res) => {
  try {
    if (!(await tienePermisoDeFotos(req.user?.id))) {
      return res.status(403).json({
        message: "Sin permiso para consultar la nómina. Se requiere acceso al panel de fotos.",
      });
    }

    const resultado = await obtenerEmpleadosActivos({
      forzar: req.query.forzar === "1" || req.query.forzar === "true",
    });

    return res.json(resultado);
  } catch (error) {
    console.error("Error consultando la nómina en SIESA:", error?.message || error);

    // Configuración incompleta: se dice cuál falta. Sin esto, un despliegue sin
    // una variable se ve exactamente igual que SIESA caído, y se busca el
    // problema donde no está.
    if (error?.faltantes?.length) {
      return res.status(500).json({
        message: `El servidor no tiene configurado el acceso a SIESA. Faltan: ${error.faltantes.join(", ")}.`,
        motivo: "configuracion",
      });
    }
    // El panel funciona sin estos datos (muestra las fotos igual), así que el
    // mensaje explica que es un extra que falló, no que se cayó el panel.
    //
    // `detalle` lleva lo que respondió Connekta (su código y su mensaje) o el
    // estado HTTP. No hay secretos ahí, y sin eso un "no se pudo consultar"
    // obliga a adivinar entre una consulta no asignada a la conniKey, SIESA
    // caído o la red. Ese fue justo el caso del 2026-09-22.
    const httpSiesa = error?.response?.status;
    return res.status(502).json({
      message:
        "No se pudo consultar la nómina en SIESA. Las fotos se siguen viendo, pero sin los datos del empleado.",
      motivo: error?.esDeConnekta ? "connekta" : "red",
      detalle: error?.esDeConnekta
        ? error.message
        : `${error?.code || "fallo"}${httpSiesa ? ` (HTTP ${httpSiesa})` : ""}: ${error?.message || ""}`.trim(),
    });
  }
};
