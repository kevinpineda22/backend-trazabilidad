// src/controllers/clientesContabilidadController.js
import { supabaseAxios } from "../services/supabaseClient.js";

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
 * @route POST /api/trazabilidad/clientes
 * Crea un nuevo registro de cliente con todos los campos
 */
export const createClienteContabilidad = async (req, res) => {
  try {
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
      cupo,
      plazo,
      // Documentos - CLIENTES usa certificado_sagrilaft
      url_rut,
      url_camara_comercio,
      url_certificado_sagrilaft,
      url_cedula,
      url_certificacion_bancaria,
      url_composicion_accionaria,
    } = req.body;

    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Validación básica
    if (!nit || !tipo_regimen) {
      return res.status(400).json({
        message: "NIT y tipo de régimen son obligatorios.",
      });
    }

    const payload = {
      user_id,
      // Campos generales
      fecha_diligenciamiento: normalizar(fecha_diligenciamiento),
      tipo_regimen: normalizar(tipo_regimen),
      tipo_documento: normalizar(tipo_documento),
      nit: normalizar(nit),
      dv: normalizar(dv),
      razon_social: normalizar(razon_social),
      nombre_establecimiento: normalizar(nombre_establecimiento),
      // Persona Natural
      primer_nombre: normalizar(primer_nombre),
      segundo_nombre: normalizar(segundo_nombre),
      primer_apellido: normalizar(primer_apellido),
      segundo_apellido: normalizar(segundo_apellido),
      // CIIU
      codigo_ciiu: normalizar(codigo_ciiu),
      descripcion_ciiu: normalizar(descripcion_ciiu),
      // Ubicación
      direccion_domicilio: normalizar(direccion_domicilio),
      departamento: normalizar(departamento),
      departamento_codigo: normalizar(departamento_codigo),
      ciudad: normalizar(ciudad),
      ciudad_codigo: normalizar(ciudad_codigo),
      // Contacto
      email_factura_electronica: normalizar(email_factura_electronica),
      nombre_contacto: normalizar(nombre_contacto),
      email_contacto: normalizar(email_contacto),
      telefono_contacto: normalizar(telefono_contacto),
      // Representante Legal
      rep_legal_nombre: normalizar(rep_legal_nombre),
      rep_legal_apellidos: normalizar(rep_legal_apellidos),
      rep_legal_tipo_doc: normalizar(rep_legal_tipo_doc),
      rep_legal_num_doc: normalizar(rep_legal_num_doc),
      // Declaraciones
      declara_pep: normalizar(declara_pep),
      declara_recursos_publicos: normalizar(declara_recursos_publicos),
      declara_obligaciones_tributarias: normalizar(
        declara_obligaciones_tributarias
      ),
      // Cupo y plazo
      cupo: normalizar(cupo),
      plazo: normalizar(plazo),
      // Documentos
      url_rut: normalizar(url_rut),
      url_camara_comercio: normalizar(url_camara_comercio),
      url_certificado_sagrilaft: normalizar(url_certificado_sagrilaft),
      url_cedula: normalizar(url_cedula),
      url_certificacion_bancaria: normalizar(url_certificacion_bancaria),
      url_composicion_accionaria: normalizar(url_composicion_accionaria),
      created_at: new Date().toISOString(),
    };

    const { data } = await supabaseAxios.post(
      "/clientes_contabilidad",
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    res.status(201).json(data[0]);
  } catch (error) {
    console.error(
      "Error en createClienteContabilidad:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      return res.status(error.response.status || 400).json({
        message:
          error.response.data?.message ||
          "Error al guardar en la base de datos",
        details: error.response.data?.details || error,
      });
    }
    res.status(500).json({
      message: "Error interno del servidor.",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/clientes/historial
 * (Esta función no necesita cambios, el 'select=*' tomará las nuevas columnas)
 */
export const getHistorialClientes = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    const { data, error } = await supabaseAxios.get(
      `/clientes_contabilidad?select=*,profiles(nombre)&user_id=eq.${user_id}&order=created_at.desc`
    );
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    console.error("Error en getHistorialClientes:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

/**
 * @route PATCH /api/trazabilidad/clientes/:id
 * Actualiza un cliente existente con todos los campos
 */
export const updateClienteContabilidad = async (req, res) => {
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
      cupo,
      plazo,
      // Documentos
      url_rut,
      url_camara_comercio,
      url_certificado_sagrilaft,
      url_cedula,
      url_certificacion_bancaria,
      url_composicion_accionaria,
    } = req.body;

    // Construir payload dinámicamente
    const payload = {};
    if (fecha_diligenciamiento !== undefined)
      payload.fecha_diligenciamiento = normalizar(fecha_diligenciamiento);
    if (tipo_regimen !== undefined)
      payload.tipo_regimen = normalizar(tipo_regimen);
    if (tipo_documento !== undefined)
      payload.tipo_documento = normalizar(tipo_documento);
    if (nit !== undefined) payload.nit = normalizar(nit);
    if (dv !== undefined) payload.dv = normalizar(dv);
    if (razon_social !== undefined)
      payload.razon_social = normalizar(razon_social);
    if (nombre_establecimiento !== undefined)
      payload.nombre_establecimiento = normalizar(nombre_establecimiento);
    if (primer_nombre !== undefined)
      payload.primer_nombre = normalizar(primer_nombre);
    if (segundo_nombre !== undefined)
      payload.segundo_nombre = normalizar(segundo_nombre);
    if (primer_apellido !== undefined)
      payload.primer_apellido = normalizar(primer_apellido);
    if (segundo_apellido !== undefined)
      payload.segundo_apellido = normalizar(segundo_apellido);
    if (codigo_ciiu !== undefined)
      payload.codigo_ciiu = normalizar(codigo_ciiu);
    if (descripcion_ciiu !== undefined)
      payload.descripcion_ciiu = normalizar(descripcion_ciiu);
    if (direccion_domicilio !== undefined)
      payload.direccion_domicilio = normalizar(direccion_domicilio);
    if (departamento !== undefined)
      payload.departamento = normalizar(departamento);
    if (departamento_codigo !== undefined)
      payload.departamento_codigo = normalizar(departamento_codigo);
    if (ciudad !== undefined) payload.ciudad = normalizar(ciudad);
    if (ciudad_codigo !== undefined)
      payload.ciudad_codigo = normalizar(ciudad_codigo);
    if (email_factura_electronica !== undefined)
      payload.email_factura_electronica = normalizar(email_factura_electronica);
    if (nombre_contacto !== undefined)
      payload.nombre_contacto = normalizar(nombre_contacto);
    if (email_contacto !== undefined)
      payload.email_contacto = normalizar(email_contacto);
    if (telefono_contacto !== undefined)
      payload.telefono_contacto = normalizar(telefono_contacto);
    if (rep_legal_nombre !== undefined)
      payload.rep_legal_nombre = normalizar(rep_legal_nombre);
    if (rep_legal_apellidos !== undefined)
      payload.rep_legal_apellidos = normalizar(rep_legal_apellidos);
    if (rep_legal_tipo_doc !== undefined)
      payload.rep_legal_tipo_doc = normalizar(rep_legal_tipo_doc);
    if (rep_legal_num_doc !== undefined)
      payload.rep_legal_num_doc = normalizar(rep_legal_num_doc);
    if (declara_pep !== undefined)
      payload.declara_pep = normalizar(declara_pep);
    if (declara_recursos_publicos !== undefined)
      payload.declara_recursos_publicos = normalizar(declara_recursos_publicos);
    if (declara_obligaciones_tributarias !== undefined)
      payload.declara_obligaciones_tributarias = normalizar(
        declara_obligaciones_tributarias
      );
    if (cupo !== undefined) payload.cupo = normalizar(cupo);
    if (plazo !== undefined) payload.plazo = normalizar(plazo);
    if (url_rut !== undefined) payload.url_rut = normalizar(url_rut);
    if (url_camara_comercio !== undefined)
      payload.url_camara_comercio = normalizar(url_camara_comercio);
    if (url_certificado_sagrilaft !== undefined)
      payload.url_certificado_sagrilaft = normalizar(url_certificado_sagrilaft);
    if (url_cedula !== undefined) payload.url_cedula = normalizar(url_cedula);
    if (url_certificacion_bancaria !== undefined)
      payload.url_certificacion_bancaria = normalizar(
        url_certificacion_bancaria
      );
    if (url_composicion_accionaria !== undefined)
      payload.url_composicion_accionaria = normalizar(
        url_composicion_accionaria
      );

    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({ message: "No se proporcionaron datos para actualizar." });
    }

    const { data } = await supabaseAxios.patch(
      `/clientes_contabilidad?id=eq.${id}&user_id=eq.${user_id}`,
      payload,
      { headers: { Prefer: "return=representation" } }
    );

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: "Registro no encontrado o no tiene permiso para editarlo.",
      });
    }

    res.status(200).json(data[0]);
  } catch (error) {
    console.error(
      "Error en updateClienteContabilidad:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
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
/**
 * @route GET /api/trazabilidad/clientes/admin/expediente/:id
 * Obtiene el expediente completo de un cliente por ID
 */
export const getExpedienteClienteAdmin = async (req, res) => {
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
