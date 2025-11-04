// src/controllers/clientesContabilidadController.js
import { supabaseAxios } from "../services/supabaseClient.js";

/**
 * @route POST /api/trazabilidad/clientes
 * (Esta función no se modifica)
 */
export const createClienteContabilidad = async (req, res) => {
  try {
    const {
      url_rut,
      cupo,
      plazo,
      url_camara_comercio,
      url_formato_merkahorro,
      url_cedula,
    } = req.body;

    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    if (
      !url_rut ||
      !cupo ||
      !plazo ||
      !url_camara_comercio ||
      !url_formato_merkahorro ||
      !url_cedula
    ) {
      return res.status(400).json({
        message: "Todos los campos de texto y documentos son obligatorios.",
      });
    }

    const payload = {
      user_id,
      cupo,
      plazo,
      url_rut,
      url_camara_comercio,
      url_formato_merkahorro,
      url_cedula,
      created_at: new Date().toISOString(),
    };

    const { data } = await supabaseAxios.post(
      "/clientes_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    res.status(201).json(data[0]);
  } catch (error) {
    console.error(
      "Error en createClienteContabilidad:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      return res.status(error.response.status || 400).json({
        message:
          error.response.data?.message || "Error al guardar en la base de datos",
        details: error.response.data?.details || error,
      });
    }
    res.status(500).json({
      message: "Error interno del servidor.",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/clientes/historial
 * (Esta función no se modifica)
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

/**
 * @route PATCH /api/trazabilidad/clientes/:id
 * ¡NUEVA FUNCIÓN! Actualiza un registro de cliente.
 */
export const updateClienteContabilidad = async (req, res) => {
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
      cupo,
      plazo,
      url_rut,
      url_camara_comercio,
      url_formato_merkahorro,
      url_cedula,
    } = req.body;

    // Payload dinámico
    const payload = {};
    if (cupo !== undefined) payload.cupo = cupo;
    if (plazo !== undefined) payload.plazo = plazo;
    if (url_rut !== undefined) payload.url_rut = url_rut;
    if (url_camara_comercio !== undefined) payload.url_camara_comercio = url_camara_comercio;
    if (url_formato_merkahorro !== undefined) payload.url_formato_merkahorro = url_formato_merkahorro;
    if (url_cedula !== undefined) payload.url_cedula = url_cedula;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: "No se proporcionaron datos para actualizar." });
    }

    // Filtro por ID y user_id
    const { data } = await supabaseAxios.patch(
      `/clientes_contabilidad?id=eq.${id}&user_id=eq.${user_id}`,
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado o no tiene permiso para editarlo." });
    }

    res.status(200).json(data[0]);

  } catch (error) {
    console.error("Error en updateClienteContabilidad:", error.response ? error.response.data : error.message);
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