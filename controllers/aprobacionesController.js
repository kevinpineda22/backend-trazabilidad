// controllers/aprobacionesController.js
import { supabaseAxios } from "../services/supabaseClient.js";
import { sendEmail } from "../services/emailService.js";

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
      `/registros_pendientes?select=*&estado=eq.pendiente&order=created_at.desc`,
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

    console.log(`[Aprobación] Procesando ID: ${id}`);
    if (datosAprobados) {
      console.log(
        "[Aprobación] Datos editados recibidos:",
        JSON.stringify(datosAprobados),
      );
    }

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Obtener el registro pendiente
    const { data: registroPendiente } = await supabaseAxios.get(
      `/registros_pendientes?id=eq.${id}`,
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
          const datosOriginales = registro.datos || {};
          const datos = datosAprobados
            ? { ...datosOriginales, ...datosAprobados }
            : datosOriginales;
          return {
            tablaDestino: "empleados_contabilidad",
            conflictKey: "cedula",
            payload: {
              ...basePayload,
              nombre: normalizar(datos.nombre),
              apellidos: normalizar(datos.apellidos),
              tipo_documento: normalizar(datos.tipo_documento),
              cedula: normalizar(datos.cedula),
              dv: normalizar(datos.dv),
              contacto: normalizar(datos.contacto),
              correo_electronico: normalizar(datos.correo_electronico),
              direccion: normalizar(datos.direccion),
              // Nota: codigo_ciudad NO existe en la tabla empleados_contabilidad según el schema
              url_hoja_de_vida: normalizar(datos.url_hoja_de_vida),
              url_cedula: normalizar(datos.url_cedula),
              url_certificado_bancario: normalizar(
                datos.url_certificado_bancario,
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
            conflictKey: "nit",
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
                datos.email_factura_electronica,
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
                datos.declara_recursos_publicos,
              ),
              declara_obligaciones_tributarias: normalizar(
                datos.declara_obligaciones_tributarias,
              ),
              // Cupo y plazo (campos específicos de cliente)
              cupo: normalizar(datos.cupo),
              plazo: normalizar(datos.plazo),
              // Documentos - CLIENTES usa certificado_sagrilaft
              url_rut: normalizar(datos.url_rut),
              url_camara_comercio: normalizar(datos.url_camara_comercio),
              url_certificado_sagrilaft: normalizar(
                datos.url_certificado_sagrilaft,
              ),
              url_cedula: normalizar(datos.url_cedula),
              url_certificacion_bancaria: normalizar(
                datos.url_certificacion_bancaria,
              ),
              url_composicion_accionaria: normalizar(
                datos.url_composicion_accionaria,
              ),
            },
          };
        }
        case "proveedor": {
          const datosOriginales = registro.datos || {};
          const datos = datosAprobados
            ? { ...datosOriginales, ...datosAprobados }
            : datosOriginales;
          return {
            tablaDestino: "proveedores_contabilidad",
            conflictKey: "nit",
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
                datos.email_factura_electronica,
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
                datos.declara_recursos_publicos,
              ),
              declara_obligaciones_tributarias: normalizar(
                datos.declara_obligaciones_tributarias,
              ),
              cupo_aprobado: normalizar(cupoAprobado),
              url_rut: normalizar(datos.url_rut),
              url_camara_comercio: normalizar(datos.url_camara_comercio),
              url_certificacion_bancaria: normalizar(
                datos.url_certificacion_bancaria,
              ),
              url_doc_identidad_rep_legal: normalizar(
                datos.url_doc_identidad_rep_legal,
              ),
              url_composicion_accionaria: normalizar(
                datos.url_composicion_accionaria,
              ),
              url_certificado_sagrilaft: normalizar(
                datos.url_certificado_sagrilaft,
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

    console.log(
      `[Aprobación] Insertando/Actualizando en ${infoInsercion.tablaDestino}. Payload:`,
      JSON.stringify(infoInsercion.payload),
    );

    const { data: nuevoRegistro } = await supabaseAxios.post(
      `/${infoInsercion.tablaDestino}?on_conflict=${infoInsercion.conflictKey}`,
      infoInsercion.payload,
      {
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
      },
    );

    // Actualizar estado del registro pendiente con el ID del registro aprobado
    await supabaseAxios.patch(`/registros_pendientes?id=eq.${id}`, {
      estado: "aprobado",
      aprobado_por: user_id,
      fecha_aprobacion: new Date().toISOString(),
      registro_aprobado_id: nuevoRegistro[0]?.id, // Guardar el ID del registro creado
    });

    // Enviar correo al admin de contabilidad y a la copia
    try {
      const adminContabilidadEmail = process.env.ADMIN_CONTABILIDAD_EMAIL;
      // Correo para el oficial de cumplimiento (SAGRILAFT)
      const adminSagrilaftEmail =
        process.env.ADMIN_SAGRILAFT_EMAIL || "johanmerkahorro777@gmail.com";

      if (adminContabilidadEmail) {
        // Enviar a ambos correos (separados por coma)
        const recipients = [adminContabilidadEmail, adminSagrilaftEmail]
          .filter(Boolean)
          .join(",");

        const tipo =
          registro.tipo.charAt(0).toUpperCase() + registro.tipo.slice(1);

        let nombreEntidad = "";
        let identificacion = "";

        if (registro.tipo === "empleado") {
          nombreEntidad = `${infoInsercion.payload.nombre} ${infoInsercion.payload.apellidos}`;
          identificacion = `C.C. ${infoInsercion.payload.cedula}`;
        } else {
          nombreEntidad =
            infoInsercion.payload.razon_social ||
            `${infoInsercion.payload.primer_nombre || ""} ${
              infoInsercion.payload.primer_apellido || ""
            }`.trim() ||
            infoInsercion.payload.nombre_establecimiento;
          identificacion = `NIT ${infoInsercion.payload.nit}${
            infoInsercion.payload.dv ? "-" + infoInsercion.payload.dv : ""
          }`;
        }

        const subject = `✅ Registro Aprobado: ${tipo} - ${nombreEntidad}`;

        // Diseño profesional del correo en HTML
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 20px; margin-bottom: 20px;">
              
              <!-- Encabezado -->
              <div style="background-color: #210d65; padding: 25px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Registro Aprobado</h1>
              </div>

              <!-- Contenido Principal -->
              <div style="padding: 40px 30px; color: #333333;">
                <p style="font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 25px; color: #555555;">
                  Estimado Administrador,
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #555555;">
                  El sistema de trazabilidad ha procesado existosamente una solicitud. El siguiente registro ha sido aprobado y añadido a la base de datos contable.
                </p>

                <!-- Tabla de Detalles -->
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <tbody>
                    <tr>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 14px; width: 35%;">Tipo de Registro</td>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500; font-size: 14px;">${tipo}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 14px;">Involucrado</td>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500; font-size: 14px;">${nombreEntidad}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 14px;">Identificación</td>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500; font-size: 14px;">${identificacion}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 20px; color: #64748b; font-weight: 600; font-size: 14px;">Fecha Aprobación</td>
                      <td style="padding: 15px 20px; color: #334155; font-weight: 500; font-size: 14px;">${new Date().toLocaleDateString(
                        "es-CO",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}</td>
                    </tr>
                  </tbody>
                </table>

                <div style="text-align: center; margin-top: 35px;">
                  <span style="display: inline-block; padding: 12px 24px; background-color: #89dc00; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Gestión Completada</span>
                </div>
              </div>

              <!-- Pie de Página -->
              <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.5;">
                  Este es un mensaje automático del Sistema de Trazabilidad.<br>
                  &copy; ${new Date().getFullYear()} Trazabilidad Contable.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail(recipients, subject, htmlContent);
      } else {
        console.warn("ADMIN_CONTABILIDAD_EMAIL no está configurado.");
      }
    } catch (emailError) {
      console.error(
        "Error enviando correo al admin de contabilidad:",
        emailError,
      );
    }

    res.status(200).json({
      message: "Registro aprobado exitosamente.",
      data: nuevoRegistro[0],
    });
  } catch (error) {
    console.error(
      "Error al aprobar registro:",
      error.response?.data || error.message,
    );

    // El error 23505 (duplicate key) ya no debería ocurrir con UPSERT,
    // pero lo dejamos por si acaso falla la resolución de conflictos.
    if (error.response?.data?.code === "23505") {
      return res.status(409).json({
        message:
          "Error: Ya existe un registro con este documento/NIT en el sistema (UPSERT falló).",
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
      `/registros_pendientes?id=eq.${id}`,
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
      { headers: { Prefer: "return=representation" } },
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
      `/registros_pendientes?select=*&estado=in.(aprobado,rechazado,creado_contabilidad)&order=created_at.desc`,
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
      `/registros_pendientes?select=*&estado=in.(archivado_aprobado,archivado_rechazado)&order=created_at.desc`,
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
      `/registros_pendientes?id=eq.${id}`,
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
      { headers: { Prefer: "return=representation" } },
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
      `/registros_pendientes?id=eq.${id}`,
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
      { headers: { Prefer: "return=representation" } },
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
