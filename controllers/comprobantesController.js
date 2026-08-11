// src/controllers/comprobantesController.js
//
// Entrega del comprobante de diligenciamiento en PDF.
//
// Dos caminos de descarga:
//   1. La contraparte, apenas envía el formulario público (sin sesión). Se
//      autoriza con el mismo token de registro que ya usó, que queda ligado al
//      consentimiento. No expone datos de otras contrapartes.
//   2. El personal autorizado, desde el expediente (con sesión y rol).
//
// En ambos casos el PDF se arma desde la fila almacenada, nunca desde el body.

import { supabaseAxios } from "../services/supabaseClient.js";
import {
  generarComprobantePdf,
  nombreArchivoComprobante,
} from "../services/comprobantePdfService.js";
import { getCatalogoPublico } from "../data/clausulasLegales.js";

const TABLAS = {
  cliente: "clientes_contabilidad",
  proveedor: "proveedores_contabilidad",
};

/** Escribe el PDF en la respuesta con las cabeceras de descarga. */
const enviarPdf = async (res, { tipo, registro }) => {
  const bytes = await generarComprobantePdf({ tipo, registro });
  const nombre = nombreArchivoComprobante({ tipo, registro });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
  res.setHeader("Content-Length", bytes.length);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).end(Buffer.from(bytes));
};

/**
 * @route GET /api/trazabilidad/registro-publico/clausulas
 * Catálogo de cláusulas vigentes. El formulario lo consume para mostrar el
 * texto exacto que se va a firmar: así el front nunca queda desincronizado
 * respecto de lo que se sella e imprime en el comprobante.
 */
export const getClausulasVigentes = (req, res) => {
  res.status(200).json(getCatalogoPublico());
};

/**
 * @route GET /api/trazabilidad/registro-publico/comprobante/:tipo/:token
 * Descarga por parte de la contraparte, inmediatamente después de enviar.
 *
 * El registro aún está en `registros_pendientes` (no ha sido aprobado), así
 * que se busca allí por el token con el que se diligenció.
 */
export const descargarComprobantePublico = async (req, res) => {
  try {
    const { tipo, token } = req.params;

    if (!TABLAS[tipo]) {
      return res.status(400).json({ message: "Tipo de contraparte inválido." });
    }
    if (!token || token.length < 8) {
      return res.status(400).json({ message: "Token inválido." });
    }

    const { data } = await supabaseAxios.get(
      `/registros_pendientes?token=eq.${encodeURIComponent(token)}&tipo=eq.${tipo}&select=*`,
    );

    if (!data || data.length === 0) {
      return res.status(404).json({
        message:
          "No se encontró un registro asociado a este enlace. Si ya fue aprobado, solicita el comprobante al área de contabilidad.",
      });
    }

    const registro = { ...(data[0].datos || {}) };

    await enviarPdf(res, { tipo, registro });
  } catch (error) {
    console.error("Error en descargarComprobantePublico:", error);
    res
      .status(500)
      .json({ message: "No se pudo generar el comprobante.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/admin/comprobante/:tipo/:id
 * Descarga por parte del personal autorizado, desde el expediente.
 */
export const descargarComprobanteAdmin = async (req, res) => {
  try {
    const { tipo, id } = req.params;

    if (!TABLAS[tipo]) {
      return res.status(400).json({ message: "Tipo de contraparte inválido." });
    }

    const { data } = await supabaseAxios.get(
      `/${TABLAS[tipo]}?id=eq.${encodeURIComponent(id)}&select=*`,
    );

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado." });
    }

    await enviarPdf(res, { tipo, registro: data[0] });
  } catch (error) {
    console.error("Error en descargarComprobanteAdmin:", error);
    res
      .status(500)
      .json({ message: "No se pudo generar el comprobante.", error: error.message });
  }
};
