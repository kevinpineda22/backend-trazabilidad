// src/controllers/proveedoresContabilidadController.js
import { supabaseAxios } from "../services/supabaseClient.js";

/**
 * @route POST /api/trazabilidad/proveedores
 * (Esta función no se modifica)
 */
export const createProveedorContabilidad = async (req, res) => {
  try {
    const {
      url_rut,
      url_camara_comercio,
      url_certificacion_bancaria,
      url_formato_vinculacion,
      url_composicion_accionaria,
    } = req.body;
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Validación (Cámara de Comercio es opcional)
    if (
      !url_rut ||
      !url_certificacion_bancaria ||
      !url_formato_vinculacion ||
      !url_composicion_accionaria
    ) {
      return res.status(400).json({
        message:
          "Faltan URLs de documentos obligatorios (RUT, Cert. Bancaria, Vinculación y Comp. Accionaria).",
      });
    }

    const payload = {
      user_id,
      url_rut,
      url_camara_comercio: url_camara_comercio || null,
      url_certificacion_bancaria,
      url_formato_vinculacion,
      url_composicion_accionaria,
    };

    const { data } = await supabaseAxios.post(
      "/proveedores_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error en createProveedorContabilidad:", error.response ? error.response.data : error.message);
    if (error.response) {
      return res.status(error.response.status || 400).json({
        message:
          error.response.data?.message || "Error al guardar en la base de datos",
        details: error.response.data?.details,
      });
    }
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/proveedores/historial
 * (Esta función no se modifica)
 */
export const getHistorialProveedores = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    const { data, error } = await supabaseAxios.get(
      `/proveedores_contabilidad?select=*,profiles(nombre)&user_id=eq.${user_id}&order=created_at.desc`
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialProveedores:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route PATCH /api/trazabilidad/proveedores/:id
 * ¡NUEVA FUNCIÓN! Actualiza un registro de proveedor.
 */
export const updateProveedorContabilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    if (!id) {
      return res.status(400).json({ message: "No se proporcionó un ID para actualizar." });
    }

    // Obtenemos campos del body
    const {
      url_rut,
      url_camara_comercio,
      url_certificacion_bancaria,
      url_formato_vinculacion,
      url_composicion_accionaria,
    } = req.body;

    // Payload dinámico
    const payload = {};
    if (url_rut !== undefined) payload.url_rut = url_rut;
    if (url_camara_comercio !== undefined) payload.url_camara_comercio = url_camara_comercio;
    if (url_certificacion_bancaria !== undefined) payload.url_certificacion_bancaria = url_certificacion_bancaria;
    if (url_formato_vinculacion !== undefined) payload.url_formato_vinculacion = url_formato_vinculacion;
    if (url_composicion_accionaria !== undefined) payload.url_composicion_accionaria = url_composicion_accionaria;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: "No se proporcionaron datos para actualizar." });
    }

    // Filtro por ID y user_id
    const { data } = await supabaseAxios.patch(
      `/proveedores_contabilidad?id=eq.${id}&user_id=eq.${user_id}`,
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado o no tiene permiso para editarlo." });
    }

    res.status(200).json(data[0]);

  } catch (error) {
    console.error("Error en updateProveedorContabilidad:", error.response ? error.response.data : error.message);
    if (error.response) {
      return res.status(error.response.status || 400).json({
        message:
          error.response.data?.message || "Error al actualizar la base de datos",
        details: error.response.data?.details,
      });
    }
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};