import { supabaseAxios } from "../services/supabaseClient.js";

// Tipos de expediente válidos para el archivador.
const TIPOS_VALIDOS = new Set(["cliente", "empleado", "proveedor"]);

/**
 * @route GET /api/trazabilidad/archivador/carpetas/:tipo/:id
 * Lista las carpetas del archivador de un expediente.
 */
export const listarCarpetas = async (req, res) => {
  try {
    const { tipo, id } = req.params;

    if (!TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({
        message:
          "Tipo de expediente inválido. Debe ser 'cliente', 'empleado' o 'proveedor'.",
      });
    }

    const { data } = await supabaseAxios.get(
      `/expediente_carpetas?expediente_tipo=eq.${tipo}&expediente_id=eq.${id}&select=*&order=created_at.asc`
    );

    return res.status(200).json(data || []);
  } catch (error) {
    console.error(
      "Error al listar carpetas:",
      error.response ? error.response.data : error.message
    );
    return res
      .status(500)
      .json({ message: "Error al listar carpetas", error: error.message });
  }
};

/**
 * @route POST /api/trazabilidad/archivador/carpetas
 * Crea una carpeta en el archivador de un expediente.
 * body: { expediente_tipo, expediente_id, nombre }
 */
export const crearCarpeta = async (req, res) => {
  try {
    const { expediente_tipo, expediente_id, nombre } = req.body;
    const created_by = req.user?.id;

    if (!expediente_tipo || !expediente_id || !nombre) {
      return res.status(400).json({
        message:
          "Faltan datos requeridos: expediente_tipo, expediente_id, nombre.",
      });
    }

    if (!TIPOS_VALIDOS.has(expediente_tipo)) {
      return res.status(400).json({
        message:
          "expediente_tipo inválido. Debe ser 'cliente', 'empleado' o 'proveedor'.",
      });
    }

    const nombreLimpio = String(nombre).trim();
    if (nombreLimpio.length === 0) {
      return res
        .status(400)
        .json({ message: "El nombre de la carpeta no puede estar vacío." });
    }

    const { data } = await supabaseAxios.post(
      "/expediente_carpetas",
      {
        expediente_tipo,
        expediente_id,
        nombre: nombreLimpio,
        created_by,
      },
      { headers: { Prefer: "return=representation" } }
    );

    return res.status(201).json(data[0]);
  } catch (error) {
    console.error(
      "Error al crear carpeta:",
      error.response ? error.response.data : error.message
    );
    return res
      .status(500)
      .json({ message: "Error al crear carpeta", error: error.message });
  }
};

/**
 * @route DELETE /api/trazabilidad/archivador/carpetas/:id
 * Elimina una carpeta y (por cascade en la BD) todos sus archivos.
 */
export const eliminarCarpeta = async (req, res) => {
  try {
    const { id } = req.params;

    await supabaseAxios.delete(`/expediente_carpetas?id=eq.${id}`);

    return res.status(200).json({ message: "Carpeta eliminada." });
  } catch (error) {
    console.error(
      "Error al eliminar carpeta:",
      error.response ? error.response.data : error.message
    );
    return res
      .status(500)
      .json({ message: "Error al eliminar carpeta", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/archivador/archivos/:carpetaId
 * Lista los archivos de una carpeta.
 */
export const listarArchivos = async (req, res) => {
  try {
    const { carpetaId } = req.params;

    const { data } = await supabaseAxios.get(
      `/expediente_archivos?carpeta_id=eq.${carpetaId}&select=*&order=created_at.desc`
    );

    return res.status(200).json(data || []);
  } catch (error) {
    console.error(
      "Error al listar archivos:",
      error.response ? error.response.data : error.message
    );
    return res
      .status(500)
      .json({ message: "Error al listar archivos", error: error.message });
  }
};

/**
 * @route POST /api/trazabilidad/archivador/archivos
 * Registra un archivo dentro de una carpeta (el archivo ya se subió a Storage).
 * body: { carpeta_id, nombre, url_archivo }
 */
export const crearArchivo = async (req, res) => {
  try {
    const { carpeta_id, nombre, url_archivo } = req.body;
    const uploaded_by = req.user?.id;

    if (!carpeta_id || !nombre || !url_archivo) {
      return res.status(400).json({
        message: "Faltan datos requeridos: carpeta_id, nombre, url_archivo.",
      });
    }

    const nombreLimpio = String(nombre).trim();
    if (nombreLimpio.length === 0) {
      return res
        .status(400)
        .json({ message: "El nombre del archivo no puede estar vacío." });
    }

    const { data } = await supabaseAxios.post(
      "/expediente_archivos",
      {
        carpeta_id,
        nombre: nombreLimpio,
        url_archivo,
        uploaded_by,
      },
      { headers: { Prefer: "return=representation" } }
    );

    return res.status(201).json(data[0]);
  } catch (error) {
    console.error(
      "Error al crear archivo:",
      error.response ? error.response.data : error.message
    );
    return res
      .status(500)
      .json({ message: "Error al registrar archivo", error: error.message });
  }
};

/**
 * @route DELETE /api/trazabilidad/archivador/archivos/:id
 * Elimina un archivo del archivador.
 */
export const eliminarArchivo = async (req, res) => {
  try {
    const { id } = req.params;

    await supabaseAxios.delete(`/expediente_archivos?id=eq.${id}`);

    return res.status(200).json({ message: "Archivo eliminado." });
  } catch (error) {
    console.error(
      "Error al eliminar archivo:",
      error.response ? error.response.data : error.message
    );
    return res
      .status(500)
      .json({ message: "Error al eliminar archivo", error: error.message });
  }
};
