// src/controllers/empleadosContabilidadController.js

import { supabaseAxios, storageClient } from "../services/supabaseClient.js";

/**
 * @route POST /api/trazabilidad/empleados
 * (Esta función no se modifica)
 */
export const createEmpleadoContabilidad = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res
        .status(401)
        .json({ message: "Usuario no autenticado para trazar la creación." });
    }

    const {
      nombre,
      apellidos,
      cedula,
      contacto,
      correo_electronico,
      direccion,
      codigo_ciudad,
      url_hoja_de_vida,
      url_cedula,
      url_certificado_bancario,
      url_habeas_data,
    } = req.body;

    if (!nombre || !apellidos || !cedula) {
      return res
        .status(400)
        .json({ message: "Nombre, Apellidos y Cédula son obligatorios." });
    }

    if (
      !url_hoja_de_vida ||
      !url_cedula ||
      !url_certificado_bancario ||
      !url_habeas_data
    ) {
      return res.status(400).json({
        message:
          "Faltan URLs de documentos obligatorios (CV, Cédula, Cert. Bancario y Habeas Data).",
      });
    }

    const payload = {
      user_id,
      nombre,
      apellidos,
      cedula,
      contacto: contacto || null,
      correo_electronico: correo_electronico || null,
      direccion: direccion || null,
      codigo_ciudad: codigo_ciudad || null,
      url_hoja_de_vida,
      url_cedula,
      url_certificado_bancario,
      url_habeas_data,
    };

    const { data } = await supabaseAxios.post(
      "/empleados_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    res.status(201).json(data[0]);
  } catch (error) {
    console.error(
      "Error en createEmpleadoContabilidad:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      if (
        error.response.data?.code === "23505" ||
        error.response.data?.details?.includes(
          "empleados_contabilidad_cedula_key"
        )
      ) {
        return res.status(409).json({
          message: "Error: Ya existe un empleado con esa cédula.",
          details: error.response.data.details,
        });
      }
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
 * @route GET /api/trazabilidad/empleados/historial
 * (Esta función no se modifica)
 */
export const getHistorialEmpleados = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res
        .status(401)
        .json({
          message: "Usuario no autenticado para acceder a su historial.",
        });
    }

    const { data, error } = await supabaseAxios.get(
      `/empleados_contabilidad?select=*,profiles(nombre)&user_id=eq.${user_id}&order=created_at.desc`
    );

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialEmpleados:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/empleados/admin/expediente/:id
 * (Esta función no se modifica)
 */
export const getExpedienteEmpleadoAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: empleadoData, error: dbError } = await supabaseAxios.get(
      `/empleados_contabilidad?select=*,profiles(nombre)&id=eq.${id}`
    );

    if (dbError) throw dbError;
    if (!empleadoData || empleadoData.length === 0) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    const empleado = empleadoData[0];
    res.status(200).json({
      empleado: empleado,
      documentos: [], // Frontend ahora lee las URLs desde el objeto empleado
    });
  } catch (error) {
    console.error("Error al obtener expediente:", error);
    res.status(500).json({
      message: "Error interno al obtener el expediente.",
      details: error.message,
    });
  }
};

/**
 * @route PATCH /api/trazabilidad/empleados/:id
 * ¡NUEVA FUNCIÓN! Actualiza un registro de empleado.
 */
export const updateEmpleadoContabilidad = async (req, res) => {
  try {
    const { id } = req.params; // ID del registro a actualizar
    const user_id = req.user?.id; // ID del usuario que edita

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    if (!id) {
      return res.status(400).json({ message: "No se proporcionó un ID para actualizar." });
    }

    // Obtenemos solo los campos que el frontend podría enviar
    const {
      nombre,
      apellidos,
      cedula,
      contacto,
      correo_electronico,
      direccion,
      codigo_ciudad,
      url_hoja_de_vida,
      url_cedula,
      url_certificado_bancario,
      url_habeas_data,
    } = req.body;

    // Construir el payload dinámicamente (Mejor Práctica de PATCH)
    // Solo incluye campos que SÍ vinieron en el body.
    const payload = {};
    if (nombre !== undefined) payload.nombre = nombre;
    if (apellidos !== undefined) payload.apellidos = apellidos;
    if (cedula !== undefined) payload.cedula = cedula;
    if (contacto !== undefined) payload.contacto = contacto;
    if (correo_electronico !== undefined) payload.correo_electronico = correo_electronico;
    if (direccion !== undefined) payload.direccion = direccion;
    if (codigo_ciudad !== undefined) payload.codigo_ciudad = codigo_ciudad;
    if (url_hoja_de_vida !== undefined) payload.url_hoja_de_vida = url_hoja_de_vida;
    if (url_cedula !== undefined) payload.url_cedula = url_cedula;
    if (url_certificado_bancario !== undefined) payload.url_certificado_bancario = url_certificado_bancario;
    if (url_habeas_data !== undefined) payload.url_habeas_data = url_habeas_data;

    // Si el payload está vacío, no hay nada que actualizar.
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: "No se proporcionaron datos para actualizar." });
    }

    // ¡Importante! El PATCH se filtra por ID y por user_id.
    // Esto previene que un usuario edite registros de otro.
    const { data } = await supabaseAxios.patch(
      `/empleados_contabilidad?id=eq.${id}&user_id=eq.${user_id}`,
      payload,
      { headers: { Prefer: "return=representation" } } // Devuelve el registro actualizado
    );

    // Si data está vacío, no se encontró un registro que coincida con (id Y user_id).
    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado o no tiene permiso para editarlo." });
    }

    res.status(200).json(data[0]); // Devuelve el objeto actualizado

  } catch (error) {
    // Manejo de errores idéntico al de 'create'
    console.error("Error en updateEmpleadoContabilidad:", error.response ? error.response.data : error.message);
    if (error.response) {
      if (
        error.response.data?.code === "23505" ||
        error.response.data?.details?.includes(
          "empleados_contabilidad_cedula_key"
        )
      ) {
        return res.status(409).json({
          message: "Error: La cédula ingresada ya pertenece a otro empleado.",
          details: error.response.data.details,
        });
      }
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