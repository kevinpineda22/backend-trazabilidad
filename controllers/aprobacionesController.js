// controllers/aprobacionesController.js
import { supabaseAxios } from "../services/supabaseClient.js";

/**
 * @route GET /api/trazabilidad/aprobaciones/pendientes
 * Obtiene todos los registros pendientes de aprobación
 */
export const obtenerPendientes = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Obtener todos los registros pendientes (estado: 'pendiente')
    const { data } = await supabaseAxios.get(
      `/registros_pendientes?select=*&estado=eq.pendiente&order=created_at.desc`
    );

    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error al obtener registros pendientes:", error);
    res.status(500).json({
      message: "Error al obtener registros pendientes.",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/trazabilidad/aprobaciones/aprobar/:id
 * Aprueba un registro pendiente y lo mueve a la tabla correspondiente
 */
export const aprobarRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Obtener el registro pendiente
    const { data: registroPendiente } = await supabaseAxios.get(
      `/registros_pendientes?id=eq.${id}`
    );

    if (!registroPendiente || registroPendiente.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado." });
    }

    const registro = registroPendiente[0];

    if (registro.estado !== "pendiente") {
      return res
        .status(400)
        .json({ message: "Este registro ya fue procesado." });
    }

    const construirPayload = () => {
      const basePayload = {
        user_id: registro.user_id || user_id,
        created_at: new Date().toISOString(),
      };

      switch (registro.tipo) {
        case "empleado": {
          const datos = registro.datos || {};
          return {
            tablaDestino: "empleados_contabilidad",
            payload: {
              ...basePayload,
              nombre: datos.nombre,
              apellidos: datos.apellidos,
              cedula: datos.cedula,
              contacto: datos.contacto || null,
              correo_electronico: datos.correo_electronico || null,
              direccion: datos.direccion || null,
              codigo_ciudad: datos.codigo_ciudad || null,
              url_hoja_de_vida: datos.url_hoja_de_vida,
              url_cedula: datos.url_cedula,
              url_certificado_bancario: datos.url_certificado_bancario,
              url_habeas_data: datos.url_habeas_data,
            },
          };
        }
        case "cliente": {
          const datos = registro.datos || {};
          return {
            tablaDestino: "clientes_contabilidad",
            payload: {
              ...basePayload,
              cupo: datos.cupo,
              plazo: datos.plazo,
              url_rut: datos.url_rut,
              url_camara_comercio: datos.url_camara_comercio,
              url_formato_sangrilaft: datos.url_formato_sangrilaft,
              url_cedula: datos.url_cedula,
            },
          };
        }
        case "proveedor": {
          const datos = registro.datos || {};
          return {
            tablaDestino: "proveedores_contabilidad",
            payload: {
              ...basePayload,
              url_rut: datos.url_rut,
              url_camara_comercio: datos.url_camara_comercio || null,
              url_certificacion_bancaria: datos.url_certificacion_bancaria,
              url_doc_identidad_rep_legal: datos.url_doc_identidad_rep_legal,
              url_composicion_accionaria: datos.url_composicion_accionaria,
              url_certificado_sagrilaft: datos.url_certificado_sagrilaft,
            },
          };
        }
        default:
          return null;
      }
    };

    const infoInsercion = construirPayload();

    if (!infoInsercion) {
      return res.status(400).json({ message: "Tipo de registro inválido." });
    }

    const { data: nuevoRegistro } = await supabaseAxios.post(
      `/${infoInsercion.tablaDestino}`,
      infoInsercion.payload,
      { headers: { Prefer: "return=representation" } }
    );

    // Actualizar estado del registro pendiente
    await supabaseAxios.patch(`/registros_pendientes?id=eq.${id}`, {
      estado: "aprobado",
      aprobado_por: user_id,
      fecha_aprobacion: new Date().toISOString(),
    });

    res.status(200).json({
      message: "Registro aprobado exitosamente.",
      data: nuevoRegistro[0],
    });
  } catch (error) {
    console.error(
      "Error al aprobar registro:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Error al aprobar registro.",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/trazabilidad/aprobaciones/rechazar/:id
 * Rechaza un registro pendiente
 */
export const rechazarRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Obtener el registro pendiente
    const { data: registroPendiente } = await supabaseAxios.get(
      `/registros_pendientes?id=eq.${id}`
    );

    if (!registroPendiente || registroPendiente.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado." });
    }

    const registro = registroPendiente[0];

    if (registro.estado !== "pendiente") {
      return res
        .status(400)
        .json({ message: "Este registro ya fue procesado." });
    }

    // Actualizar estado del registro pendiente
    const { data } = await supabaseAxios.patch(
      `/registros_pendientes?id=eq.${id}`,
      {
        estado: "rechazado",
        rechazado_por: user_id,
        motivo_rechazo: motivo || "Sin motivo especificado",
        fecha_rechazo: new Date().toISOString(),
      },
      { headers: { Prefer: "return=representation" } }
    );

    res.status(200).json({
      message: "Registro rechazado.",
      data: data[0],
    });
  } catch (error) {
    console.error("Error al rechazar registro:", error);
    res.status(500).json({
      message: "Error al rechazar registro.",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/aprobaciones/historial
 * Obtiene el historial completo de aprobaciones/rechazos
 */
export const obtenerHistorial = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data } = await supabaseAxios.get(
      `/registros_pendientes?select=*&estado=neq.pendiente&order=created_at.desc`
    );

    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error al obtener historial:", error);
    res.status(500).json({
      message: "Error al obtener historial.",
      error: error.message,
    });
  }
};
