import { supabaseAxios, storageClient } from "../services/supabaseClient.js";
/**
 * Sube un archivo a una RUTA COMPLETA Y ESPECÍFICA (carpeta/nombre_archivo.ext)
 */
const uploadFileToStorage = async (file, bucketName, fullPath) => {
  if (!file) return null;

  // Usamos el buffer del archivo de Multer
  const { data, error } = await storageClient.storage
    .from(bucketName)
    .upload(fullPath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "3600",
      upsert: true, // Permitir sobrescribir
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

/**
 * Función simple para obtener la extensión del archivo
 */
const getFileExtension = (filename) => {
  return filename.split(".").pop() || "file";
};

/**
 * @route POST /api/trazabilidad/proveedores
 * Crea un nuevo registro de proveedor (solo documentos)
 */
export const createProveedorContabilidad = async (req, res) => {
  try {
    const user_id = null;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const files = req.files || {};
    const rutFile = files.rut?.[0];
    const camaraComercioFile = files.camara_comercio?.[0];
    const certificacionBancariaFile = files.certificacion_bancaria?.[0];
    const formatoVinculacionFile = files.formato_vinculacion?.[0];
    const composicionAccionariaFile = files.composicion_accionaria?.[0];

    // Validaciones de documentos obligatorios
    if (!rutFile || !camaraComercioFile || !certificacionBancariaFile) {
      return res
        .status(400)
        .json({
          message:
            "Faltan documentos obligatorios (RUT, Cámara de Comercio, Certificación Bancaria).",
        });
    }

    // 1. Crear nombre de carpeta con el ID de usuario y un timestamp (genérico)
    // Esto previene sobrescribir archivos del mismo usuario subidos en momentos diferentes.
    const basePath = `proveedores/${user_id}/${Date.now()}`;

    // 2. Subir archivos en paralelo.
    const [
      url_rut,
      url_camara_comercio,
      url_formato_vinculacion,
      url_composicion_accionaria,
      url_certificacion_bancaria,
    ] = await Promise.all([
      // Obligatorios
      uploadFileToStorage(
        rutFile,
        "documentos_contabilidad",
        `${basePath}/rut.${getFileExtension(rutFile.originalname)}`
      ),
      uploadFileToStorage(
        camaraComercioFile,
        "documentos_contabilidad",
        `${basePath}/camara_comercio.${getFileExtension(
          camaraComercioFile.originalname
        )}`
      ),
      uploadFileToStorage(
        certificacionBancariaFile,
        "documentos_contabilidad",
        `${basePath}/certificacion_bancaria.${getFileExtension(
          certificacionBancariaFile.originalname
        )}`
      ),

      // Opcionales
      uploadFileToStorage(
        formatoVinculacionFile,
        "documentos_contabilidad",
        `${basePath}/formato_vinculacion.${getFileExtension(
          formatoVinculacionFile?.originalname
        )}`
      ),
      uploadFileToStorage(
        composicionAccionariaFile,
        "documentos_contabilidad",
        `${basePath}/composicion_accionaria.${getFileExtension(
          composicionAccionariaFile?.originalname
        )}`
      ),
    ]);

    // 3. Construir el payload (solo URLs)
    const payload = {
      user_id,
      url_rut,
      url_camara_comercio,
      url_formato_vinculacion,
      url_composicion_accionaria,
      url_certificacion_bancaria,
    };

    // 4. Insertar en la tabla 'proveedores_contabilidad'
    const { data, error } = await supabaseAxios.post(
      "/proveedores_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    if (error) {
      console.error("Error al guardar en Supabase:", error);
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

export const getHistorialProveedores = async (req, res) => {
  // ... (Lógica de getHistorialProveedores se mantiene) ...
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
