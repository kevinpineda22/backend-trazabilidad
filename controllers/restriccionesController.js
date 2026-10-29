// Restricciones del empleado. Ver services/restriccionesService.js.
import {
  obtenerRestricciones,
  guardarRestricciones,
  validarTexto,
  validarTextoOperativo,
  llaveCedula,
  ConflictoVersion,
} from "../services/restriccionesService.js";

// Si las tablas no existen todavía (SQL sin correr), PostgREST responde 404 o
// "relation does not exist". Se dice así, en vez de un 500 genérico.
const faltaTabla = (error) => {
  const texto = JSON.stringify(error?.response?.data || "");
  return error?.response?.status === 404 || /does not exist|PGRST205/.test(texto);
};

// Columna `restriccion_operativa` ausente (sql/restricciones_operativas.sql sin correr).
// Se evalúa antes que faltaTabla: "does not exist" también aparece en este caso.
const faltaColumnaOperativa = (error) => {
  const data = error?.response?.data;
  return data?.code === "42703" || /restriccion_operativa/.test(JSON.stringify(data || ""));
};

const responderError = (res, error, accion) => {
  console.error(`Error al ${accion} restricciones:`, error?.response?.data || error?.message);
  if (faltaColumnaOperativa(error)) {
    return res.status(503).json({
      message: "La restricción operativa todavía no está habilitada (falta correr sql/restricciones_operativas.sql).",
    });
  }
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
 * body: { restricciones: string, restriccionOperativa?: string, versionAnterior: string|null }
 * `restriccionOperativa` omitida = se conserva el valor actual.
 * 409 = otra persona guardó mientras tanto; trae `actual` para mostrarlo.
 */
export const actualizarRestricciones = async (req, res) => {
  const cedula = llaveCedula(req.params.cedula);
  if (!cedula) return res.status(400).json({ message: "Cédula inválida." });

  const validacion = validarTexto(req.body?.restricciones);
  if (!validacion.ok) return res.status(400).json({ message: validacion.mensaje });

  let textoOperativo;
  if (req.body?.restriccionOperativa !== undefined) {
    const operativa = validarTextoOperativo(req.body.restriccionOperativa);
    if (!operativa.ok) return res.status(400).json({ message: operativa.mensaje });
    textoOperativo = operativa.texto;
  }

  try {
    const guardada = await guardarRestricciones({
      cedula,
      texto: validacion.texto,
      textoOperativo,
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
