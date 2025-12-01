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
    const {
      cupoAprobado,
      datosAprobados,
      fechaContratacion,
      nombreCargo,
      sede,
    } = req.body;
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

    const normalizar = (valor) => {
      if (valor === undefined || valor === null) {
        return null;
      }
      if (typeof valor === "string") {
        const trimmed = valor.trim();
        return trimmed.length === 0 ? null : trimmed;
      }
      return valor;
    };

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
              nombre: normalizar(datos.nombre),
              apellidos: normalizar(datos.apellidos),
              cedula: normalizar(datos.cedula),
              contacto: normalizar(datos.contacto),
              correo_electronico: normalizar(datos.correo_electronico),
              direccion: normalizar(datos.direccion),
              // Nota: codigo_ciudad NO existe en la tabla empleados_contabilidad según el schema
              url_hoja_de_vida: normalizar(datos.url_hoja_de_vida),
              url_cedula: normalizar(datos.url_cedula),
              url_certificado_bancario: normalizar(
                datos.url_certificado_bancario
              ),
              url_habeas_data: normalizar(datos.url_habeas_data),
              url_autorizacion_firma: normalizar(datos.url_autorizacion_firma),
              fecha_contratacion: normalizar(fechaContratacion), // Nuevo campo
              nombre_cargo: normalizar(nombreCargo),
              sede: normalizar(sede),
            },
          };
        }
        case "cliente": {
          // Si vienen datos editados, los usamos. Si no, usamos los originales.
          // Se hace merge por si acaso, pero idealmente datosAprobados trae todo.
          const datosOriginales = registro.datos || {};
          const datos = datosAprobados
            ? { ...datosOriginales, ...datosAprobados }
            : datosOriginales;

          return {
            tablaDestino: "clientes_contabilidad",
            payload: {
              ...basePayload,
              // Campos generales
              fecha_diligenciamiento: normalizar(datos.fecha_diligenciamiento),
              tipo_regimen: normalizar(datos.tipo_regimen),
              tipo_documento: normalizar(datos.tipo_documento),
              nit: normalizar(datos.nit),
              dv: normalizar(datos.dv),
              razon_social: normalizar(datos.razon_social),
              nombre_establecimiento: normalizar(datos.nombre_establecimiento),
              // Persona Natural
              primer_nombre: normalizar(datos.primer_nombre),
              segundo_nombre: normalizar(datos.segundo_nombre),
              primer_apellido: normalizar(datos.primer_apellido),
              segundo_apellido: normalizar(datos.segundo_apellido),
              // CIIU
              codigo_ciiu: normalizar(datos.codigo_ciiu),
              descripcion_ciiu: normalizar(datos.descripcion_ciiu),
              // Ubicación
              direccion_domicilio: normalizar(datos.direccion_domicilio),
              departamento: normalizar(datos.departamento),
              departamento_codigo: normalizar(datos.departamento_codigo),
              ciudad: normalizar(datos.ciudad),
              ciudad_codigo: normalizar(datos.ciudad_codigo),
              // Contacto
              email_factura_electronica: normalizar(
                datos.email_factura_electronica
              ),
              nombre_contacto: normalizar(datos.nombre_contacto),
              email_contacto: normalizar(datos.email_contacto),
              telefono_contacto: normalizar(datos.telefono_contacto),
              // Representante Legal
              rep_legal_nombre: normalizar(datos.rep_legal_nombre),
              rep_legal_apellidos: normalizar(datos.rep_legal_apellidos),
              rep_legal_tipo_doc: normalizar(datos.rep_legal_tipo_doc),
              rep_legal_num_doc: normalizar(datos.rep_legal_num_doc),
              // Declaraciones
              declara_pep: normalizar(datos.declara_pep),
              declara_recursos_publicos: normalizar(
                datos.declara_recursos_publicos
              ),
              declara_obligaciones_tributarias: normalizar(
                datos.declara_obligaciones_tributarias
              ),
              // Cupo y plazo (campos específicos de cliente)
              cupo: normalizar(datos.cupo),
              plazo: normalizar(datos.plazo),
              // Documentos - CLIENTES usa certificado_sagrilaft
              url_rut: normalizar(datos.url_rut),
              url_camara_comercio: normalizar(datos.url_camara_comercio),
              url_certificado_sagrilaft: normalizar(
                datos.url_certificado_sagrilaft
              ),
              url_cedula: normalizar(datos.url_cedula),
              url_certificacion_bancaria: normalizar(
                datos.url_certificacion_bancaria
              ),
              url_composicion_accionaria: normalizar(
                datos.url_composicion_accionaria
              ),
            },
          };
        }
        case "proveedor": {
          const datos = registro.datos || {};
          return {
            tablaDestino: "proveedores_contabilidad",
            payload: {
              ...basePayload,
              fecha_diligenciamiento: normalizar(datos.fecha_diligenciamiento),
              tipo_regimen: normalizar(datos.tipo_regimen),
              tipo_documento: normalizar(datos.tipo_documento),
              nit: normalizar(datos.nit),
              dv: normalizar(datos.dv),
              razon_social: normalizar(datos.razon_social),
              nombre_establecimiento: normalizar(datos.nombre_establecimiento),
              codigo_ciiu: normalizar(datos.codigo_ciiu),
              direccion_domicilio: normalizar(datos.direccion_domicilio),
              departamento: normalizar(datos.departamento),
              ciudad: normalizar(datos.ciudad),
              email_factura_electronica: normalizar(
                datos.email_factura_electronica
              ),
              nombre_contacto: normalizar(datos.nombre_contacto),
              email_contacto: normalizar(datos.email_contacto),
              telefono_contacto: normalizar(datos.telefono_contacto),
              rep_legal_nombre: normalizar(datos.rep_legal_nombre),
              rep_legal_apellidos: normalizar(datos.rep_legal_apellidos),
              rep_legal_tipo_doc: normalizar(datos.rep_legal_tipo_doc),
              rep_legal_num_doc: normalizar(datos.rep_legal_num_doc),
              declara_pep: normalizar(datos.declara_pep),
              declara_recursos_publicos: normalizar(
                datos.declara_recursos_publicos
              ),
              declara_obligaciones_tributarias: normalizar(
                datos.declara_obligaciones_tributarias
              ),
              cupo_aprobado: normalizar(cupoAprobado),
              url_rut: normalizar(datos.url_rut),
              url_camara_comercio: normalizar(datos.url_camara_comercio),
              url_certificacion_bancaria: normalizar(
                datos.url_certificacion_bancaria
              ),
              url_doc_identidad_rep_legal: normalizar(
                datos.url_doc_identidad_rep_legal
              ),
              url_composicion_accionaria: normalizar(
                datos.url_composicion_accionaria
              ),
              url_certificado_sagrilaft: normalizar(
                datos.url_certificado_sagrilaft
              ),
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

    // Actualizar estado del registro pendiente con el ID del registro aprobado
    await supabaseAxios.patch(`/registros_pendientes?id=eq.${id}`, {
      estado: "aprobado",
      aprobado_por: user_id,
      fecha_aprobacion: new Date().toISOString(),
      registro_aprobado_id: nuevoRegistro[0]?.id, // Guardar el ID del registro creado
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

    if (error.response?.data?.code === "23505") {
      return res.status(409).json({
        message:
          "Error: Ya existe un registro con este documento/NIT en el sistema.",
        details: error.response.data.details,
      });
    }

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
      `/registros_pendientes?select=*&estado=in.(aprobado,rechazado)&order=created_at.desc`
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

/**
 * @route GET /api/trazabilidad/aprobaciones/archivados
 * Obtiene los registros archivados
 */
export const obtenerArchivados = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data } = await supabaseAxios.get(
      `/registros_pendientes?select=*&estado=in.(archivado_aprobado,archivado_rechazado)&order=created_at.desc`
    );

    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error al obtener archivados:", error);
    res.status(500).json({
      message: "Error al obtener archivados.",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/trazabilidad/aprobaciones/archivar/:id
 * Archiva un registro del historial
 */
export const archivarRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Obtener el registro actual
    const { data: registroActual } = await supabaseAxios.get(
      `/registros_pendientes?id=eq.${id}`
    );

    if (!registroActual || registroActual.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado." });
    }

    const estadoActual = registroActual[0].estado;
    let nuevoEstado = "";

    if (estadoActual === "aprobado") {
      nuevoEstado = "archivado_aprobado";
    } else if (estadoActual === "rechazado") {
      nuevoEstado = "archivado_rechazado";
    } else {
      return res.status(400).json({
        message: "Solo se pueden archivar registros aprobados o rechazados.",
      });
    }

    const { data } = await supabaseAxios.patch(
      `/registros_pendientes?id=eq.${id}`,
      { estado: nuevoEstado },
      { headers: { Prefer: "return=representation" } }
    );

    res.status(200).json({
      message: "Registro archivado exitosamente.",
      data: data[0],
    });
  } catch (error) {
    console.error("Error al archivar registro:", error);
    res.status(500).json({
      message: "Error al archivar registro.",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/trazabilidad/aprobaciones/restaurar/:id
 * Restaura un registro archivado al historial
 */
export const restaurarRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Obtener el registro actual
    const { data: registroActual } = await supabaseAxios.get(
      `/registros_pendientes?id=eq.${id}`
    );

    if (!registroActual || registroActual.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado." });
    }

    const estadoActual = registroActual[0].estado;
    let nuevoEstado = "";

    if (estadoActual === "archivado_aprobado") {
      nuevoEstado = "aprobado";
    } else if (estadoActual === "archivado_rechazado") {
      nuevoEstado = "rechazado";
    } else {
      return res
        .status(400)
        .json({ message: "El registro no está archivado correctamente." });
    }

    const { data } = await supabaseAxios.patch(
      `/registros_pendientes?id=eq.${id}`,
      { estado: nuevoEstado },
      { headers: { Prefer: "return=representation" } }
    );

    res.status(200).json({
      message: "Registro restaurado exitosamente.",
      data: data[0],
    });
  } catch (error) {
    console.error("Error al restaurar registro:", error);
    res.status(500).json({
      message: "Error al restaurar registro.",
      error: error.message,
    });
  }
};
