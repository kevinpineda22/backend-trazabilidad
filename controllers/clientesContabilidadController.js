import { supabaseAxios, storageClient } from "../services/supabaseClient.js";

/**
 * Función auxiliar para subir un archivo.
 */
const uploadFileToStorage = async (file, bucketName, subFolder = 'clientes') => {
    if (!file) return null;

    try {
        const fileName = `${subFolder}/${Date.now()}-${file.originalname.replace(/ /g, '_')}`;
        
        // Usamos el buffer del archivo de Multer
        const { data, error } = await storageClient.storage
            .from(bucketName)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
                upsert: true, // Permitir sobrescribir para reintentos
            });

        if (error) {
            console.error("Error subiendo archivo a Storage:", error);
            throw new Error(`Error al subir ${file.originalname}: ${error.message}`);
        }

        const { data: publicUrlData } = storageClient.storage
            .from(bucketName)
            .getPublicUrl(data.path);
        
        return publicUrlData.publicUrl;
    } catch (error) {
        console.error("Error en uploadFileToStorage:", error);
        throw error;
    }
};

/**
 * @route POST /api/trazabilidad/clientes
 * Crea un nuevo registro de cliente de contabilidad.
 */
export const createClienteContabilidad = async (req, res) => {
    try {
        const user_id = null;
        if (!user_id) {
            return res.status(401).json({ message: "Usuario no autenticado." });
        }

        const files = req.files || {};
        
        // El frontend usa 'rut_cliente' o 'rut'. Verificamos ambos por si acaso.
        const rutFile = files.rut_cliente?.[0] || files.rut?.[0]; 
        if (!rutFile) {
            return res.status(400).json({ message: "El archivo RUT es obligatorio." });
        }

        // Subir archivo a Supabase Storage
        const url_rut = await uploadFileToStorage(rutFile, 'documentos_contabilidad', 'clientes/rut');

        if (!url_rut) {
            // Esto solo debería ocurrir si uploadFileToStorage lanza un error o devuelve null
            return res.status(500).json({ message: "Error interno al obtener la URL del archivo RUT." });
        }

        const payload = {
            user_id,
            url_rut,
        };

        // Guardar la URL en la base de datos
        const { data, error } = await supabaseAxios.post(
            "/clientes_contabilidad",
            payload,
            { headers: { Prefer: "return=representation" } }
        );

        if (error) {
            console.error("Error al guardar en Supabase:", error);
            return res.status(400).json({ 
                message: error.message || "Error al guardar en la base de datos", 
                details: error.details || error
            });
        }

        res.status(201).json(data[0]);

    } catch (error) {
        console.error("Error en createClienteContabilidad:", error);
        res.status(500).json({ 
            message: "Error interno del servidor.", 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * @route GET /api/trazabilidad/clientes/historial
 * Obtiene el historial de clientes creados por el usuario autenticado.
 */
export const getHistorialClientes = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) {
            return res.status(401).json({ message: "Usuario no autenticado." });
        }

        // Consulta mejorada y limpia
        const { data, error } = await supabaseAxios.get(
            `/clientes_contabilidad?select=*,profiles(nombre)&user_id=eq.${user_id}&order=created_at.desc`
        );

        if (error) throw error;

        res.status(200).json(data || []);

    } catch (error) {
        console.error("Error en getHistorialClientes:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};