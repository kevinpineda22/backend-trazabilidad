import { supabaseAxios } from "../services/supabaseClient.js";

/**
 * @route GET /api/trazabilidad/admin/historial-empleados
 * Obtiene TODO el historial de empleados, uniendo el nombre del creador.
 */
export const getHistorialEmpleadosAdmin = async (req, res) => {
    try {
        // Hacemos JOIN con profiles para saber quién lo creó
        const { data, error } = await supabaseAxios.get(
            '/empleados_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc'
        );
        if (error) throw error;
        res.status(200).json(data || []);
    } catch (error) {
        console.error("Error en getHistorialEmpleadosAdmin:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};

/**
 * @route GET /api/trazabilidad/admin/historial-proveedores
 * Obtiene TODO el historial de proveedores, uniendo el nombre del creador.
 */
export const getHistorialProveedoresAdmin = async (req, res) => {
    try {
        const { data, error } = await supabaseAxios.get(
            '/proveedores_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc'
        );
        if (error) throw error;
        res.status(200).json(data || []);
    } catch (error) {
        console.error("Error en getHistorialProveedoresAdmin:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};

/**
 * @route GET /api/trazabilidad/admin/historial-clientes
 * Obtiene TODO el historial de clientes, uniendo el nombre del creador.
 */
export const getHistorialClientesAdmin = async (req, res) => {
    try {
        const { data, error } = await supabaseAxios.get(
            '/clientes_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc'
        );
        if (error) throw error;
        res.status(200).json(data || []);
    } catch (error) {
        console.error("Error en getHistorialClientesAdmin:", error);
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};

/**
 * @route GET /api/trazabilidad/admin/dashboard-stats
 * Obtiene estadísticas para el dashboard.
 */
export const getDashboardStats = async (req, res) => {
    try {
        // Usamos count=* para obtener solo el conteo de filas, lo cual es más eficiente
        const [empleadosResponse, proveedoresResponse, clientesResponse] = await Promise.all([
            supabaseAxios.get('/empleados_contabilidad?select=count', { headers: { Prefer: 'count=exact' } }),
            supabaseAxios.get('/proveedores_contabilidad?select=count', { headers: { Prefer: 'count=exact' } }),
            supabaseAxios.get('/clientes_contabilidad?select=count', { headers: { Prefer: 'count=exact' } })
        ]);

        const stats = {
            // El conteo se obtiene del header Content-Range, pero si falla, usamos length.
            totalEmpleados: empleadosResponse.headers['content-range'] ? parseInt(empleadosResponse.headers['content-range'].split('/')[1]) : (empleadosResponse.data?.length || 0),
            totalProveedores: proveedoresResponse.headers['content-range'] ? parseInt(proveedoresResponse.headers['content-range'].split('/')[1]) : (proveedoresResponse.data?.length || 0),
            totalClientes: clientesResponse.headers['content-range'] ? parseInt(clientesResponse.headers['content-range'].split('/')[1]) : (clientesResponse.data?.length || 0),
        };

        res.status(200).json(stats);
        
    } catch (error) {
        // En caso de error, devolvemos un objeto de estadísticas vacío para evitar que el frontend falle
        console.error("Error en getDashboardStats:", error);
        res.status(500).json({ 
            message: "Error interno del servidor.", 
            error: error.message,
            stats: { totalEmpleados: 0, totalProveedores: 0, totalClientes: 0 } 
        });
    }
};