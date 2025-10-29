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
            cacheControl: '3600',
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

// Función simple para obtener la extensión del archivo
const getFileExtension = (filename) => {
    return filename.split('.').pop() || 'file';
}

/**
 * @route POST /api/trazabilidad/proveedores
 * Crea un nuevo registro de proveedor (con lógica de carpetas)
 */
export const createProveedorContabilidad = async (req, res) => {
    try {
        const {
            razon_social,
            nit, // Campo de texto clave
            contacto,
            correo_electronico,
            direccion,
            codigo_ciudad,
        } = req.body;

        const user_id = req.user?.id;
        if (!user_id) {
            return res.status(401).json({ message: "Usuario no autenticado." });
        }
        if (!razon_social || !nit) {
            return res.status(400).json({ message: "Razón Social y NIT son obligatorios." });
        }

        const files = req.files || {};
        const rutFile = files.rut?.[0];
        const certificadoBancarioFile = files.certificado_bancario?.[0];
        const cedulaRepresentanteFile = files.cedula_representante?.[0];
        const camaraComercioFile = files.camara_comercio?.[0];

        if (!rutFile || !certificadoBancarioFile || !cedulaRepresentanteFile || !camaraComercioFile) {
            return res.status(400).json({ message: "Faltan archivos obligatorios (RUT, Cert. Bancario, Cédula Rep., Cám. Comercio)." });
        }

        // 1. Crear nombre de carpeta con el NIT para asegurar unicidad y facilidad de archivado
        const safeFolderName = `NIT${nit} ${razon_social}`
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Limpiar acentos
            .replace(/[^a-zA-Z0-9 ]/g, '') // Quitar caracteres especiales
            .replace(/ /g, '_'); // Reemplazar espacios

        const basePath = `proveedores/${safeFolderName}`;

        // 2. Subir archivos en paralelo.
        const [
            url_rut,
            url_certificado_bancario,
            url_cedula_representante,
            url_camara_comercio,
        ] = await Promise.all([
            uploadFileToStorage(
                rutFile,
                'documentos_contabilidad',
                `${basePath}/rut.${getFileExtension(rutFile.originalname)}`
            ),
            uploadFileToStorage(
                certificadoBancarioFile,
                'documentos_contabilidad',
                `${basePath}/certificado_bancario.${getFileExtension(certificadoBancarioFile.originalname)}`
            ),
            uploadFileToStorage(
                cedulaRepresentanteFile,
                'documentos_contabilidad',
                `${basePath}/cedula_representante.${getFileExtension(cedulaRepresentanteFile.originalname)}`
            ),
            uploadFileToStorage(
                camaraComercioFile,
                'documentos_contabilidad',
                `${basePath}/camara_comercio.${getFileExtension(camaraComercioFile.originalname)}`
            ),
        ]);

        // 3. Construir el payload para la base de datos
        const payload = {
            user_id,
            razon_social,
            nit, // Guardar el NIT de texto
            contacto: contacto || null,
            correo_electronico: correo_electronico || null,
            direccion: direccion || null,
            codigo_ciudad: codigo_ciudad || null,

            url_rut,
            url_certificado_bancario,
            url_cedula_representante,
            url_camara_comercio,
        };

        // 4. Insertar en la tabla 'proveedores_contabilidad'
        const { data, error } = await supabaseAxios.post(
            "/proveedores_contabilidad",
            payload,
            { headers: { Prefer: "return=representation" } }
        );

        if (error) {
            console.error("Error al guardar en Supabase:", error);
            // Mejor manejo de error de unicidad (NIT)
            if (error.response?.data?.code === '23505') {
                return res.status(409).json({ message: "Error: Ya existe un proveedor con ese NIT.", details: error.response.data.details });
            }
            return res.status(400).json({ message: error.message || "Error al guardar en la base de datos", details: error.details });
        }

        res.status(201).json(data[0]);

    } catch (error) {
        console.error("Error en createProveedorContabilidad:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};


/**
 * @route GET /api/trazabilidad/proveedores/historial
 * Obtiene el historial de proveedores creados por el usuario autenticado.
 */
export const getHistorialProveedores = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) {
            return res.status(401).json({ message: "Usuario no autenticado." });
        }

        // Consulta mejorada y limpia
        const { data, error } = await supabaseAxios.get(
            `/proveedores_contabilidad?select=*,profiles(nombre)&user_id=eq.${user_id}&order=created_at.desc`
        );

        if (error) throw error;

        res.status(200).json(data || []);

    } catch (error) {
        console.error("Error en getHistorialProveedores:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};