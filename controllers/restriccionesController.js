// Restricciones del empleado. Ver services/restriccionesService.js.
import {
  obtenerRestricciones,
  guardarRestricciones,
  validarTexto,
  llaveCedula,
  ConflictoVersion,
} from "../services/restriccionesService.js";

// Si las tablas no existen todavía (SQL sin correr), PostgREST responde 404 o
// "relation does not exist". Se dice así, en vez de un 500 genérico.
const faltaTabla = (error) => {
  const texto = JSON.stringify(error?.response?.data || "");
  return error?.response?.status === 404 || /does not exist|PGRST205/.test(texto);
};

const responderError = (res, error, accion) => {
  console.error(`Error al ${accion} restricciones:`, error?.response?.data || error?.message);
  if (faltaTabla(error)) {
    return res.status(503).json({
      message: "Las observaciones todavía no están habilitadas (falta correr sql/restricciones_empleados.sql).",
    });
  }
  return res.status(500).json({ message: `No se pudieron ${accion} las observaciones.` });
};

/** @route GET /api/trazabilidad/admin/restricciones/:cedula */
export const verRestricciones = async (req, res) => {
  const cedula = llaveCedula(req.params.cedula);
  if (!cedula) return res.status(400).json({ message: "Cédula inválida." });
  try {
    return res.json(await obtenerRestricciones(cedula));
  } catch (error) {
    return responderError(res, error, "consultar");
  }
};

/**
 * @route PUT /api/trazabilidad/admin/restricciones/:cedula
 * body: { restricciones: string, versionAnterior: string|null }
 * 409 = otra persona guardó mientras tanto; trae `actual` para mostrarlo.
 */
export const actualizarRestricciones = async (req, res) => {
  const cedula = llaveCedula(req.params.cedula);
  if (!cedula) return res.status(400).json({ message: "Cédula inválida." });

  const validacion = validarTexto(req.body?.restricciones);
  if (!validacion.ok) return res.status(400).json({ message: validacion.mensaje });

  try {
    const guardada = await guardarRestricciones({
      cedula,
      texto: validacion.texto,
      versionAnterior: req.body?.versionAnterior || null,
      usuario: { id: req.user?.id, nombre: req.user?.nombre || req.user?.email },
    });
    return res.json(guardada);
  } catch (error) {
    if (error instanceof ConflictoVersion) {
      return res.status(409).json({ message: error.message, actual: error.actual });
    }
    return responderError(res, error, "guardar");
  }
};
