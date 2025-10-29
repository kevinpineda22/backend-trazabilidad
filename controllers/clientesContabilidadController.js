import { supabaseAxios } from "../services/supabaseClient.js";

// === LÓGICA DE SUBIDA DE ARCHIVOS ELIMINADA. EL FRONTEND ENVÍA LAS URLS. ===

/**
 * @route POST /api/trazabilidad/clientes
 * Crea un nuevo registro de cliente (RECIBE SOLO URL y datos de texto)
 */
export const createClienteContabilidad = async (req, res) => {
  try {
    const { url_rut, razon_social, nit } = req.body;
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    if (!url_rut) {
      return res
        .status(400)
        .json({ message: "La URL del RUT es obligatoria." });
    }
    const payload = {
      user_id,
      url_rut,
      razon_social: razon_social || null,
      nit: nit || null,
    };
    const { data, error } = await supabaseAxios.post(
      "/clientes_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );
    if (error) {
      console.error("Error al guardar cliente en Supabase:", error);
      if (error.response?.data?.code === "23505") {
        return res
          .status(409)
          .json({
            message: "Error: Ya existe un cliente con ese NIT.",
            details: error.response.data.details,
          });
      }
      return res.status(400).json({
        message: error.message || "Error al guardar en la base de datos",
        details: error.details || error,
      });
    }
    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error en createClienteContabilidad:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/clientes/historial
 * Obtiene el historial de clientes.
 */
export const getHistorialClientes = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    const { data, error } = await supabaseAxios.get(
      `/clientes_contabilidad?select=*,profiles(nombre)&user_id=eq.${user_id}&order=created_at.desc`
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialClientes:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};
