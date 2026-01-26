// src/controllers/adminContabilidadController.js
import { supabaseAxios } from "../services/supabaseClient.js";
import { sendEmail } from "../services/emailService.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Helper para obtener IDs archivados
 */
const getArchivadosIds = async (tipo) => {
  const { data, error } = await supabaseAxios.get(
    `/registros_pendientes?select=registro_aprobado_id&tipo=eq.${tipo}&estado=eq.archivado_aprobado`,
  );
  if (error) {
    console.error(`Error obteniendo archivados de ${tipo}:`, error);
    return new Set();
  }
  return new Set(data.map((r) => r.registro_aprobado_id));
};

/**
 * Helper para obtener IDs marcados como creados por contabilidad
 */
const getCreadosIds = async (tipo) => {
  const { data, error } = await supabaseAxios.get(
    `/registros_pendientes?select=registro_aprobado_id&tipo=eq.${tipo}&estado=eq.creado_contabilidad`,
  );
  if (error) {
    console.error(`Error obteniendo creados de ${tipo}:`, error);
    return new Set();
  }
  return new Set(data.map((r) => r.registro_aprobado_id));
};

/**
 * @route GET /api/trazabilidad/admin/historial-empleados
 * Obtiene TODO el historial de empleados, uniendo el nombre del creador.
 * Incluye propiedad 'is_archivado'.
 */
export const getHistorialEmpleadosAdmin = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // 1. Obtener empleados
    const { data: empleados, error } = await supabaseAxios.get(
      `/empleados_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc`,
    );
    if (error) throw error;

    // 2. Obtener IDs archivados
    const archivadosIds = await getArchivadosIds("empleado");
    const creadosIds = await getCreadosIds("empleado");

    // 3. Marcar archivados y creados
    const resultado = (empleados || []).map((emp) => ({
      ...emp,
      is_archivado: archivadosIds.has(emp.id),
      is_creado: creadosIds.has(emp.id),
    }));

    res.status(200).json(resultado);
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
 * Incluye propiedad 'is_archivado'.
 */
export const getHistorialProveedoresAdmin = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data: proveedores, error } = await supabaseAxios.get(
      `/proveedores_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc`,
    );
    if (error) throw error;

    const archivadosIds = await getArchivadosIds("proveedor");
    const creadosIds = await getCreadosIds("proveedor");

    const resultado = (proveedores || []).map((prov) => ({
      ...prov,
      is_archivado: archivadosIds.has(prov.id),
      is_creado: creadosIds.has(prov.id),
    }));

    res.status(200).json(resultado);
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
 * Incluye propiedad 'is_archivado'.
 */
export const getHistorialClientesAdmin = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data: clientes, error } = await supabaseAxios.get(
      `/clientes_contabilidad?select=*,profiles(nombre, area)&order=created_at.desc`,
    );
    if (error) throw error;

    const archivadosIds = await getArchivadosIds("cliente");
    const creadosIds = await getCreadosIds("cliente");

    const resultado = (clientes || []).map((cli) => ({
      ...cli,
      is_archivado: archivadosIds.has(cli.id),
      is_creado: creadosIds.has(cli.id),
    }));

    res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en getHistorialClientesAdmin:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route POST /api/trazabilidad/admin/archivar-entidad
 * Archiva una entidad (empleado, cliente, proveedor) buscando su registro de aprobación correspondiente.
 */
