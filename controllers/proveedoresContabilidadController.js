// src/controllers/proveedoresContabilidadController.js
import { supabaseAxios } from "../services/supabaseClient.js";
import {
  construirConsentimiento,
  mensajeFaltantes,
} from "../services/consentimientoService.js";

// Helper para normalizar valores vacíos a null
const normalizar = (valor) => {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return valor;
};

/**
 * @route POST /api/trazabilidad/proveedores
 * Crea un proveedor con todos los campos del formulario.
 *
 * Antes solo se persistían las URLs de documentos: el resto del formulario
 * (identificación, CIIU, ubicación, contactos, declaraciones) se descartaba
 * silenciosamente. La ruta pública sí los guardaba, así que los proveedores
 * creados desde el panel interno quedaban sin actividad económica ni
 * departamento. El listado de columnas es el mismo que usa la aprobación de
 * registros pendientes sobre `proveedores_contabilidad`.
 */
export const createProveedorContabilidad = async (req, res) => {
  try {
    const {
      // Identificación
      fecha_diligenciamiento,
      tipo_regimen,
      tipo_documento,
      nit,
      dv,
      razon_social,
      nombre_establecimiento,
      // CIIU
      codigo_ciiu,
      descripcion_ciiu,
      // Ubicación
      direccion_domicilio,
      departamento,
      ciudad,
      // Contacto
      email_factura_electronica,
      contacto_cartera_nombre,
      contacto_cartera_email,
      contacto_cartera_telefono,
      contacto_compras_nombre,
      contacto_compras_email,
      contacto_compras_telefono,
      contacto_tesoreria_nombre,
      contacto_tesoreria_email,
      contacto_tesoreria_telefono,
      // Representante legal
      rep_legal_nombre,
      rep_legal_apellidos,
      rep_legal_tipo_doc,
      rep_legal_num_doc,
      // Declaraciones
      declara_pep,
      declara_recursos_publicos,
      declara_obligaciones_tributarias,
      // Condiciones comerciales
      cupo_aprobado,
      condicion_pago,
      // Documentos
      url_rut,
      url_camara_comercio,
      url_certificacion_bancaria,
      url_doc_identidad_rep_legal,
      url_composicion_accionaria,
      url_certificado_sagrilaft,

      // Nuevos campos
      registra_en_bolsa,
      url_certificado_bolsa,
      tipo_proveedor,
      federaciones_recaudo, // string or JSON
      url_certificado_fenalce,
      url_certificado_asohofrucol,
      url_certificado_fedepapa,
    } = req.body;
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Validación (Cámara de Comercio es opcional)
    if (
      !url_rut ||
      !url_certificacion_bancaria ||
      !url_doc_identidad_rep_legal ||
      !url_composicion_accionaria ||
      !url_certificado_sagrilaft
    ) {
      return res.status(400).json({
        message:
          "Faltan URLs de documentos obligatorios (RUT, Cert. Bancaria, Documento de identidad del representante legal, Certificado SAGRILAFT y Composición Accionaria).",
      });
    }

    // Sella la aceptación de cláusulas también en el alta interna: si solo se
    // capturara en el formulario público, los registros creados desde el panel
    // quedarían sin soporte descargable.
    const consentimientoResultado = construirConsentimiento({
      req,
      aceptaciones: req.body.consentimiento_clausulas ?? req.body.aceptaciones,
      fuente: req.body,
    });

    if (!consentimientoResultado.ok) {
      return res.status(400).json({
        message: mensajeFaltantes(consentimientoResultado.faltantes),
        faltantes: consentimientoResultado.faltantes,
      });
    }

    const payload = {
      user_id,
      // Evidencia de aceptación de cláusulas
      ...consentimientoResultado.consentimiento,
      // Identificación
      fecha_diligenciamiento: normalizar(fecha_diligenciamiento),
      tipo_regimen: normalizar(tipo_regimen),
      tipo_documento: normalizar(tipo_documento),
      nit: normalizar(nit),
      dv: normalizar(dv),
      razon_social: normalizar(razon_social),
      nombre_establecimiento: normalizar(nombre_establecimiento),
      // CIIU
      codigo_ciiu: normalizar(codigo_ciiu),
      descripcion_ciiu: normalizar(descripcion_ciiu),
      // Ubicación
      direccion_domicilio: normalizar(direccion_domicilio),
      departamento: normalizar(departamento),
      ciudad: normalizar(ciudad),
      // Contacto
      email_factura_electronica: normalizar(email_factura_electronica),
      contacto_cartera_nombre: normalizar(contacto_cartera_nombre),
      contacto_cartera_email: normalizar(contacto_cartera_email),
      contacto_cartera_telefono: normalizar(contacto_cartera_telefono),
      contacto_compras_nombre: normalizar(contacto_compras_nombre),
      contacto_compras_email: normalizar(contacto_compras_email),
      contacto_compras_telefono: normalizar(contacto_compras_telefono),
      contacto_tesoreria_nombre: normalizar(contacto_tesoreria_nombre),
      contacto_tesoreria_email: normalizar(contacto_tesoreria_email),
      contacto_tesoreria_telefono: normalizar(contacto_tesoreria_telefono),
      // Representante legal
      rep_legal_nombre: normalizar(rep_legal_nombre),
      rep_legal_apellidos: normalizar(rep_legal_apellidos),
      rep_legal_tipo_doc: normalizar(rep_legal_tipo_doc),
      rep_legal_num_doc: normalizar(rep_legal_num_doc),
      // Declaraciones
      declara_pep: normalizar(declara_pep),
      declara_recursos_publicos: normalizar(declara_recursos_publicos),
      declara_obligaciones_tributarias: normalizar(
        declara_obligaciones_tributarias,
      ),
      // Condiciones comerciales
      cupo_aprobado: normalizar(cupo_aprobado),
      condicion_pago: normalizar(condicion_pago),
      // Documentos
      url_rut,
      url_camara_comercio: url_camara_comercio || null,
      url_certificacion_bancaria,
      url_doc_identidad_rep_legal,
      url_composicion_accionaria,
      url_certificado_sagrilaft,

      // Nuevos campos en payload
      registra_en_bolsa,
      url_certificado_bolsa: url_certificado_bolsa || null,
      tipo_proveedor,
      federaciones_recaudo,
      url_certificado_fenalce: url_certificado_fenalce || null,
      url_certificado_asohofrucol: url_certificado_asohofrucol || null,
      url_certificado_fedepapa: url_certificado_fedepapa || null,
    };

    const { data } = await supabaseAxios.post(
      "/proveedores_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } },
    );

    res.status(201).json(data[0]);
  } catch (error) {
    console.error(
      "Error en createProveedorContabilidad:",
      error.response ? error.response.data : error.message,
    );
    if (error.response) {
      if (error.response.data?.code === "23505") {
        return res.status(409).json({
          message:
            "Ya existe un proveedor registrado con este NIT o número de documento.",
          details: error.response.data.details,
        });
      }
      return res.status(error.response.status || 400).json({
        message:
          error.response.data?.message ||
          "Error al guardar en la base de datos",
        details: error.response.data?.details,
      });
    }
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route GET /api/trazabilidad/proveedores/historial
 * (Esta función no se modifica)
 */
export const getHistorialProveedores = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    const { data, error } = await supabaseAxios.get(
      `/proveedores_contabilidad?select=*,profiles(nombre)&user_id=eq.${user_id}&order=created_at.desc`,
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialProveedores:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route PATCH /api/trazabilidad/proveedores/:id
 * ¡NUEVA FUNCIÓN! Actualiza un registro de proveedor.
 */
export const updateProveedorContabilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    if (!id) {
      return res
        .status(400)
        .json({ message: "No se proporcionó un ID para actualizar." });
    }

    // Obtenemos campos del body
    const {
      url_rut,
      url_camara_comercio,
      url_certificacion_bancaria,
      url_doc_identidad_rep_legal,
      url_composicion_accionaria,
      url_certificado_sagrilaft,
    } = req.body;

    // Payload dinámico
    const payload = {};
    if (url_rut !== undefined) payload.url_rut = url_rut;
    if (url_camara_comercio !== undefined)
      payload.url_camara_comercio = url_camara_comercio;
    if (url_certificacion_bancaria !== undefined)
      payload.url_certificacion_bancaria = url_certificacion_bancaria;
    if (url_doc_identidad_rep_legal !== undefined)
      payload.url_doc_identidad_rep_legal = url_doc_identidad_rep_legal;
    if (url_composicion_accionaria !== undefined)
      payload.url_composicion_accionaria = url_composicion_accionaria;
    if (url_certificado_sagrilaft !== undefined)
      payload.url_certificado_sagrilaft = url_certificado_sagrilaft;

    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({ message: "No se proporcionaron datos para actualizar." });
    }

    // Filtro por ID y user_id
    const { data } = await supabaseAxios.patch(
      `/proveedores_contabilidad?id=eq.${id}&user_id=eq.${user_id}`,
      payload,
      { headers: { Prefer: "return=representation" } },
    );

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: "Registro no encontrado o no tiene permiso para editarlo.",
      });
    }

    res.status(200).json(data[0]);
  } catch (error) {
    console.error(
      "Error en updateProveedorContabilidad:",
      error.response ? error.response.data : error.message,
    );
    if (error.response) {
      if (error.response.data?.code === "23505") {
        return res.status(409).json({
          message:
            "Ya existe otro proveedor registrado con este NIT o número de documento.",
          details: error.response.data.details,
        });
      }
      return res.status(error.response.status || 400).json({
        message:
          error.response.data?.message ||
          "Error al actualizar la base de datos",
        details: error.response.data?.details,
      });
    }
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};
