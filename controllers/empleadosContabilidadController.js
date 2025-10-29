import { supabaseAxios } from "../services/supabaseClient.js";

/**
 * @route POST /api/trazabilidad/empleados
 * Crea un nuevo registro de empleado (RECIBE SOLO URLs y datos de texto)
 */
export const createEmpleadoContabilidad = async (req, res) => {
    try {
        // Obtenemos el user_id del token verificado por authMiddleware
        const user_id = req.user?.id; 
        if (!user_id) {
             // Este check es un fallback, authMiddleware debería atrapar esto.
            return res.status(401).json({ message: "Usuario no autenticado para trazar la creación." });
        }
        
        const {
            nombre, apellidos, cedula, contacto, correo_electronico, direccion, codigo_ciudad,
            url_hoja_de_vida, url_cedula, url_certificado_bancario,
        } = req.body;
        
        // ... (Validaciones de campos de texto y URLs se mantienen) ...
        if (!nombre || !apellidos || !cedula) {
            return res.status(400).json({ message: "Nombre, Apellidos y Cédula son obligatorios." });
        }
        if (!url_hoja_de_vida || !url_cedula || !url_certificado_bancario) {
             return res.status(400).json({ message: "Faltan URLs de documentos obligatorios (CV, Cédula, Cert. Bancario)." });
        }
        
        const payload = {
            user_id, // Usamos el ID del usuario autenticado
            nombre, apellidos, cedula,
            contacto: contacto || null,
            correo_electronico: correo_electronico || null,
            direccion: direccion || null,
            codigo_ciudad: codigo_ciudad || null,
            url_hoja_de_vida,
            url_cedula,
            url_certificado_bancario,
        };

        // ... (Lógica de inserción en Supabase se mantiene) ...
        const { data, error } = await supabaseAxios.post(
            "/empleados_contabilidad",
            payload,
            { headers: { Prefer: "return=representation" } }
        );

        if (error) {
            console.error("Error al guardar empleado en Supabase:", error);
            if (error.response?.data?.code === '23505') { 
                return res.status(409).json({ message: "Error: Ya existe un empleado con esa cédula.", details: error.response.data.details });
            }
            return res.status(400).json({ message: error.message || "Error al guardar en la base de datos", details: error.details });
        }

        res.status(201).json(data[0]);

    } catch (error) {
        console.error("Error en createEmpleadoContabilidad:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};

/**
 * @route GET /api/trazabilidad/empleados/historial
 * Obtiene el historial de empleados creados por el usuario autenticado (user_id).
 */
export const getHistorialEmpleados = async (req, res) => {
    try {
        const user_id = req.user?.id; // Filtramos por el usuario actual
        if (!user_id) {
            return res.status(401).json({ message: "Usuario no autenticado para acceder a su historial." });
        }
        
        // Filtra por el user_id autenticado
        const { data, error } = await supabaseAxios.get(
            `/empleados_contabilidad?select=*,profiles(nombre)&user_id=eq.${user_id}&order=created_at.desc`
        );

        if (error) throw error;
        res.status(200).json(data || []);

    } catch (error) {
        console.error("Error en getHistorialEmpleados:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};