export const archivarEntidad = async (req, res) => {
  try {
    const { tipo, id } = req.body; // tipo: 'empleado'|'cliente'|'proveedor', id: ID de la entidad
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    if (!tipo || !id) {
      return res.status(400).json({ message: "Tipo e ID son requeridos." });
    }

    // 1. Buscar el registro en registros_pendientes
    const { data: registros, error: searchError } = await supabaseAxios.get(
      `/registros_pendientes?select=id&tipo=eq.${tipo}&registro_aprobado_id=eq.${id}`,
    );

    if (searchError) throw searchError;

    // 2. Si existe, actualizar estado
    if (registros && registros.length > 0) {
      const updates = registros.map((r) =>
        supabaseAxios.patch(`/registros_pendientes?id=eq.${r.id}`, {
          estado: "archivado_aprobado",
        }),
      );
      await Promise.all(updates);
      return res
        .status(200)
        .json({ message: "Entidad archivada correctamente." });
    }

    // 3. Si NO existe, crear un registro "fake" para soportar archivado de datos antiguos o creados manualmente
    const tableMap = {
      empleado: "empleados_contabilidad",
      cliente: "clientes_contabilidad",
      proveedor: "proveedores_contabilidad",
    };

    const tableName = tableMap[tipo];
    if (!tableName) {
      return res.status(400).json({ message: "Tipo de entidad no válido." });
    }

    // Verificar que la entidad exista realmente en su tabla
    const { data: entityData, error: entityError } = await supabaseAxios.get(
      `/${tableName}?id=eq.${id}&select=*`,
    );

    if (entityError) throw entityError;
    if (!entityData || entityData.length === 0) {
      return res
        .status(404)
        .json({ message: "La entidad no existe en la base de datos." });
    }

    // Crear registro en registros_pendientes con los datos actuales
    const datosSnapshot = entityData[0];

    await supabaseAxios.post(`/registros_pendientes`, {
      tipo,
      estado: "archivado_aprobado",
      user_id: user_id, // El admin que archiva figura como creador del registro de historial
      datos: datosSnapshot,
      registro_aprobado_id: id,
      created_at: new Date().toISOString(),
      fecha_aprobacion: new Date().toISOString(), // Simulamos fecha de aprobación actual
      aprobado_por: user_id,
    });

    res
      .status(200)
      .json({ message: "Entidad archivada correctamente (registro creado)." });
  } catch (error) {
    console.error("Error al archivar entidad:", error);
    res
      .status(500)
      .json({ message: "Error al archivar.", error: error.message });
  }
};

/**
 * @route POST /api/trazabilidad/admin/restaurar-entidad
 * Restaura una entidad archivada.
 */
