// src/controllers/empleadosContabilidadController.js

import { supabaseAxios, storageClient } from "../services/supabaseClient.js";

/**
 * @route POST /api/trazabilidad/empleados
 * (Esta función está correcta y no se modifica)
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
 * (Esta función no necesita cambios)
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
 * ¡FUNCIÓN ACTUALIZADA Y SIMPLIFICADA!
 */
export const getExpedienteEmpleadoAdmin = async (req, res) => {
  try {
    const { id } = req.params; // ID del empleado

    // 1. Obtener datos del empleado de la DB (esto es todo lo que necesitamos)
    const { data: empleadoData, error: dbError } = await supabaseAxios.get(
      `/empleados_contabilidad?select=*,profiles(nombre)&id=eq.${id}`
    );

    if (dbError) throw dbError;
    if (!empleadoData || empleadoData.length === 0) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    const empleado = empleadoData[0]; // PostgREST siempre devuelve un array

    // 2. ¡Lógica de listar archivos de Storage ELIMINADA!
    // Ya no es necesaria, porque el objeto 'empleado' tiene todas las URLs.

    // 3. Devolver la respuesta (mantenemos la forma para no romper el frontend)
    res.status(200).json({
      empleado: empleado,
      documentos: [], // Ya no usamos este array, pero lo enviamos vacío
    });
  } catch (error) {
    console.error("Error al obtener expediente:", error);
    res.status(500).json({
      message: "Error interno al obtener el expediente.",
      details: error.message,
    });
  }
};