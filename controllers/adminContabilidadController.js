// src/controllers/adminContabilidadController.js
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
 * (Placeholder) Obtiene estadísticas para el dashboard.
 */
export const getDashboardStats = async (req, res) => {
    try {
        // Obtener conteos de manera simple
        const [empleadosResponse, proveedoresResponse, clientesResponse] = await Promise.all([
            supabaseAxios.get('/empleados_contabilidad?select=id'),
            supabaseAxios.get('/proveedores_contabilidad?select=id'),
            supabaseAxios.get('/clientes_contabilidad?select=id')
        ]);

        const stats = {
            totalEmpleados: empleadosResponse.data?.length || 0,
            totalProveedores: proveedoresResponse.data?.length || 0,
            totalClientes: clientesResponse.data?.length || 0,
        };

        res.status(200).json(stats);
        
    } catch (error) {
        console.error("Error en getDashboardStats:", error);
        res.status(500).json({ 
            message: "Error interno del servidor.", 
            error: error.message,
            stats: {
                totalEmpleados: 0,
                totalProveedores: 0,
                totalClientes: 0,
            }
        });
    }
};
