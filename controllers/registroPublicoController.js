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
      !url_habeas_data
    ) {
      return res.status(400).json({
        message:
          "Todos los documentos son obligatorios (CV, Cédula, Cert. Bancario y Habeas Data).",
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
      url_rut,
      cupo,
      plazo,
      url_camara_comercio,
      url_formato_sangrilaft,
      url_cedula,
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

    if (
      !url_rut ||
      !cupo ||
      !plazo ||
      !url_camara_comercio ||
      !url_formato_sangrilaft ||
      !url_cedula
    ) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios.",
      });
    }

    const payload = {
      tipo: "cliente",
      estado: "pendiente",
      user_id: tokenInfo.generado_por,
      token,
      datos: {
        cupo,
        plazo,
        url_rut,
        url_camara_comercio,
        url_formato_sangrilaft,
        url_cedula,
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
