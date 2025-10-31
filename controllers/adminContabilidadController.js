// src/controllers/adminContabilidadController.js
import { supabaseAxios } from "../services/supabaseClient.js";

/**
 * @route GET /api/trazabilidad/admin/historial-empleados
 * Obtiene TODO el historial de empleados, uniendo el nombre del creador.
 * (Vista de Admin - sin filtrar por user_id)
 */
export const getHistorialEmpleadosAdmin = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    // ¡CORREGIDO! Se eliminó el filtro user_id para la vista de admin
    const { data, error } = await supabaseAxios.get(
      `/empleados_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc`
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialEmpleadosAdmin:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/admin/historial-proveedores
 * Obtiene TODO el historial de proveedores.
 * (Vista de Admin - sin filtrar por user_id)
 */
export const getHistorialProveedoresAdmin = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    // ¡CORREGIDO! Se eliminó el filtro user_id para la vista de admin
    const { data, error } = await supabaseAxios.get(
      `/proveedores_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc`
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialProveedoresAdmin:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/admin/historial-clientes
 * Obtiene TODO el historial de clientes.
 * (Vista de Admin - sin filtrar por user_id)
 */
export const getHistorialClientesAdmin = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    // ¡CORREGIDO! Se eliminó el filtro user_id para la vista de admin
    const { data, error } = await supabaseAxios.get(
      `/clientes_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc`
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialClientesAdmin:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/admin/dashboard-stats
 * Obtiene estadísticas para el dashboard.
 * (Vista de Admin - sin filtrar por user_id)
 */
export const getDashboardStats = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    
    // ¡CORREGIDO! Se eliminó el filtro user_id para la vista de admin
    const [empleadosResponse, proveedoresResponse, clientesResponse] =
      await Promise.all([
        supabaseAxios.get(
          `/empleados_contabilidad?select=count`, // Filtro user_id eliminado
          { headers: { Prefer: "count=exact" } }
        ),
        supabaseAxios.get(
          `/proveedores_contabilidad?select=count`, // Filtro user_id eliminado
          { headers: { Prefer: "count=exact" } }
        ),
        supabaseAxios.get(
          `/clientes_contabilidad?select=count`, // Filtro user_id eliminado
          { headers: { Prefer: "count=exact" } }
        ),
      ]);
      
    const stats = {
      totalEmpleados: empleadosResponse.headers["content-range"]
        ? parseInt(empleadosResponse.headers["content-range"].split("/")[1])
        : 0,
      totalProveedores: proveedoresResponse.headers["content-range"]
        ? parseInt(proveedoresResponse.headers["content-range"].split("/")[1])
        : 0,
      totalClientes: clientesResponse.headers["content-range"]
        ? parseInt(clientesResponse.headers["content-range"].split("/")[1])
        : 0,
    };
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error en getDashboardStats:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: error.message,
      stats: { totalEmpleados: 0, totalProveedores: 0, totalClientes: 0 },
    });
  }
};