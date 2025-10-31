// src/controllers/empleadosContabilidadController.js

import { supabaseAxios, storageClient } from "../services/supabaseClient.js";

/**
 * @route POST /api/trazabilidad/empleados
 * Crea un nuevo registro de empleado (RECIBE SOLO URLs y datos de texto)
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
    
    if (!url_hoja_de_vida || !url_cedula || !url_certificado_bancario || !url_habeas_data) {
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

    // La variable 'error' se elimina de aquí, ya que axios lanza una excepción
    const { data } = await supabaseAxios.post(
      "/empleados_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );
    
    res.status(201).json(data[0]);

  } catch (error) {
    // --- ¡LÓGICA DE ERROR CORREGIDA! ---
    console.error("Error en createEmpleadoContabilidad:", error);

    // Revisamos si el error es un error de Axios (respuesta del servidor)
    if (error.response) {
      // Chequeo de Cédula Duplicada (Código 23505)
      if (error.response.data?.code === '23505' || error.response.data?.details?.includes('empleados_contabilidad_cedula_key')) { 
        return res.status(409).json({ // 409 Conflict
            message: "Error: Ya existe un empleado con esa cédula.", 
            details: error.response.data.details 
        });
      }
      // Otro error de Supabase (ej. campo faltante, etc.)
      return res.status(error.response.status || 400).json({ 
        message: error.response.data?.message || "Error al guardar en la base de datos", 
        details: error.response.data?.details 
      });
    }
    
    // Error genérico si no fue un error de Axios
    res.status(500).json({ message: "Error interno del servidor.", error: error.message });
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
    
    // .get() SÍ devuelve {data, error}, por eso este 'if (error)' es correcto.
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
 * (Esta función no necesita cambios, ya estaba correcta)
 */
export const getExpedienteEmpleadoAdmin = async (req, res) => {
  try {
    const { id } = req.params; 
    const BUCKET_NAME = "documentos_contabilidad"; 
    const FOLDER_BASE = "empleados"; 

    const { data: empleadoData, error: dbError } = await supabaseAxios.get(
      `/empleados_contabilidad?select=*,profiles(nombre)&id=eq.${id}`
    );

    if (dbError) throw dbError;
    if (!empleadoData || empleadoData.length === 0) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    const empleado = empleadoData[0];

    const safeFolderName = `CC${empleado.cedula}_${empleado.nombre}_${empleado.apellidos}`
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/ /g, "_")
      .toUpperCase();

    const folderPath = `${FOLDER_BASE}/${safeFolderName}`;

    const { data: files, error: storageError } = await storageClient.storage
      .from(BUCKET_NAME)
      .list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

    if (storageError) throw storageError;

    const documentosConUrl = files.map((file) => {
      const {
        data: { publicUrl },
      } = storageClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(`${folderPath}/${file.name}`); 

      return {
        ...file,
        publicUrl,
      };
    });

    res.status(200).json({
      empleado,
      documentos: documentosConUrl,
    });
  } catch (error) {
    console.error("Error al obtener expediente:", error);
    res.status(500).json({
      message: "Error interno al obtener el expediente.",
      details: error.message,
    });
  }
};