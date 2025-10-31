// src/controllers/proveedoresContabilidadController.js
import { supabaseAxios } from "../services/supabaseClient.js";

/**
 * @route POST /api/trazabilidad/proveedores
 * Crea un nuevo registro de proveedor (RECIBE SOLO URLs)
 */
export const createProveedorContabilidad = async (req, res) => {
  try {
    const {
      url_rut,
      url_camara_comercio, // Opcional
      url_certificacion_bancaria,
      url_formato_vinculacion,
      url_composicion_accionaria,
    } = req.body;
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // --- ¡VALIDACIÓN ACTUALIZADA! ---
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
    
    // --- PAYLOAD ACTUALIZADO ---
    const payload = {
      user_id,
      url_rut,
      url_camara_comercio: url_camara_comercio || null, // Opcional
      url_certificacion_bancaria, // Obligatorio
      url_formato_vinculacion, // Obligatorio
      url_composicion_accionaria, // Obligatorio
    };
    
    // Se elimina 'error' de la desestructuración
    const { data } = await supabaseAxios.post(
      "/proveedores_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    res.status(201).json(data[0]);

  } catch (error) {
    // --- ¡LÓGICA DE ERROR MEJORADA! ---
    console.error("Error en createProveedorContabilidad:", error.response ? error.response.data : error.message);

    if (error.response) {
       // Error específico de Supabase
      return res
        .status(error.response.status || 400)
        .json({
          message: error.response.data?.message || "Error al guardar en la base de datos",
          details: error.response.data?.details,
        });
    }
    
    // Error genérico
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/proveedores/historial
 * (Esta función no necesita cambios)
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