export const restaurarEntidad = async (req, res) => {
  try {
    const { tipo, id } = req.body;
    if (!tipo || !id) {
      return res.status(400).json({ message: "Tipo e ID son requeridos." });
    }

    const { data: registros, error: searchError } = await supabaseAxios.get(
      `/registros_pendientes?select=id&tipo=eq.${tipo}&registro_aprobado_id=eq.${id}`,
    );

    if (searchError) throw searchError;
    if (!registros || registros.length === 0) {
      return res.status(404).json({
        message: "No se encontró el registro de aprobación asociado.",
      });
    }

    const updates = registros.map((r) =>
      supabaseAxios.patch(`/registros_pendientes?id=eq.${r.id}`, {
        estado: "aprobado", // Restaurar a aprobado
      }),
    );

    await Promise.all(updates);

    res.status(200).json({ message: "Entidad restaurada correctamente." });
  } catch (error) {
    console.error("Error al restaurar entidad:", error);
    res
      .status(500)
      .json({ message: "Error al restaurar.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/admin/expediente-proveedor/:id
 * Obtiene el expediente completo de un proveedor por ID.
 */
export const getExpedienteProveedorAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data: proveedorData, error: dbError } = await supabaseAxios.get(
      `/proveedores_contabilidad?select=*,profiles(nombre)&id=eq.${id}`,
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
 * @route GET /api/trazabilidad/admin/expediente-cliente/:id
 * Obtiene el expediente completo de un cliente por ID.
 */
export const getExpedienteClienteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data: clienteData, error: dbError } = await supabaseAxios.get(
      `/clientes_contabilidad?select=*,profiles(nombre)&id=eq.${id}`,
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
 * @route GET /api/trazabilidad/admin/expediente-empleado/:id
 * Obtiene el expediente completo de un empleado por ID.
 */
export const getExpedienteEmpleadoAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data: empleadoData, error: dbError } = await supabaseAxios.get(
      `/empleados_contabilidad?select=*,profiles(nombre)&id=eq.${id}`,
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
          { headers: { Prefer: "count=exact" } },
        ),
        supabaseAxios.get(
          `/proveedores_contabilidad?select=count`, // Filtro user_id eliminado
          { headers: { Prefer: "count=exact" } },
        ),
        supabaseAxios.get(
          `/clientes_contabilidad?select=count`, // Filtro user_id eliminado
          { headers: { Prefer: "count=exact" } },
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

/**
 * @route POST /api/trazabilidad/admin/marcar-creado
 * Marca una entidad como 'creado por contabilidad' y envía correo de feedback
 */
export const marcarEntidadCreada = async (req, res) => {
  try {
    const { tipo, id } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    if (!tipo || !id) {
      return res.status(400).json({ message: "Tipo e ID son requeridos." });
    }

    // 1. Verificar si existe en registros_pendientes con el registro_aprobado_id
    const { data: registros, error: searchError } = await supabaseAxios.get(
      `/registros_pendientes?select=id,datos&tipo=eq.${tipo}&registro_aprobado_id=eq.${id}`,
    );

    if (searchError) throw searchError;

    let registroDatos = null;

    if (registros && registros.length > 0) {
      // Caso A: Existe, actualizamos estado
      registroDatos = registros[0].datos; // Tomamos backup de datos
      const updates = registros.map((r) =>
        supabaseAxios.patch(`/registros_pendientes?id=eq.${r.id}`, {
          estado: "creado_contabilidad",
          aprobado_por: user_id, // Actualizamos quien hizo la gestión final
        }),
      );
      await Promise.all(updates);
    } else {
      // Caso B: No existe (creado manual o antiguo), insertamos nuevo registro log
      const tableMap = {
        empleado: "empleados_contabilidad",
        cliente: "clientes_contabilidad",
        proveedor: "proveedores_contabilidad",
      };

      const tableName = tableMap[tipo];
      if (!tableName) {
        return res.status(400).json({ message: "Tipo de entidad no válido." });
      }

      const { data: entityData, error: entityError } = await supabaseAxios.get(
        `/${tableName}?id=eq.${id}&select=*`,
      );

      if (entityError) throw entityError;
      if (!entityData || entityData.length === 0) {
        return res.status(404).json({ message: "Entidad no encontrada." });
      }

      registroDatos = entityData[0];

      await supabaseAxios.post(`/registros_pendientes`, {
        tipo,
        estado: "creado_contabilidad",
        user_id: user_id,
        datos: registroDatos,
        registro_aprobado_id: id,
        created_at: new Date().toISOString(),
        fecha_aprobacion: new Date().toISOString(),
        aprobado_por: user_id,
      });
    }

    // 2. Enviar Correo de Feedback
    let destinatario = "";
    let nombreEntidad = "";

    switch (tipo) {
      case "empleado":
        destinatario = process.env.ADMIN_EMPLEADOS_EMAIL;
        nombreEntidad = `${registroDatos.nombre || ""} ${
          registroDatos.apellidos || ""
        }`;
        break;
      case "cliente":
        destinatario = process.env.ADMIN_CLIENTES_EMAIL;
        nombreEntidad =
          registroDatos.razon_social ||
          `${registroDatos.primer_nombre || ""} ${
            registroDatos.primer_apellido || ""
          }`;
        break;
      case "proveedor":
        destinatario = process.env.ADMIN_PROVEEDORES_EMAIL;
        nombreEntidad =
          registroDatos.razon_social ||
          registroDatos.nombre_establecimiento ||
          "Proveedor";
        break;
    }

    if (destinatario) {
      const subject = `✅ Proceso Finalizado: ${
        tipo.charAt(0).toUpperCase() + tipo.slice(1)
      } Creado - ${nombreEntidad}`;
      const htmlContent = `
                <!DOCTYPE html>
                <html>
                <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 20px; margin-bottom: 20px;">
                        <div style="background-color: #10b981; padding: 25px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Gestión Completada</h1>
                        </div>
                        <div style="padding: 40px 30px; color: #333333;">
                            <p style="font-size: 16px; margin-bottom: 20px;">Estimado Administrador,</p>
                            <p style="font-size: 16px; margin-bottom: 20px;">
                                El área de Contabilidad informa que el <strong>${tipo}</strong>: <strong>${nombreEntidad}</strong> ya ha sido creado en el sistema contable y está listo para continuar con el proceso.
                            </p>
                            <div style="text-align: center; margin-top: 30px;">
                                <span style="display: inline-block; padding: 10px 20px; background-color: #f3f4f6; color: #374151; border-radius: 6px; font-weight: 600;">Estado: Creado por Contabilidad</span>
                            </div>
                        </div>
                        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 13px; margin: 0;">Sistema de Trazabilidad</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
      await sendEmail(destinatario, subject, htmlContent);
    }

    res
      .status(200)
      .json({ message: "Entidad marcada como creada y notificación enviada." });
  } catch (error) {
    console.error("Error al marcar entidad como creada:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: error.message,
    });
  }
};
