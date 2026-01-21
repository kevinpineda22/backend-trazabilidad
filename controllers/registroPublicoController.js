// controllers/registroPublicoController.js
import { supabaseAxios } from "../services/supabaseClient.js";
import { sendEmail } from "../services/emailService.js";
import {
  marcarTokenUsado,
  TOKEN_DISABLED_MESSAGES,
  TOKEN_NOT_FOUND_MESSAGE,
} from "./tokensController.js";

const sendTokenDisabled = (res, motivo) =>
  res.status(410).json({
    motivo,
    message: TOKEN_DISABLED_MESSAGES[motivo],
  });

/**
 * @route POST /api/trazabilidad/registro-publico/empleado/:token
 * Registra un empleado usando un token válido (sin autenticación)
 */
export const registrarEmpleadoPublico = async (req, res) => {
  try {
    const { token } = req.params;
    const {
      nombre,
      apellidos,
      tipo_documento,
      cedula,
      dv,
      contacto,
      correo_electronico,
      direccion,
      url_hoja_de_vida,
      url_cedula,
      url_certificado_bancario,
      url_habeas_data,
      url_autorizacion_firma,
    } = req.body;

    const { data: tokenData } = await supabaseAxios.get(
      `/tokens_registro?token=eq.${token}&tipo=eq.empleado`,
    );

    if (!tokenData || tokenData.length === 0) {
      return res.status(404).json({ message: TOKEN_NOT_FOUND_MESSAGE });
    }

    const tokenInfo = tokenData[0];

    if (tokenInfo.usado) {
      return sendTokenDisabled(res, "usado");
    }

    const ahora = new Date();
    const fechaExpiracion = new Date(tokenInfo.expiracion);
    if (ahora > fechaExpiracion) {
      return sendTokenDisabled(res, "expirado");
    }

    if (!nombre || !apellidos || !cedula) {
      return res
        .status(400)
        .json({ message: "Nombre, Apellidos y Cédula son obligatorios." });
    }

    if (
      !url_hoja_de_vida ||
      !url_cedula ||
      !url_certificado_bancario ||
      !url_habeas_data ||
      !url_autorizacion_firma
    ) {
      return res.status(400).json({
        message:
          "Todos los documentos son obligatorios (CV, Cédula, Cert. Bancario, Habeas Data y Autorización Firma).",
      });
    }

    const payload = {
      tipo: "empleado",
      estado: "pendiente",
      user_id: tokenInfo.generado_por,
      token,
      datos: {
        nombre,
        apellidos,
        tipo_documento,
        cedula,
        dv,
        contacto: contacto || null,
        correo_electronico: correo_electronico || null,
        direccion: direccion || null,
        url_hoja_de_vida,
        url_cedula,
        url_certificado_bancario,
        url_habeas_data,
        url_autorizacion_firma,
      },
      created_at: new Date().toISOString(),
    };

    const { data: registroPendiente } = await supabaseAxios.post(
      "/registros_pendientes",
      payload,
      { headers: { Prefer: "return=representation" } },
    );

    await marcarTokenUsado(token);

    // Enviar correo al admin de empleados
    try {
      const adminEmail = process.env.ADMIN_EMPLEADOS_EMAIL;
      if (adminEmail) {
        const subject = `📢 Nuevo Registro de Empleado: ${nombre} ${apellidos}`;
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 20px; margin-bottom: 20px;">
              
              <!-- Encabezado -->
              <div style="background-color: #2e3b55; padding: 25px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Nuevo Registro de Empleado</h1>
              </div>

              <!-- Contenido Principal -->
              <div style="padding: 40px 30px; color: #333333;">
                <p style="font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 25px; color: #555555;">
                  Estimado Administrador,
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #555555;">
                  Se ha recibido un nuevo formulario de registro de empleado que requiere su revisión y aprobación.
                </p>

                <!-- Tabla de Detalles -->
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <tbody>
                    <tr>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 14px; width: 35%;">Nombre Completo</td>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500; font-size: 14px;">${nombre} ${apellidos}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 14px;">Documento</td>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500; font-size: 14px;">${cedula}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 20px; color: #64748b; font-weight: 600; font-size: 14px;">Fecha Solicitud</td>
                      <td style="padding: 15px 20px; color: #334155; font-weight: 500; font-size: 14px;">${new Date().toLocaleDateString(
                        "es-CO",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}</td>
                    </tr>
                  </tbody>
                </table>

                <div style="text-align: center; margin-top: 35px;">
                  <span style="display: inline-block; padding: 12px 24px; background-color: #2e3b55; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Ingrese al Panel para Aprobar</span>
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
        await sendEmail(adminEmail, subject, htmlContent);
      } else {
        console.warn("ADMIN_EMPLEADOS_EMAIL no está configurado.");
      }
    } catch (emailError) {
      console.error("Error enviando correo al admin de empleados:", emailError);
      // No fallamos la request si el correo falla, pero lo logueamos
    }

    res.status(201).json({
      message: "Registro enviado. Está pendiente de aprobación.",
      data: registroPendiente[0],
    });
  } catch (error) {
    console.error(
      "Error en registrarEmpleadoPublico:",
      error.response?.data || error.message,
    );

    if (error.response?.data?.code === "23505") {
      return res.status(409).json({
        message: "Ya existe un registro con esa cédula.",
      });
    }

    res.status(500).json({
      message: "Error al procesar el registro.",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/trazabilidad/registro-publico/cliente/:token
 * Registra un cliente usando un token válido (sin autenticación)
 */
export const registrarClientePublico = async (req, res) => {
  try {
    const { token } = req.params;
    const {
      // Campos generales
      fecha_diligenciamiento,
      tipo_regimen,
      tipo_documento,
      nit,
      dv,
      razon_social,
      nombre_establecimiento,
      // Persona Natural
      primer_nombre,
      segundo_nombre,
      primer_apellido,
      segundo_apellido,
      // CIIU
      codigo_ciiu,
      descripcion_ciiu,
      // Ubicación
      direccion_domicilio,
      codigo_departamento,
      nombre_departamento,
      codigo_ciudad,
      nombre_ciudad,
      // Campos adicionales enviados por el frontend
      departamento,
      departamento_codigo,
      ciudad,
      ciudad_codigo,
      // Contacto
      email_factura_electronica,
      nombre_contacto,
      email_contacto,
      telefono_contacto,
      // Representante Legal
      rep_legal_nombre,
      rep_legal_apellidos,
      rep_legal_tipo_doc,
      rep_legal_num_doc,
      // Declaraciones
      declara_pep,
      declara_recursos_publicos,
      declara_obligaciones_tributarias,
      // Cupo y plazo
      tipo_cliente,
      cupo,
      plazo,
      // Documentos - CLIENTE usa certificado_sagrilaft (no formato_sangrilaft)
      url_rut,
      url_camara_comercio,
      url_certificado_sagrilaft,
      url_cedula,
      url_certificacion_bancaria,
      url_composicion_accionaria,
    } = req.body;

    const { data: tokenData } = await supabaseAxios.get(
      `/tokens_registro?token=eq.${token}&tipo=eq.cliente`,
    );

    if (!tokenData || tokenData.length === 0) {
      return res.status(404).json({ message: TOKEN_NOT_FOUND_MESSAGE });
    }

    const tokenInfo = tokenData[0];

    if (tokenInfo.usado) {
      return sendTokenDisabled(res, "usado");
    }

    const ahora = new Date();
    const fechaExpiracion = new Date(tokenInfo.expiracion);
    if (ahora > fechaExpiracion) {
      return sendTokenDisabled(res, "expirado");
    }

    // Validación de campos obligatorios básicos
    if (!url_rut || !tipo_regimen || !nit || !url_certificado_sagrilaft) {
      return res.status(400).json({
        message:
          "Faltan campos obligatorios (RUT, tipo régimen, NIT, certificado SAGRILAFT).",
      });
    }

    // Validación según tipo de régimen
    if (tipo_regimen === "persona_juridica") {
      if (!razon_social) {
        return res.status(400).json({
          message: "Para persona jurídica se requiere razón social.",
        });
      }
    } else if (tipo_regimen === "persona_natural") {
      if (!primer_nombre || !primer_apellido || !url_cedula) {
        return res.status(400).json({
          message:
            "Para persona natural se requiere nombre, apellido y cédula.",
        });
      }
    }

    const payload = {
      tipo: "cliente",
      estado: "pendiente",
      user_id: tokenInfo.generado_por,
      token,
      datos: {
        // Campos generales
        fecha_diligenciamiento,
        tipo_regimen,
        tipo_documento,
        nit,
        dv,
        razon_social,
        nombre_establecimiento,
        // Persona Natural
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        // CIIU
        codigo_ciiu,
        descripcion_ciiu,
        // Ubicación
        direccion_domicilio,
        codigo_departamento: codigo_departamento || departamento_codigo,
        nombre_departamento: nombre_departamento || departamento,
        codigo_ciudad: codigo_ciudad || ciudad_codigo,
        nombre_ciudad: nombre_ciudad || ciudad,
        // Asegurar compatibilidad con PanelAprobaciones
        departamento: departamento || nombre_departamento,
        departamento_codigo: departamento_codigo || codigo_departamento,
        ciudad: ciudad || nombre_ciudad,
        ciudad_codigo: ciudad_codigo || codigo_ciudad,
        // Contacto
        email_factura_electronica,
        nombre_contacto,
        email_contacto,
        telefono_contacto,
        // Representante Legal
        rep_legal_nombre,
        rep_legal_apellidos,
        rep_legal_tipo_doc,
        rep_legal_num_doc,
        // Declaraciones
        declara_pep,
        declara_recursos_publicos,
        declara_obligaciones_tributarias,
        // Cupo y plazo
        tipo_cliente,
        cupo,
        plazo,
        // Documentos
        url_rut,
        url_camara_comercio,
        url_certificado_sagrilaft,
        url_cedula,
        url_certificacion_bancaria,
        url_composicion_accionaria,
      },
      created_at: new Date().toISOString(),
    };

    const { data: registroPendiente } = await supabaseAxios.post(
      "/registros_pendientes",
      payload,
      { headers: { Prefer: "return=representation" } },
    );

    await marcarTokenUsado(token);

    // Enviar correo al admin de clientes
    try {
      const adminEmail = process.env.ADMIN_CLIENTES_EMAIL;
      if (adminEmail) {
        const nombreCliente =
          razon_social || `${primer_nombre} ${primer_apellido}`;
        const subject = `📢 Nuevo Registro de Cliente: ${nombreCliente}`;
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 20px; margin-bottom: 20px;">
              
              <!-- Encabezado -->
              <div style="background-color: #2e3b55; padding: 25px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Nuevo Registro de Cliente</h1>
              </div>

              <!-- Contenido Principal -->
              <div style="padding: 40px 30px; color: #333333;">
                <p style="font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 25px; color: #555555;">
                  Estimado Administrador,
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #555555;">
                  Se ha recibido un nuevo formulario de registro de cliente que requiere su revisión y aprobación.
                </p>

                <!-- Tabla de Detalles -->
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <tbody>
                    <tr>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 14px; width: 35%;">Cliente</td>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500; font-size: 14px;">${nombreCliente}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 14px;">Identificación</td>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500; font-size: 14px;">${nit}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 20px; color: #64748b; font-weight: 600; font-size: 14px;">Fecha Solicitud</td>
                      <td style="padding: 15px 20px; color: #334155; font-weight: 500; font-size: 14px;">${new Date().toLocaleDateString(
                        "es-CO",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}</td>
                    </tr>
                  </tbody>
                </table>

                <div style="text-align: center; margin-top: 35px;">
                  <span style="display: inline-block; padding: 12px 24px; background-color: #2e3b55; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Ingrese al Panel para Aprobar</span>
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
        await sendEmail(adminEmail, subject, htmlContent);
      } else {
        console.warn("ADMIN_CLIENTES_EMAIL no está configurado.");
      }
    } catch (emailError) {
      console.error("Error enviando correo al admin de clientes:", emailError);
    }

    res.status(201).json({
      message: "Registro enviado. Está pendiente de aprobación.",
      data: registroPendiente[0],
    });
  } catch (error) {
    console.error(
      "Error en registrarClientePublico:",
      error.response?.data || error.message,
    );
    if (error.response?.data?.code === "23505") {
      return res.status(409).json({
        message:
          "Ya existe un cliente registrado con este NIT o número de documento.",
      });
    }
    res.status(500).json({
      message: "Error al procesar el registro.",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/trazabilidad/registro-publico/proveedor/:token
 * Registra un proveedor usando un token válido (sin autenticación)
 */
export const registrarProveedorPublico = async (req, res) => {
  try {
    const { token } = req.params;
    const {
      url_rut,
      url_camara_comercio,
      url_certificacion_bancaria,
      url_doc_identidad_rep_legal,
      url_composicion_accionaria,
      url_certificado_sagrilaft,
      ...datosProveedorBrutos
    } = req.body;

    const { data: tokenData } = await supabaseAxios.get(
      `/tokens_registro?token=eq.${token}&tipo=eq.proveedor`,
    );

    if (!tokenData || tokenData.length === 0) {
      return res.status(404).json({ message: TOKEN_NOT_FOUND_MESSAGE });
    }

    const tokenInfo = tokenData[0];

    if (tokenInfo.usado) {
      return sendTokenDisabled(res, "usado");
    }

    const ahora = new Date();
    const fechaExpiracion = new Date(tokenInfo.expiracion);
    if (ahora > fechaExpiracion) {
      return sendTokenDisabled(res, "expirado");
    }

    if (
      !url_rut ||
      !url_certificacion_bancaria ||
      !url_doc_identidad_rep_legal ||
      !url_composicion_accionaria ||
      !url_certificado_sagrilaft
    ) {
      return res.status(400).json({
        message:
          "Faltan documentos obligatorios (RUT, Cert. Bancaria, Documento de identidad del representante legal, Certificado SAGRILAFT y Composición Accionaria).",
      });
    }

    const normalizarValor = (valor) => {
      if (valor === undefined || valor === null) return null;
      if (typeof valor === "string") {
        const trimmed = valor.trim();
        return trimmed.length === 0 ? null : trimmed;
      }
      return valor;
    };

    const {
      estado, // se ignora en el payload del registro pendiente
      ...restoDatos
    } = datosProveedorBrutos;

    const datosProveedor = Object.fromEntries(
      Object.entries(restoDatos).map(([clave, valor]) => [
        clave,
        normalizarValor(valor),
      ]),
    );

    const datosConDocumentos = {
      ...datosProveedor,
      url_rut,
      url_camara_comercio: normalizarValor(url_camara_comercio),
      url_certificacion_bancaria,
      url_doc_identidad_rep_legal,
      url_composicion_accionaria,
      url_certificado_sagrilaft,
    };

    const payload = {
      tipo: "proveedor",
      estado: "pendiente",
      user_id: tokenInfo.generado_por,
      token,
      datos: datosConDocumentos,
      created_at: new Date().toISOString(),
    };

    const { data: registroPendiente } = await supabaseAxios.post(
      "/registros_pendientes",
      payload,
      { headers: { Prefer: "return=representation" } },
    );

    await marcarTokenUsado(token);

    // Enviar correo al admin de proveedores
    try {
      const adminEmail = process.env.ADMIN_PROVEEDORES_EMAIL;
      if (adminEmail) {
        const nombreProveedor =
          datosConDocumentos.razon_social ||
          datosConDocumentos.nombre_establecimiento ||
          "Proveedor";
        const subject = `📢 Nuevo Registro de Proveedor: ${nombreProveedor}`;
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 20px; margin-bottom: 20px;">
              
              <!-- Encabezado -->
              <div style="background-color: #2e3b55; padding: 25px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Nuevo Registro de Proveedor</h1>
              </div>

              <!-- Contenido Principal -->
              <div style="padding: 40px 30px; color: #333333;">
                <p style="font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 25px; color: #555555;">
                  Estimado Administrador,
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #555555;">
                  Se ha recibido un nuevo formulario de registro de proveedor que requiere su revisión y aprobación.
                </p>

                <!-- Tabla de Detalles -->
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <tbody>
                    <tr>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 14px; width: 35%;">Proveedor</td>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500; font-size: 14px;">${nombreProveedor}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 14px;">Identificación</td>
                      <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500; font-size: 14px;">${
                        datosConDocumentos.nit || "N/A"
                      }</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 20px; color: #64748b; font-weight: 600; font-size: 14px;">Fecha Solicitud</td>
                      <td style="padding: 15px 20px; color: #334155; font-weight: 500; font-size: 14px;">${new Date().toLocaleDateString(
                        "es-CO",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}</td>
                    </tr>
                  </tbody>
                </table>

                <div style="text-align: center; margin-top: 35px;">
                  <span style="display: inline-block; padding: 12px 24px; background-color: #2e3b55; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Ingrese al Panel para Aprobar</span>
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
        await sendEmail(adminEmail, subject, htmlContent);
      } else {
        console.warn("ADMIN_PROVEEDORES_EMAIL no está configurado.");
      }
    } catch (emailError) {
      console.error(
        "Error enviando correo al admin de proveedores:",
        emailError,
      );
    }

    res.status(201).json({
      message: "Registro enviado. Está pendiente de aprobación.",
      data: registroPendiente[0],
    });
  } catch (error) {
    console.error(
      "Error en registrarProveedorPublico:",
      error.response?.data || error.message,
    );
    if (error.response?.data?.code === "23505") {
      return res.status(409).json({
        message:
          "Ya existe un proveedor registrado con este NIT o número de documento.",
      });
    }
    res.status(500).json({
      message: "Error al procesar el registro.",
      error: error.message,
    });
  }
};
