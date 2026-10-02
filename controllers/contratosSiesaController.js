// Estado del contrato en SIESA para el archivador de empleados.
//
// El archivador muestra TODA la nómina (activos y retirados), no solo a quienes
// llenaron autogestión: Johan lo pidió el 2026-10-02 para consultar contratos
// de cualquiera. El cruce por cédula se hace acá y el front recibe el contrato
// ya indexado por id de registro: si reindexara con una regla propia, podría
// divergir de `normalizarCedula`.
//
// ⚠️ Esto entrega la nómina completa (nombre, cargo, sede, fechas) a los roles
// del archivador. Nunca el motivo de retiro en la lista ni datos salariales.
import { supabaseAxios } from "../services/supabaseClient.js";
import {
  obtenerContratos,
  contratoDe,
  paraLista,
  cruzarConRegistros,
} from "../services/contratosSiesaService.js";
import { normalizarCedula } from "../services/empleadosSiesaService.js";

// Igual que el panel de fotos: sin esto, una consulta no asignada o una
// variable faltante se ven exactamente igual que SIESA caído.
const responderError = (res, error) => {
  console.error("Error consultando contratos en SIESA:", error?.message || error);
  if (error?.faltantes?.length) {
    return res.status(500).json({
      message: `El servidor no tiene configurado el acceso a SIESA. Faltan: ${error.faltantes.join(", ")}.`,
      motivo: "configuracion",
    });
  }
  const httpSiesa = error?.response?.status;
  return res.status(502).json({
    message: "No se pudo consultar el estado de los contratos en SIESA.",
    motivo: error?.esDeConnekta ? "connekta" : "red",
    detalle: error?.esDeConnekta
      ? error.message
      : `${error?.code || "fallo"}${httpSiesa ? ` (HTTP ${httpSiesa})` : ""}: ${error?.message || ""}`.trim(),
  });
};

const forzar = (req) => req.query.forzar === "1" || req.query.forzar === "true";

/**
 * @route GET /api/trazabilidad/admin/contratos-empleados
 * {
 *   contratos:   { [empleadoId]: contrato | null },  // null = no está en SIESA
 *   sinRegistro: contrato[],  // en SIESA, sin formulario de autogestión
 *   actualizado
 * }
 */
export const listarContratosEmpleados = async (req, res) => {
  try {
    const [{ data: empleados, error }, siesa] = await Promise.all([
      supabaseAxios.get(`/empleados_contabilidad?select=id,cedula`),
      obtenerContratos({ forzar: forzar(req) }),
    ]);
    if (error) throw error;

    const { porRegistro, sinRegistro } = cruzarConRegistros(siesa.contratos, empleados || []);
    return res.json({ contratos: porRegistro, sinRegistro, actualizado: siesa.actualizado });
  } catch (error) {
    // Un fallo de Supabase no es "SIESA caído": se dice cuál de los dos fue.
    if (error?.config?.url?.includes("empleados_contabilidad")) {
      return res.status(500).json({ message: "No se pudieron leer los empleados registrados." });
    }
    return responderError(res, error);
  }
};

/**
 * @route GET /api/trazabilidad/admin/contrato-empleado/:id
 * { contrato: contrato | null, actualizado }
 * Incluye el motivo de retiro, salvo para Tesorería: de la Hoja de Vida solo
 * ve el certificado bancario y la cédula.
 */
export const obtenerContratoEmpleado = async (req, res) => {
  try {
    const { data, error } = await supabaseAxios.get(
      `/empleados_contabilidad?select=cedula&id=eq.${encodeURIComponent(req.params.id)}`,
    );
    if (error) throw error;
    const empleado = data?.[0];
    if (!empleado) return res.status(404).json({ message: "Empleado no encontrado." });

    const siesa = await obtenerContratos({ forzar: forzar(req) });
    let contrato = contratoDe(siesa.contratos, empleado.cedula);
    if (contrato && req.user?.role === "admin_tesoreria") contrato = paraLista(contrato);

    return res.json({ contrato, actualizado: siesa.actualizado });
  } catch (error) {
    return responderError(res, error);
  }
};

/**
 * @route GET /api/trazabilidad/admin/contrato-cedula/:cedula
 * Detalle para quien está en SIESA pero no llenó autogestión (no tiene id de
 * registro). Misma regla de motivo de retiro que el detalle por registro.
 */
export const obtenerContratoPorCedula = async (req, res) => {
  const cedula = normalizarCedula(req.params.cedula);
  if (!/^[0-9]{3,15}$/.test(cedula)) {
    return res.status(400).json({ message: "Cédula inválida." });
  }
  try {
    const siesa = await obtenerContratos({ forzar: forzar(req) });
    let contrato = contratoDe(siesa.contratos, cedula);
    if (contrato && req.user?.role === "admin_tesoreria") contrato = paraLista(contrato);
    return res.json({ contrato, actualizado: siesa.actualizado });
  } catch (error) {
    return responderError(res, error);
  }
};
