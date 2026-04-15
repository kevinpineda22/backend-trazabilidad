import { supabaseAxios } from "../services/supabaseClient.js";

const TABLAS_EXPEDIENTE = {
  cliente: "clientes_contabilidad",
  empleado: "empleados_contabilidad",
  proveedor: "proveedores_contabilidad",
};

const CAMPOS_PERMITIDOS = new Set([
  // Cliente
  "url_rut",
  "url_camara_comercio",
  "url_certificado_sagrilaft",
  "url_cedula",
  "url_certificacion_bancaria",
  "url_composicion_accionaria",
  // Empleado
  "url_hoja_de_vida",
  "url_certificado_bancario",
  "url_habeas_data",
  "url_autorizacion_firma",
  "url_contrato",
  "url_eps",
  "url_pension",
  "url_arl",
  "url_caja_compensacion",
  "url_certificaciones_laborales",
  "url_certificaciones_academicas",
  "url_examen_medico",
  "url_antecedentes",
  "url_documento_identidad",
  // Proveedor
  "url_doc_identidad_rep_legal",
  "url_certificado_bolsa",
  "url_certificado_fenalce",
  "url_certificado_asohofrucol",
  "url_certificado_fedepapa",
  "url_rut_proveedor",
  "url_camara_comercio_proveedor",
  "url_cedula_proveedor",
  "url_certificacion_bancaria_proveedor",
  "url_referencias_comerciales",
]);

/**
 * @route PATCH /api/trazabilidad/documentos-versiones/reemplazar
 * Reemplaza un documento de un expediente conservando el historial.
 */
export const reemplazarDocumento = async (req, res) => {
  try {
    const {
      expediente_tipo,
      expediente_id,
      campo_documento,
      url_nueva,
      motivo,
    } = req.body;

    const user_id = req.user?.id;
    const user_email = req.user?.email;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    if (!expediente_tipo || !expediente_id || !campo_documento || !url_nueva) {
      return res.status(400).json({
        message:
          "Faltan datos requeridos: expediente_tipo, expediente_id, campo_documento, url_nueva.",
      });
    }

    if (!motivo || typeof motivo !== "string" || motivo.trim().length === 0) {
      return res.status(400).json({
        message: "El motivo del reemplazo es obligatorio.",
      });
    }

    const tablaExpediente = TABLAS_EXPEDIENTE[expediente_tipo];
    if (!tablaExpediente) {
      return res.status(400).json({
        message:
          "expediente_tipo inválido. Debe ser 'cliente', 'empleado' o 'proveedor'.",
      });
    }

    if (!CAMPOS_PERMITIDOS.has(campo_documento)) {
      return res.status(400).json({
        message: `Campo de documento no permitido: ${campo_documento}.`,
      });
    }

    // 1. Obtener la URL actual del expediente
    const { data: expedienteData } = await supabaseAxios.get(
      `/${tablaExpediente}?select=${campo_documento}&id=eq.${expediente_id}`,
    );

    if (!expedienteData || expedienteData.length === 0) {
      return res.status(404).json({ message: "Expediente no encontrado." });
    }

    const url_anterior = expedienteData[0][campo_documento];

    if (!url_anterior) {
      return res.status(400).json({
        message:
          "El expediente no tiene un documento previo en ese campo. Use la edición normal para cargar documentos nuevos.",
      });
    }

    // 2. Intentar obtener el nombre del usuario desde profiles (opcional)
    let reemplazado_por_nombre = null;
    try {
      const { data: profileData } = await supabaseAxios.get(
        `/profiles?select=nombre&id=eq.${user_id}`,
      );
      if (profileData && profileData.length > 0) {
        reemplazado_por_nombre = profileData[0].nombre || null;
      }
    } catch (_) {
      // Si profiles no existe o falla, seguimos con null
    }

    // 3. Registrar la versión en trazabilidad_documentos_versiones
    const versionPayload = {
      expediente_tipo,
      expediente_id,
      campo_documento,
      url_anterior,
      url_nueva,
      motivo: motivo.trim(),
      reemplazado_por_id: user_id,
      reemplazado_por_email: user_email || null,
      reemplazado_por_nombre,
    };

    const { data: versionData } = await supabaseAxios.post(
      "/trazabilidad_documentos_versiones",
      versionPayload,
      { headers: { Prefer: "return=representation" } },
    );

    // 4. Actualizar el expediente con la nueva URL
    await supabaseAxios.patch(
      `/${tablaExpediente}?id=eq.${expediente_id}`,
      { [campo_documento]: url_nueva },
      { headers: { Prefer: "return=representation" } },
    );

    return res.status(200).json({
      message: "Documento reemplazado correctamente.",
      version: versionData?.[0] || null,
    });
  } catch (error) {
    console.error(
      "Error en reemplazarDocumento:",
      error.response ? error.response.data : error.message,
    );
    if (error.response) {
      return res.status(error.response.status || 400).json({
        message:
          error.response.data?.message ||
          "Error al registrar el reemplazo del documento.",
        details: error.response.data?.details,
      });
    }
    return res.status(500).json({
      message: "Error interno del servidor.",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/documentos-versiones/historial/:tipo/:id
 * Lista el historial de versiones de documentos de un expediente.
 * Query opcional: ?campo=url_rut para filtrar por campo.
 */
export const getHistorialDocumento = async (req, res) => {
  try {
    const { tipo, id } = req.params;
    const { campo } = req.query;

    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    if (!TABLAS_EXPEDIENTE[tipo]) {
      return res.status(400).json({ message: "Tipo de expediente inválido." });
    }

    let url = `/trazabilidad_documentos_versiones?expediente_tipo=eq.${tipo}&expediente_id=eq.${id}&order=reemplazado_en.desc`;
    if (campo) {
      url += `&campo_documento=eq.${campo}`;
    }

    const { data } = await supabaseAxios.get(url);
    return res.status(200).json(data || []);
  } catch (error) {
    console.error(
      "Error en getHistorialDocumento:",
      error.response ? error.response.data : error.message,
    );
    return res.status(500).json({
      message: "Error interno del servidor.",
      error: error.message,
    });
  }
};
