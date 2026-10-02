// Estado del contrato en SIESA para el archivador de empleados.
//
// Solo se devuelve el contrato de quienes están registrados en
// `empleados_contabilidad`, indexado por el id del registro. Así el front no
// recibe la nómina entera (1.660 personas con retirados) ni tiene que volver a
// normalizar cédulas con una regla propia que pueda divergir de la de acá.
import { supabaseAxios } from "../services/supabaseClient.js";
import { obtenerContratos, contratoDe, paraLista } from "../services/contratosSiesaService.js";

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
 * { contratos: { [empleadoId]: contrato | null }, actualizado }
 * `null` = SIESA respondió y esa cédula no tiene contrato.
 */
export const listarContratosEmpleados = async (req, res) => {
  try {
    const [{ data: empleados, error }, siesa] = await Promise.all([
      supabaseAxios.get(`/empleados_contabilidad?select=id,cedula`),
      obtenerContratos({ forzar: forzar(req) }),
    ]);
    if (error) throw error;

    const contratos = {};
    for (const emp of empleados || []) {
      contratos[emp.id] = paraLista(contratoDe(siesa.contratos, emp.cedula));
    }
    return res.json({ contratos, actualizado: siesa.actualizado });
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
