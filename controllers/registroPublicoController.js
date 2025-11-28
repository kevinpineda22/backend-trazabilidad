// controllers/registroPublicoController.js
import { supabaseAxios } from "../services/supabaseClient.js";
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
      cedula,
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
      `/tokens_registro?token=eq.${token}&tipo=eq.empleado`
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
        cedula,
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
      { headers: { Prefer: "return=representation" } }
    );

    await marcarTokenUsado(token);

    res.status(201).json({
      message: "Registro enviado. Está pendiente de aprobación.",
      data: registroPendiente[0],
    });
  } catch (error) {
    console.error(
      "Error en registrarEmpleadoPublico:",
      error.response?.data || error.message
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
      `/tokens_registro?token=eq.${token}&tipo=eq.cliente`
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
      if (!razon_social || !url_camara_comercio) {
        return res.status(400).json({
          message:
            "Para persona jurídica se requiere razón social y cámara de comercio.",
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
        codigo_departamento,
        nombre_departamento,
        codigo_ciudad,
        nombre_ciudad,
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
      { headers: { Prefer: "return=representation" } }
    );

    await marcarTokenUsado(token);

    res.status(201).json({
      message: "Registro enviado. Está pendiente de aprobación.",
      data: registroPendiente[0],
    });
  } catch (error) {
    console.error(
      "Error en registrarClientePublico:",
      error.response?.data || error.message
    );
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
      `/tokens_registro?token=eq.${token}&tipo=eq.proveedor`
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
      ])
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
      { headers: { Prefer: "return=representation" } }
    );

    await marcarTokenUsado(token);

    res.status(201).json({
      message: "Registro enviado. Está pendiente de aprobación.",
      data: registroPendiente[0],
    });
  } catch (error) {
    console.error(
      "Error en registrarProveedorPublico:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Error al procesar el registro.",
      error: error.message,
    });
  }
};
