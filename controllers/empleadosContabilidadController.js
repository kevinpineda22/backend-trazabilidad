// src/controllers/empleadosContabilidadController.js
import { supabaseAxios, storageClient } from "../services/supabaseClient.js";

/**
 * Sube un archivo a una RUTA COMPLETA Y ESPECÍFICA (carpeta/nombre_archivo.ext)
 */
const uploadFileToStorage = async (file, bucketName, fullPath) => {
  if (!file) return null;

  const { data, error } = await storageClient.storage
    .from(bucketName)
    .upload(fullPath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "3600",
      upsert: true, // Sobrescribir si ya existe
    });

  if (error) {
    console.error("Error subiendo archivo a Storage:", error);
    throw new Error(`Error al subir ${file.originalname}: ${error.message}`);
  }

  const { data: publicUrlData } = storageClient.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
};

// Función simple para obtener la extensión del archivo
const getFileExtension = (filename) => {
  return filename.split(".").pop() || "file";
};

/**
 * @route POST /api/trazabilidad/empleados
 * Crea un nuevo registro de empleado (con lógica de carpetas)
 */
export const createEmpleadoContabilidad = async (req, res) => {
  try {
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
    } = req.body || {};

    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    if (!nombre || !apellidos || !cedula) {
      return res
        .status(400)
        .json({ message: "Nombre, Apellidos y Cédula son obligatorios." });
    }

    const files = req.files || {};
    const hojaDeVidaFile = files.hoja_de_vida?.[0];
    const cedulaFile = files.cedula_file?.[0];
    const certificadoBancarioFile = files.certificado_bancario?.[0];

    let urls = {
      url_hoja_de_vida: url_hoja_de_vida || null,
      url_cedula: url_cedula || null,
      url_certificado_bancario: url_certificado_bancario || null,
    };

    const needUpload = hojaDeVidaFile || cedulaFile || certificadoBancarioFile;
    if (needUpload) {
      const safeFolderName = `${nombre} ${apellidos} CC${cedula}`
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/ /g, "_");
      const basePath = `empleados/${safeFolderName}`;

      const uploadWithName = async (file, name) => {
        if (!file) return null;
        const ext = getFileExtension(file.originalname);
        return uploadFileToStorage(
          file,
          "documentos_contabilidad",
          `${basePath}/${name}.${ext}`
        );
      };

      urls = {
        url_hoja_de_vida:
          (await uploadWithName(hojaDeVidaFile, "hoja_de_vida")) ||
          urls.url_hoja_de_vida,
        url_cedula:
          (await uploadWithName(cedulaFile, "cedula")) || urls.url_cedula,
        url_certificado_bancario:
          (await uploadWithName(
            certificadoBancarioFile,
            "certificado_bancario"
          )) || urls.url_certificado_bancario,
      };
    } else {
      if (
        !urls.url_hoja_de_vida ||
        !urls.url_cedula ||
        !urls.url_certificado_bancario
      ) {
        return res.status(400).json({
          message:
            "Faltan URLs obligatorias (hoja de vida, cédula y certificado bancario).",
        });
      }
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
      url_hoja_de_vida: urls.url_hoja_de_vida,
      url_cedula: urls.url_cedula,
      url_certificado_bancario: urls.url_certificado_bancario,
    };

    // 4. Insertar en la tabla 'empleados_contabilidad'
    const { data, error } = await supabaseAxios.post(
      "/empleados_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    if (error) {
      console.error("Error al guardar en Supabase:", error);
      if (error.response?.data?.code === "23505") {
        // Error de 'UNIQUE constraint' (cédula duplicada)
        return res
          .status(409)
          .json({
            message: "Error: Ya existe un empleado con esa cédula.",
            details: error.response.data.details,
          });
      }
      return res
        .status(400)
        .json({ message: error.message, details: error.details });
    }

    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error en createEmpleadoContabilidad:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/empleados/historial
 * Obtiene el historial de empleados creados por el usuario autenticado.
 */
export const getHistorialEmpleados = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Consultar (incluyendo la columna 'cedula')
    const { data, error } = await supabaseAxios.get(
      // Hacemos JOIN con 'profiles' para obtener el nombre del creador
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
