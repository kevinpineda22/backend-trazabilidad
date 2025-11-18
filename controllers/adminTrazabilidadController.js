// src/controllers/adminTrazabilidadController.js
import { supabaseAxios } from "../services/supabaseClient.js";

/**
 * @route GET /api/trazabilidad/admin-trazabilidad/historial-empleados
 * Obtiene TODO el historial de empleados para AdminTrazabilidad
 */
export const getHistorialEmpleadosAdminTraz = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data, error } = await supabaseAxios.get(
      `/empleados_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc`
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialEmpleadosAdminTraz:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/admin-trazabilidad/historial-proveedores
 * Obtiene TODO el historial de proveedores para AdminTrazabilidad
 */
export const getHistorialProveedoresAdminTraz = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data, error } = await supabaseAxios.get(
      `/proveedores_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc`
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialProveedoresAdminTraz:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/admin-trazabilidad/historial-clientes
 * Obtiene TODO el historial de clientes para AdminTrazabilidad
 */
export const getHistorialClientesAdminTraz = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data, error } = await supabaseAxios.get(
      `/clientes_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc`
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialClientesAdminTraz:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/admin-trazabilidad/expediente-empleado/:id
 * Obtiene el expediente completo de un empleado por ID
 */
export const getExpedienteEmpleadoAdminTraz = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data: empleadoData, error: dbError } = await supabaseAxios.get(
      `/empleados_contabilidad?select=*,profiles(nombre)&id=eq.${id}`
    );

    if (dbError) throw dbError;
    if (!empleadoData || empleadoData.length === 0) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    const empleado = empleadoData[0];
    res.status(200).json({
      empleado: empleado,
    });
  } catch (error) {
    console.error("Error al obtener expediente de empleado:", error);
    res.status(500).json({
      message: "Error interno al obtener el expediente.",
      details: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/admin-trazabilidad/expediente-proveedor/:id
 * Obtiene el expediente completo de un proveedor por ID
 */
export const getExpedienteProveedorAdminTraz = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data: proveedorData, error: dbError } = await supabaseAxios.get(
      `/proveedores_contabilidad?select=*,profiles(nombre)&id=eq.${id}`
    );

    if (dbError) throw dbError;
    if (!proveedorData || proveedorData.length === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    const proveedor = proveedorData[0];
    res.status(200).json({
      proveedor: proveedor,
    });
  } catch (error) {
    console.error("Error al obtener expediente de proveedor:", error);
    res.status(500).json({
      message: "Error interno al obtener el expediente.",
      details: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/admin-trazabilidad/expediente-cliente/:id
 * Obtiene el expediente completo de un cliente por ID
 */
export const getExpedienteClienteAdminTraz = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data: clienteData, error: dbError } = await supabaseAxios.get(
      `/clientes_contabilidad?select=*,profiles(nombre)&id=eq.${id}`
    );

    if (dbError) throw dbError;
    if (!clienteData || clienteData.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const cliente = clienteData[0];
    res.status(200).json({
      cliente: cliente,
    });
  } catch (error) {
    console.error("Error al obtener expediente de cliente:", error);
    res.status(500).json({
      message: "Error interno al obtener el expediente.",
      details: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/admin-trazabilidad/dashboard-stats
 * Obtiene estadísticas para el dashboard de AdminTrazabilidad
 */
export const getDashboardStatsAdminTraz = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const [empleadosResponse, proveedoresResponse, clientesResponse] =
      await Promise.all([
        supabaseAxios.get(`/empleados_contabilidad?select=count`, {
          headers: { Prefer: "count=exact" },
        }),
        supabaseAxios.get(`/proveedores_contabilidad?select=count`, {
          headers: { Prefer: "count=exact" },
        }),
        supabaseAxios.get(`/clientes_contabilidad?select=count`, {
          headers: { Prefer: "count=exact" },
        }),
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
    console.error("Error en getDashboardStatsAdminTraz:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: error.message,
      stats: { totalEmpleados: 0, totalProveedores: 0, totalClientes: 0 },
    });
  }
};
