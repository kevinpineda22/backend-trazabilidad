// src/controllers/proveedoresContabilidadController.js
import { supabaseAxios, storageClient } from "../services/supabaseClient.js";

const uploadFileToStorage = async (file, bucketName, subFolder = 'proveedores') => {
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

export const createProveedorContabilidad = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) {
            return res.status(401).json({ message: "Usuario no autenticado." });
        }

        const files = req.files || {};
        const [
            url_rut,
            url_camara_comercio,
            url_formato_vinculacion,
            url_composicion_accionaria,
            url_certificacion_bancaria,
        ] = await Promise.all([
            uploadFileToStorage(files.rut?.[0], 'documentos_contabilidad', 'proveedores/rut'),
            uploadFileToStorage(files.camara_comercio?.[0], 'documentos_contabilidad', 'proveedores/camara_comercio'),
            uploadFileToStorage(files.formato_vinculacion?.[0], 'documentos_contabilidad', 'proveedores/vinculacion'),
            uploadFileToStorage(files.composicion_accionaria?.[0], 'documentos_contabilidad', 'proveedores/accionaria'),
            uploadFileToStorage(files.certificacion_bancaria?.[0], 'documentos_contabilidad', 'proveedores/bancarios'),
        ]);

        const payload = {
            user_id,
            url_rut,
            url_camara_comercio,
            url_formato_vinculacion,
            url_composicion_accionaria,
            url_certificacion_bancaria,
        };

        const { data, error } = await supabaseAxios.post(
            "/proveedores_contabilidad",
            payload,
            { headers: { Prefer: "return=representation" } }
        );

        if (error) {
            console.error("Error al guardar en Supabase:", error);
            return res.status(400).json({ message: error.message, details: error.details });
        }

        res.status(201).json(data[0]);

    } catch (error) {
        console.error("Error en createProveedorContabilidad:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};

export const getHistorialProveedores = async (req, res) => {
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
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};
