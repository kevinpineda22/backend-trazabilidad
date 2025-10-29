import { supabaseAxios } from "../services/supabaseClient.js";

// === LÓGICA DE SUBIDA DE ARCHIVOS ELIMINADA. EL FRONTEND ENVÍA LAS URLS. ===

/**
 * @route POST /api/trazabilidad/proveedores
 * Crea un nuevo registro de proveedor (RECIBE SOLO URLs)
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
    if (!url_rut || !url_camara_comercio || !url_certificacion_bancaria) {
      return res
        .status(400)
        .json({
          message:
            "Faltan URLs de documentos obligatorios (RUT, Cámara de Comercio, Certificación Bancaria).",
        });
    }
    const payload = {
      user_id,
      url_rut,
      url_camara_comercio,
      url_certificacion_bancaria,
      url_formato_vinculacion: url_formato_vinculacion || null,
      url_composicion_accionaria: url_composicion_accionaria || null,
    };
    const { data, error } = await supabaseAxios.post(
      "/proveedores_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );
    if (error) {
      console.error("Error al guardar proveedor en Supabase:", error);
      return res
        .status(400)
        .json({
          message: error.message || "Error al guardar en la base de datos",
          details: error.details,
        });
    }
    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error en createProveedorContabilidad:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/proveedores/historial
 * Obtiene el historial de proveedores.
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
