// src/controllers/clientesContabilidadController.js
import { supabaseAxios, storageClient } from "../services/supabaseClient.js";

/**
 * Función auxiliar para subir un archivo.
 */
const uploadFileToStorage = async (file, bucketName, subFolder = 'clientes') => {
    if (!file) return null;

    const fileName = `${subFolder}/${Date.now()}-${file.originalname.replace(/ /g, '_')}`;
    
    const { data, error } = await storageClient.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false,
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
 * @route POST /api/trazabilidad/clientes
 * Crea un nuevo registro de cliente de contabilidad.
 */
export const createClienteContabilidad = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) {
            return res.status(401).json({ message: "Usuario no autenticado." });
        }

        const files = req.files || {};
        const url_rut = await uploadFileToStorage(files.rut?.[0], 'documentos_contabilidad', 'clientes/rut');

        // Validación: El RUT es el único campo, así que es obligatorio
        if (!url_rut) {
            return res.status(400).json({ message: "El archivo RUT es obligatorio." });
        }

        const payload = {
            user_id,
            url_rut,
        };

        const { data, error } = await supabaseAxios.post(
            "/clientes_contabilidad",
            payload,
            { headers: { Prefer: "return=representation" } }
        );

        if (error) {
            console.error("Error al guardar en Supabase:", error);
            return res.status(400).json({ message: error.message, details: error.details });
        }

        res.status(201).json(data[0]);

    } catch (error) {
        console.error("Error en createClienteContabilidad:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
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

        // Hacemos JOIN con profiles para obtener el nombre de quién lo creó
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
