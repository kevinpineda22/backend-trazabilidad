// src/controllers/clientesContabilidadController.js
import { supabaseAxios } from "../services/supabaseClient.js";

/**
 * @route POST /api/trazabilidad/clientes
 * Crea un nuevo registro de cliente (RECIBE SOLO URL y datos de texto)
 */
export const createClienteContabilidad = async (req, res) => {
  try {
    const { url_rut } = req.body;
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    if (!url_rut) {
      return res.status(400).json({ message: "La URL del RUT es obligatoria." });
    }
    const payload = {
      user_id,
      url_rut,
      created_at: new Date().toISOString(),
    };
    
    // Se elimina 'error' de la desestructuración
    const { data } = await supabaseAxios.post(
      "/clientes_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    res.status(201).json(data[0]);

  } catch (error) {
    // --- ¡LÓGICA DE ERROR CORREGIDA! ---
    console.error("Error en createClienteContabilidad:", error);
    
    if (error.response) {
      // Error específico de Supabase
      return res.status(error.response.status || 400).json({
        message:
          error.response.data?.message || "Error al guardar en la base de datos",
        details: error.response.data?.details || error,
      });
    }

    // Error genérico
    res.status(500).json({
      message: "Error interno del servidor.",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/clientes/historial
 * (Esta función no necesita cambios)
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