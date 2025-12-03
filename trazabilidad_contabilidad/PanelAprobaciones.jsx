// trazabilidad_contabilidad/PanelAprobaciones.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import FilePreviewModal from "./FilePreviewModal";
import "./PanelAprobaciones.css";

// Importar componentes de expedientes
import ExpedienteEmpleadoView from "./views/ExpedienteEmpleadoView";
import ExpedienteProveedorView from "./views/ExpedienteProveedorView";
import ExpedienteClienteView from "./views/ExpedienteClienteView";
import {
  FaFolderOpen,
  FaCheck,
  FaTimes,
  FaFilter,
  FaHistory,
  FaClock,
  FaEdit,
} from "react-icons/fa";

const TIPOS_FILTRO = [
  { value: "todos", label: "Todos" },
  { value: "empleado", label: "Empleados" },
  { value: "cliente", label: "Clientes" },
  { value: "proveedor", label: "Proveedores" },
];

const CLIENTE_FIELDS = [
  {
    key: "fecha_diligenciamiento",
    label: "Fecha diligenciamiento",
    type: "date",
  },
  { key: "tipo_regimen", label: "Tipo de régimen" },
  { key: "tipo_documento", label: "Tipo de documento" },
  { key: "nit", label: "NIT" },
  { key: "dv", label: "DV" },
  { key: "razon_social", label: "Razón social" },
  { key: "nombre_establecimiento", label: "Nombre establecimiento" },
  { key: "primer_nombre", label: "Primer nombre" },
  { key: "segundo_nombre", label: "Segundo nombre" },
  { key: "primer_apellido", label: "Primer apellido" },
  { key: "segundo_apellido", label: "Segundo apellido" },
  { key: "codigo_ciiu", label: "Código CIIU" },
  { key: "descripcion_ciiu", label: "Descripción CIIU" },
  { key: "direccion_domicilio", label: "Dirección domicilio" },
  { key: "departamento", label: "Departamento" },
  { key: "ciudad", label: "Ciudad" },
  { key: "email_factura_electronica", label: "Email factura electrónica" },
  { key: "nombre_contacto", label: "Nombre contacto" },
  { key: "email_contacto", label: "Email contacto" },
  { key: "telefono_contacto", label: "Teléfono contacto" },
  { key: "rep_legal_nombre", label: "Rep. Legal - Nombre" },
  { key: "rep_legal_apellidos", label: "Rep. Legal - Apellidos" },
  { key: "rep_legal_tipo_doc", label: "Rep. Legal - Tipo doc." },
  { key: "rep_legal_num_doc", label: "Rep. Legal - Núm. doc." },
  { key: "declara_pep", label: "Declara PEP" },
  { key: "declara_recursos_publicos", label: "Declara recursos públicos" },
  {
    key: "declara_obligaciones_tributarias",
    label: "Declara obligaciones tributarias",
  },
  { key: "cupo", label: "Cupo solicitado" },
  { key: "plazo", label: "Plazo" },
];

const EMPLEADO_FIELDS = [
  { key: "nombre", label: "Nombre" },
  { key: "apellidos", label: "Apellidos" },
  { key: "cedula", label: "Cédula" },
  { key: "contacto", label: "Contacto" },
  { key: "correo_electronico", label: "Correo electrónico" },
  { key: "direccion", label: "Dirección" },
];

const PROVEEDOR_FIELDS = [
  {
    key: "fecha_diligenciamiento",
    label: "Fecha diligenciamiento",
    type: "date",
  },
  { key: "tipo_regimen", label: "Tipo de régimen" },
  { key: "tipo_documento", label: "Tipo de documento" },
  { key: "nit", label: "NIT" },
  { key: "dv", label: "DV" },
  { key: "razon_social", label: "Razón social" },
  { key: "nombre_establecimiento", label: "Nombre establecimiento" },
  { key: "codigo_ciiu", label: "Código CIIU" },
  { key: "direccion_domicilio", label: "Dirección domicilio" },
  { key: "departamento", label: "Departamento" },
  { key: "ciudad", label: "Ciudad" },
  { key: "email_factura_electronica", label: "Email factura electrónica" },
  { key: "nombre_contacto", label: "Nombre contacto" },
  { key: "email_contacto", label: "Email contacto" },
  { key: "telefono_contacto", label: "Teléfono contacto" },
  { key: "rep_legal_nombre", label: "Rep. Legal - Nombre" },
  { key: "rep_legal_apellidos", label: "Rep. Legal - Apellidos" },
  { key: "rep_legal_tipo_doc", label: "Rep. Legal - Tipo doc." },
  { key: "rep_legal_num_doc", label: "Rep. Legal - Núm. doc." },
  { key: "declara_pep", label: "Declara PEP" },
  { key: "declara_recursos_publicos", label: "Declara recursos públicos" },
  {
    key: "declara_obligaciones_tributarias",
    label: "Declara obligaciones tributarias",
  },
];

const PanelAprobaciones = ({ userRole }) => {
  const [registrosPendientes, setRegistrosPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [vistaActual, setVistaActual] = useState("pendientes");
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [modalRechazoAbierto, setModalRechazoAbierto] = useState(false);
  const [archivoPreview, setArchivoPreview] = useState(null);
  const [cupoAprobado, setCupoAprobado] = useState("");
  const [fechaContratacion, setFechaContratacion] = useState(""); // Nuevo estado
  const [nombreCargo, setNombreCargo] = useState(""); // Nuevo estado: Nombre de Cargo
  const [sede, setSede] = useState(""); // Nuevo estado: Sede
  const [datosEditables, setDatosEditables] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);
  const [errorCampo, setErrorCampo] = useState(null); // Nuevo estado para el campo con error
  const mensajeTimeout = useRef(null);

  // Estados para expedientes en historial
  const [vistaExpediente, setVistaExpediente] = useState(null); // 'empleado', 'proveedor', 'cliente', o null
  const [expedienteId, setExpedienteId] = useState(null);

  // Determinar qué tipos puede ver el usuario
  const tiposPermitidos = useMemo(() => {
    if (!userRole || userRole === "admin" || userRole === "super_admin") {
      return ["empleado", "cliente", "proveedor"];
    }
    if (
      [
        "admin_cliente",
        "admin_clientes",
        "admin_proveedor",
        "admin_proveedores",
      ].includes(userRole)
    ) {
      return ["cliente", "proveedor"];
    }
    // Si el rol es admin_empleado, retorna ['empleado']
    const tipo = userRole.replace("admin_", "");
    return [tipo];
  }, [userRole]);

  // Ajustar filtro inicial según rol
  useEffect(() => {
    const isAdmin =
      !userRole || ["admin", "super_admin", "authenticated"].includes(userRole);

    if (!isAdmin) {
      if (
        [
          "admin_cliente",
          "admin_clientes",
          "admin_proveedor",
          "admin_proveedores",
        ].includes(userRole)
      ) {
        setFiltroTipo("todos");
      } else {
        const tipo = userRole.replace("admin_", "");
        setFiltroTipo(tipo);
      }
    }
  }, [userRole]);

  useEffect(() => {
    if (vistaActual === "pendientes") {
      cargarPendientes();
    } else if (vistaActual === "historial") {
      cargarHistorial();
    }
  }, [vistaActual]);

  useEffect(() => {
    return () => {
      if (mensajeTimeout.current) {
        clearTimeout(mensajeTimeout.current);
      }
    };
  }, []);

  const cargarPendientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/aprobaciones/pendientes`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      setRegistrosPendientes(data);
    } catch (error) {
      console.error("Error al cargar pendientes:", error);
      mostrarMensaje("Error al cargar registros pendientes.", "error");
      setRegistrosPendientes([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/aprobaciones/historial`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      setHistorial(data);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      mostrarMensaje("Error al cargar historial.", "error");
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    if (mensajeTimeout.current) {
      clearTimeout(mensajeTimeout.current);
    }
    mensajeTimeout.current = setTimeout(() => {
      setMensaje("");
      setTipoMensaje("");
    }, 4000);
  };

  const pendientesFiltrados = useMemo(() => {
    const filtradosPorRol = registrosPendientes.filter((r) =>
      tiposPermitidos.includes(r.tipo)
    );

    if (filtroTipo === "todos") {
      return filtradosPorRol;
    }
    return filtradosPorRol.filter((registro) => registro.tipo === filtroTipo);
  }, [registrosPendientes, filtroTipo, tiposPermitidos]);

  const historialFiltrado = useMemo(() => {
    const filtradosPorRol = historial.filter((r) =>
      tiposPermitidos.includes(r.tipo)
    );

    if (filtroTipo === "todos") {
      return filtradosPorRol;
    }
    return filtradosPorRol.filter((registro) => registro.tipo === filtroTipo);
  }, [historial, filtroTipo, tiposPermitidos]);

  const contadorPorTipo = useMemo(() => {
    let base = vistaActual === "pendientes" ? registrosPendientes : historial;

    const basePermitida = base.filter((r) => tiposPermitidos.includes(r.tipo));

    const conteo = {
      todos: basePermitida.length,
      empleado: 0,
      cliente: 0,
      proveedor: 0,
    };

    basePermitida.forEach((registro) => {
      if (conteo[registro.tipo] !== undefined) {
        conteo[registro.tipo] += 1;
      }
    });
    return conteo;
  }, [registrosPendientes, historial, vistaActual, tiposPermitidos]);

  // Efecto para actualizar la selección si el registro seleccionado ya no está en la lista
  useEffect(() => {
    if (!registroSeleccionado) return;

    const sigueDisponible = pendientesFiltrados.some(
      (r) => r.id === registroSeleccionado.id
    );

    if (!sigueDisponible) {
      setRegistroSeleccionado(null);
    }
  }, [pendientesFiltrados, registroSeleccionado]);

  const formatearFecha = (fecha) => {
    if (!fecha) return "N/A";
    return new Date(fecha).toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toTitle = (valor) =>
    valor
      ? valor
          .toString()
          .replace(/_/g, " ")
          .replace(/\b\w/g, (letra) => letra.toUpperCase())
      : "N/A";

  const contarDocumentos = (datos = {}) =>
    Object.keys(datos).filter(
      (clave) => clave.startsWith("url_") && datos[clave]
    ).length;

  const mapDocs = (documentos = []) =>
    documentos.filter((doc) => Boolean(doc.url));

  const obtenerDetalleRegistro = (registro) => {
    if (!registro) {
      return { resumen: "", campos: [], documentos: [] };
    }

    const { tipo, datos = {} } = registro;

    switch (tipo) {
      case "empleado": {
        const nombreCompleto = `${datos.nombre || ""} ${
          datos.apellidos || ""
        }`.trim();
        return {
          resumen: nombreCompleto || "Empleado",
          campos: [
            { label: "Nombre", value: datos.nombre || "N/A" },
            { label: "Apellidos", value: datos.apellidos || "N/A" },
            { label: "Cédula", value: datos.cedula || "N/A" },
            { label: "Contacto", value: datos.contacto || "N/A" },
            {
              label: "Correo electrónico",
              value: datos.correo_electronico || "N/A",
            },
            { label: "Dirección", value: datos.direccion || "N/A" },
          ],
          documentos: mapDocs([
            { label: "Hoja de Vida", url: datos.url_hoja_de_vida },
            { label: "Cédula", url: datos.url_cedula },
            {
              label: "Certificado Bancario",
              url: datos.url_certificado_bancario,
            },
            { label: "Habeas Data", url: datos.url_habeas_data },
            { label: "Autorización Firma", url: datos.url_autorizacion_firma },
          ]),
        };
      }

      case "cliente": {
        const razonSocialCliente =
          datos.razon_social ||
          `${datos.primer_nombre || ""} ${
            datos.primer_apellido || ""
          }`.trim() ||
          "Cliente";
        return {
          resumen: razonSocialCliente,
          campos: [
            {
              label: "Fecha diligenciamiento",
              value: datos.fecha_diligenciamiento
                ? new Date(datos.fecha_diligenciamiento).toLocaleDateString(
                    "es-CO"
                  )
                : "N/A",
            },
            { label: "Tipo de régimen", value: toTitle(datos.tipo_regimen) },
            {
              label: "Tipo de documento",
              value: toTitle(datos.tipo_documento),
            },
            { label: "NIT", value: datos.nit || "N/A" },
            { label: "DV", value: datos.dv || "N/A" },
            { label: "Razón social", value: datos.razon_social || "N/A" },
            {
              label: "Nombre establecimiento",
              value: datos.nombre_establecimiento || "N/A",
            },
            { label: "Primer nombre", value: datos.primer_nombre || "N/A" },
            { label: "Segundo nombre", value: datos.segundo_nombre || "N/A" },
            { label: "Primer apellido", value: datos.primer_apellido || "N/A" },
            {
              label: "Segundo apellido",
              value: datos.segundo_apellido || "N/A",
            },
            { label: "Código CIIU", value: datos.codigo_ciiu || "N/A" },
            {
              label: "Descripción CIIU",
              value: datos.descripcion_ciiu || "N/A",
            },
            {
              label: "Dirección domicilio",
              value: datos.direccion_domicilio || "N/A",
            },
            { label: "Departamento", value: datos.departamento || "N/A" },
            { label: "Ciudad", value: datos.ciudad || "N/A" },
            {
              label: "Email factura electrónica",
              value: datos.email_factura_electronica || "N/A",
            },
            { label: "Nombre contacto", value: datos.nombre_contacto || "N/A" },
            { label: "Email contacto", value: datos.email_contacto || "N/A" },
            {
              label: "Teléfono contacto",
              value: datos.telefono_contacto || "N/A",
            },
            {
              label: "Rep. Legal - Nombre",
              value: datos.rep_legal_nombre || "N/A",
            },
            {
              label: "Rep. Legal - Apellidos",
              value: datos.rep_legal_apellidos || "N/A",
            },
            {
              label: "Rep. Legal - Tipo doc.",
              value: toTitle(datos.rep_legal_tipo_doc),
            },
            {
              label: "Rep. Legal - Núm. doc.",
              value: datos.rep_legal_num_doc || "N/A",
            },
            { label: "Declara PEP", value: datos.declara_pep || "N/A" },
            {
              label: "Declara recursos públicos",
              value: datos.declara_recursos_publicos || "N/A",
            },
            {
              label: "Declara obligaciones tributarias",
              value: datos.declara_obligaciones_tributarias || "N/A",
            },
            { label: "Cupo solicitado", value: datos.cupo || "N/A" },
            { label: "Plazo", value: datos.plazo || "N/A" },
          ],
          documentos: mapDocs([
            { label: "RUT", url: datos.url_rut },
            { label: "Cámara de Comercio", url: datos.url_camara_comercio },
            {
              label: "Certificación Bancaria",
              url: datos.url_certificacion_bancaria,
            },
            { label: "Cédula", url: datos.url_cedula },
            {
              label: "Certificado SAGRILAFT",
              url: datos.url_certificado_sagrilaft,
            },
            {
              label: "Composición Accionaria",
              url: datos.url_composicion_accionaria,
            },
          ]),
        };
      }

      case "proveedor": {
        const razonSocial =
          datos.razon_social || datos.nombre_contacto || "Proveedor";
        return {
          resumen: razonSocial,
          campos: [
            {
              label: "Fecha diligenciamiento",
              value: datos.fecha_diligenciamiento
                ? new Date(datos.fecha_diligenciamiento).toLocaleDateString(
                    "es-CO"
                  )
                : "N/A",
            },
            { label: "Tipo de régimen", value: toTitle(datos.tipo_regimen) },
            {
              label: "Tipo de documento",
              value: toTitle(datos.tipo_documento),
            },
            { label: "NIT", value: datos.nit || "N/A" },
            { label: "DV", value: datos.dv || "N/A" },
            { label: "Razón social", value: datos.razon_social || "N/A" },
            {
              label: "Nombre establecimiento",
              value: datos.nombre_establecimiento || "N/A",
            },
            { label: "Código CIIU", value: datos.codigo_ciiu || "N/A" },
            {
              label: "Dirección domicilio",
              value: datos.direccion_domicilio || "N/A",
            },
            { label: "Departamento", value: datos.departamento || "N/A" },
            { label: "Ciudad", value: datos.ciudad || "N/A" },
            {
              label: "Email factura electrónica",
              value: datos.email_factura_electronica || "N/A",
            },
            { label: "Nombre contacto", value: datos.nombre_contacto || "N/A" },
            { label: "Email contacto", value: datos.email_contacto || "N/A" },
            {
              label: "Teléfono contacto",
              value: datos.telefono_contacto || "N/A",
            },
            {
              label: "Rep. Legal - Nombre",
              value: datos.rep_legal_nombre || "N/A",
            },
            {
              label: "Rep. Legal - Apellidos",
              value: datos.rep_legal_apellidos || "N/A",
            },
            {
              label: "Rep. Legal - Tipo doc.",
              value: toTitle(datos.rep_legal_tipo_doc),
            },
            {
              label: "Rep. Legal - Núm. doc.",
              value: datos.rep_legal_num_doc || "N/A",
            },
            { label: "Declara PEP", value: datos.declara_pep || "N/A" },
            {
              label: "Declara recursos públicos",
              value: datos.declara_recursos_publicos || "N/A",
            },
            {
              label: "Declara obligaciones tributarias",
              value: datos.declara_obligaciones_tributarias || "N/A",
            },
          ],
          documentos: mapDocs([
            { label: "RUT", url: datos.url_rut },
            { label: "Cámara de Comercio", url: datos.url_camara_comercio },
            {
              label: "Certificación Bancaria",
              url: datos.url_certificacion_bancaria,
            },
            {
              label: "Documento Rep. Legal",
              url: datos.url_doc_identidad_rep_legal,
            },
            {
              label: "Certificado SAGRILAFT",
              url: datos.url_certificado_sagrilaft,
            },
            {
              label: "Composición Accionaria",
              url: datos.url_composicion_accionaria,
            },
          ]),
        };
      }

      default:
        return {
          resumen: "Registro",
          campos: Object.entries(datos).map(([label, value]) => ({
            label,
            value: value ?? "N/A",
          })),
          documentos: [],
        };
    }
  };

  const obtenerResumenLista = (registro) => {
    const { tipo, datos = {} } = registro;
    const totalDocumentos = contarDocumentos(datos);
    const documentosLabel = `${totalDocumentos} documento${
      totalDocumentos === 1 ? "" : "s"
    }`;

    switch (tipo) {
      case "empleado": {
        const nombreCompleto = `${datos.nombre || ""} ${
          datos.apellidos || ""
        }`.trim();
        return {
          titulo: nombreCompleto || "Empleado pendiente",
          meta: documentosLabel,
        };
      }
      case "cliente": {
        const razonSocialClienteTitulo =
          datos.razon_social ||
          `${datos.primer_nombre || ""} ${
            datos.primer_apellido || ""
          }`.trim() ||
          "Cliente pendiente";
        const nitDisplay = datos.nit
          ? `NIT ${datos.nit}${datos.dv ? `-${datos.dv}` : ""}`
          : "Sin NIT";
        return {
          titulo: razonSocialClienteTitulo,
          meta: `${nitDisplay} • ${documentosLabel}`,
        };
      }
      case "proveedor":
        return {
          titulo:
            datos.razon_social ||
            datos.nombre_contacto ||
            "Proveedor pendiente",
          meta: documentosLabel,
        };
      default:
        return {
          titulo: "Registro pendiente",
          meta: documentosLabel,
        };
    }
  };

  const detalleSeleccionado = useMemo(
    () => obtenerDetalleRegistro(registroSeleccionado),
    [registroSeleccionado]
  );

  const handleSeleccionRegistro = (registro) => {
    setRegistroSeleccionado(registro);
    setCupoAprobado("");
    setFechaContratacion(""); // Resetear fecha
    setNombreCargo(""); // Resetear cargo
    setSede(""); // Resetear sede
    setModoEdicion(false); // Resetear modo edición
    setErrorCampo(null); // Resetear error de campo
    if (registro?.datos) {
      setDatosEditables({ ...registro.datos });
    } else {
      setDatosEditables({});
    }
    // Eliminado filtro automático al seleccionar
  };

  const aprobarRegistro = async () => {
    if (!registroSeleccionado) return;
    if (!window.confirm("¿Estás seguro de aprobar este registro?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const payload = {};
      if (registroSeleccionado.tipo === "proveedor") {
        payload.cupoAprobado = cupoAprobado;
      }

      // Enviar datos editados para todos los tipos
      payload.datosAprobados = datosEditables;

      if (registroSeleccionado.tipo === "empleado") {
        payload.fechaContratacion = fechaContratacion;
        payload.nombreCargo = nombreCargo;
        payload.sede = sede;
      }

      console.log("Enviando aprobación:", payload);

      await axios.post(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/aprobaciones/aprobar/${registroSeleccionado.id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      mostrarMensaje("Registro aprobado exitosamente.", "success");
      await Promise.all([cargarPendientes(), cargarHistorial()]);
    } catch (error) {
      console.error("Error al aprobar:", error);
      const msg =
        error.response?.data?.message || "Error al aprobar el registro.";
      mostrarMensaje(msg, "error");

      // Detectar campo duplicado en el error
      if (error.response?.data?.details) {
        const match = error.response.data.details.match(/Key \((.*?)\)=/);
        if (match && match[1]) {
          setErrorCampo(match[1]);
          setModoEdicion(true); // Abrir modo edición automáticamente
          mostrarMensaje(
            `El campo "${match[1]}" ya existe. Por favor cámbielo.`,
            "error"
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const abrirModalRechazo = () => {
    if (!registroSeleccionado) return;
    setModalRechazoAbierto(true);
  };

  const cerrarModalRechazo = () => {
    setModalRechazoAbierto(false);
    setMotivoRechazo("");
  };

  const rechazarRegistro = async () => {
    if (!registroSeleccionado) return;
    if (!motivoRechazo.trim()) {
      mostrarMensaje("Indica un motivo para rechazar el registro.", "error");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/aprobaciones/rechazar/${registroSeleccionado.id}`,
        { motivo: motivoRechazo },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      mostrarMensaje("Registro rechazado.", "success");
      cerrarModalRechazo();
      await Promise.all([cargarPendientes(), cargarHistorial()]);
    } catch (error) {
      console.error("Error al rechazar:", error);
      mostrarMensaje("Error al rechazar el registro.", "error");
    } finally {
      setLoading(false);
    }
  };

  const abrirPreviewArchivo = (url, nombre) => {
    setArchivoPreview({ url, nombre });
  };

  const abrirExpediente = (tipo, id) => {
    setVistaExpediente(tipo);
    setExpedienteId(id);
  };

  const cerrarExpediente = () => {
    setVistaExpediente(null);
    setExpedienteId(null);
  };

  const renderPendientes = () => {
    if (pendientesFiltrados.length === 0) {
      return (
        <div className="estado">
          {loading
            ? "Cargando registros pendientes..."
            : "No hay registros pendientes para este filtro."}
        </div>
      );
    }

    return (
      <div className="pendientes-layout">
        <aside className="lista-registros">
          <div className="lista-header">
            <h3>Solicitudes ({pendientesFiltrados.length})</h3>
          </div>
          <ul className="registro-lista">
            {pendientesFiltrados.map((registro) => {
              const resumen = obtenerResumenLista(registro);
              const activo = registroSeleccionado?.id === registro.id;
              return (
                <li
                  key={registro.id}
                  className={`registro-item ${
                    activo ? "registro-item-activo" : ""
                  }`}
                  onClick={() => handleSeleccionRegistro(registro)}
                >
                  <div className="registro-item-top">
                    <span className={`badge-tipo ${registro.tipo}`}>
                      {registro.tipo}
                    </span>
                    <span className="registro-item-fecha">
                      {formatearFecha(registro.created_at)}
                    </span>
                  </div>
                  <div className="registro-item-content">
                    <h4 className="registro-item-titulo">{resumen.titulo}</h4>
                    <p className="registro-item-meta">{resumen.meta}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="detalle-panel">
          {registroSeleccionado ? (
            <>
              <div className="detalle-header">
                <div className="detalle-meta">
                  <span className={`badge-tipo ${registroSeleccionado.tipo}`}>
                    {registroSeleccionado.tipo}
                  </span>
                  <span>{formatearFecha(registroSeleccionado.created_at)}</span>
                  <span>
                    {detalleSeleccionado.documentos.length} documento
                    {detalleSeleccionado.documentos.length === 1 ? "" : "s"}
                  </span>
                </div>
                <h2 className="detalle-titulo">
                  {detalleSeleccionado.resumen}
                </h2>
              </div>

              {modoEdicion ? (
                <div className="detalle-grid-editable">
                  <div className="detalle-editable-header">
                    <h3>Editar Información</h3>
                    <button
                      className="btn-cancelar-edicion"
                      onClick={() => setModoEdicion(false)}
                    >
                      Cancelar Edición
                    </button>
                  </div>
                  {(registroSeleccionado.tipo === "cliente"
                    ? CLIENTE_FIELDS
                    : registroSeleccionado.tipo === "empleado"
                    ? EMPLEADO_FIELDS
                    : registroSeleccionado.tipo === "proveedor"
                    ? PROVEEDOR_FIELDS
                    : []
                  ).map((field) => (
                    <div key={field.key} className="detalle-campo-editable">
                      <label
                        className={
                          errorCampo === field.key ? "label-error" : ""
                        }
                      >
                        {field.label}{" "}
                        {errorCampo === field.key && "(Duplicado)"}
                      </label>
                      <input
                        type={field.type || "text"}
                        value={datosEditables[field.key] || ""}
                        onChange={(e) => {
                          setDatosEditables({
                            ...datosEditables,
                            [field.key]: e.target.value,
                          });
                          if (errorCampo === field.key) setErrorCampo(null);
                        }}
                        className={`input-editable ${
                          errorCampo === field.key ? "input-error" : ""
                        }`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                detalleSeleccionado.campos.length > 0 && (
                  <div className="detalle-grid">
                    {["cliente", "empleado", "proveedor"].includes(
                      registroSeleccionado.tipo
                    ) && (
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          marginBottom: "0.5rem",
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          className="btn-editar-cliente"
                          onClick={() => setModoEdicion(true)}
                        >
                          <FaEdit /> Editar Información
                        </button>
                      </div>
                    )}
                    {detalleSeleccionado.campos.map((campo) => (
                      <div key={campo.label} className="detalle-campo">
                        <label>{campo.label}</label>
                        <span>{campo.value || "N/A"}</span>
                      </div>
                    ))}
                  </div>
                )
              )}

              <div className="detalle-docs">
                {detalleSeleccionado.documentos.length > 0 ? (
                  detalleSeleccionado.documentos.map((doc) => (
                    <button
                      key={doc.label}
                      type="button"
                      className="doc-button"
                      onClick={() => abrirPreviewArchivo(doc.url, doc.label)}
                    >
                      <span aria-hidden>📄</span>
                      {doc.label}
                    </button>
                  ))
                ) : (
                  <span className="detalle-sin-documentos">
                    No se adjuntaron documentos.
                  </span>
                )}
              </div>

              {registroSeleccionado.tipo === "proveedor" && (
                <div className="detalle-cupo-aprobado">
                  <label>Cupo Aprobado</label>
                  <input
                    type="text"
                    value={cupoAprobado}
                    onChange={(e) => setCupoAprobado(e.target.value)}
                    placeholder="Ingrese el cupo aprobado (números o letras)"
                    className="input-cupo-aprobado"
                  />
                </div>
              )}

              {registroSeleccionado.tipo === "empleado" && (
                <div className="detalle-cupo-aprobado">
                  <label>Fecha de Contratación</label>
                  <input
                    type="date"
                    value={fechaContratacion}
                    onChange={(e) => setFechaContratacion(e.target.value)}
                    className="input-cupo-aprobado"
                  />
                  <label style={{ marginTop: "10px", display: "block" }}>
                    Nombre de Cargo
                  </label>
                  <input
                    type="text"
                    value={nombreCargo}
                    onChange={(e) => setNombreCargo(e.target.value)}
                    placeholder="Ingrese el cargo"
                    className="input-cupo-aprobado"
                  />
                  <label style={{ marginTop: "10px", display: "block" }}>
                    Sede
                  </label>
                  <input
                    type="text"
                    value={sede}
                    onChange={(e) => setSede(e.target.value)}
                    placeholder="Ingrese la sede"
                    className="input-cupo-aprobado"
                  />
                </div>
              )}

              <div className="detalle-acciones">
                <button
                  type="button"
                  className="action-button aprobar"
                  onClick={aprobarRegistro}
                  disabled={loading}
                >
                  <FaCheck /> Aprobar registro
                </button>
                <button
                  type="button"
                  className="action-button rechazar"
                  onClick={abrirModalRechazo}
                  disabled={loading}
                >
                  <FaTimes /> Rechazar registro
                </button>
              </div>
            </>
          ) : (
            <div className="estado">
              Selecciona un registro de la lista para revisar los documentos.
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderHistorial = () => {
    if (historialFiltrado.length === 0) {
      return (
        <div className="estado-vacio">
          <div className="icono-vacio">📜</div>
          <h3>Historial vacío</h3>
          <p>No hay registros en el historial para el filtro seleccionado.</p>
        </div>
      );
    }

    return (
      <div className="historial-container">
        <div className="historial-table-wrapper">
          <table className="historial-tabla">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Solicitante / Entidad</th>
                <th>Fecha Registro</th>
                <th>Estado</th>
                <th>Fecha Decisión</th>
                <th>Detalles</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historialFiltrado.map((registro) => {
                const resumen = obtenerResumenLista(registro);
                const estado = registro.estado || "pendiente";
                const fechaDecision = registro.fecha_aprobacion
                  ? formatearFecha(registro.fecha_aprobacion)
                  : registro.fecha_rechazo
                  ? formatearFecha(registro.fecha_rechazo)
                  : "N/A";

                return (
                  <tr key={registro.id}>
                    <td>
                      <span className={`badge-tipo-sm ${registro.tipo}`}>
                        {registro.tipo}
                      </span>
                    </td>
                    <td>
                      <div className="historial-nombre">{resumen.titulo}</div>
                      <div className="historial-subtext">{resumen.meta}</div>
                    </td>
                    <td>{formatearFecha(registro.created_at)}</td>
                    <td>
                      <span className={`badge-estado estado-${estado}`}>
                        {estado}
                      </span>
                    </td>
                    <td>
                      <div className="fecha-decision">{fechaDecision}</div>
                      {registro.motivo_rechazo && (
                        <div
                          className="motivo-rechazo-tooltip"
                          title={registro.motivo_rechazo}
                        >
                          (Ver motivo)
                        </div>
                      )}
                    </td>
                    <td>
                      {registro.motivo_rechazo ? (
                        <span className="texto-motivo">
                          {registro.motivo_rechazo}
                        </span>
                      ) : (
                        <span className="texto-ok">Sin observaciones</span>
                      )}
                    </td>
                    <td>
                      <div className="acciones-historial">
                        {estado === "aprobado" &&
                        registro.registro_aprobado_id ? (
                          <button
                            type="button"
                            className="btn-icon-expediente"
                            onClick={() =>
                              abrirExpediente(
                                registro.tipo,
                                registro.registro_aprobado_id
                              )
                            }
                            title="Ver expediente completo"
                          >
                            <FaFolderOpen />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Si estamos viendo un expediente, mostrar el componente correspondiente
  if (vistaExpediente && expedienteId) {
    let content = null;
    if (vistaExpediente === "empleado") {
      content = (
        <ExpedienteEmpleadoView
          empleadoId={expedienteId}
          onBack={cerrarExpediente}
          onPreview={(url) => setArchivoPreview({ url, nombre: "Documento" })}
        />
      );
    } else if (vistaExpediente === "proveedor") {
      content = (
        <ExpedienteProveedorView
          proveedorId={expedienteId}
          onBack={cerrarExpediente}
          onPreview={(url) => setArchivoPreview({ url, nombre: "Documento" })}
        />
      );
    } else if (vistaExpediente === "cliente") {
      content = (
        <ExpedienteClienteView
          clienteId={expedienteId}
          onBack={cerrarExpediente}
          onPreview={(url) => setArchivoPreview({ url, nombre: "Documento" })}
        />
      );
    }

    if (content) {
      return (
        <>
          {content}
          {archivoPreview && (
            <FilePreviewModal
              isOpen
              fileUrl={archivoPreview.url}
              onClose={() => setArchivoPreview(null)}
            />
          )}
        </>
      );
    }
  }

  return (
    <div className="panel-aprobaciones-container">
      <div className="panel-header-main">
        <div className="header-content">
          <h1>Panel de Aprobaciones</h1>
          <p className="panel-subtitle">
            Gestión centralizada de solicitudes y trazabilidad documental.
          </p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{registrosPendientes.length}</span>
            <span className="stat-label">Pendientes</span>
          </div>
        </div>
      </div>

      {mensaje && (
        <div
          className={`alert-message ${
            tipoMensaje === "success" ? "alert-success" : "alert-error"
          }`}
        >
          {tipoMensaje === "success" ? <FaCheck /> : <FaTimes />}
          {mensaje}
        </div>
      )}

      <div className="panel-controls-wrapper">
        <div className="tabs-container">
          <button
            type="button"
            className={`tab-button ${
              vistaActual === "pendientes" ? "tab-active" : ""
            }`}
            onClick={() => setVistaActual("pendientes")}
          >
            <FaClock /> Pendientes
          </button>
          <button
            type="button"
            className={`tab-button ${
              vistaActual === "historial" ? "tab-active" : ""
            }`}
            onClick={() => setVistaActual("historial")}
          >
            <FaHistory /> Historial
          </button>
        </div>

        <div className="filtros-container">
          <div className="filtro-label">
            <FaFilter /> Filtrar por:
          </div>
          <div className="filtros-list">
            {TIPOS_FILTRO.filter((f) => {
              if (
                !userRole ||
                userRole === "admin" ||
                userRole === "super_admin" ||
                userRole === "authenticated"
              )
                return true;

              if (
                [
                  "admin_cliente",
                  "admin_proveedor",
                  "admin_proveedores",
                ].includes(userRole)
              ) {
                return ["cliente", "proveedor", "todos"].includes(f.value);
              }

              const tipoPermitido = userRole.replace("admin_", "");
              return f.value === tipoPermitido || f.value === "todos";
            }).map(({ value, label }) => {
              const count = contadorPorTipo[value] ?? 0;
              if (
                value === "todos" &&
                userRole &&
                userRole !== "admin" &&
                userRole !== "super_admin" &&
                userRole !== "authenticated" &&
                ![
                  "admin_cliente",
                  "admin_proveedor",
                  "admin_proveedores",
                ].includes(userRole)
              )
                return null;

              return (
                <button
                  key={value}
                  type="button"
                  className={`filtro-chip ${
                    filtroTipo === value ? "filtro-chip-active" : ""
                  }`}
                  onClick={() => setFiltroTipo(value)}
                >
                  {label}
                  <span className="filtro-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel-content-area">
        {vistaActual === "pendientes" ? renderPendientes() : renderHistorial()}
      </div>

      {modalRechazoAbierto && (
        <div className="modal-overlay-backdrop" onClick={cerrarModalRechazo}>
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Rechazar Solicitud</h2>
              <button className="btn-close-modal" onClick={cerrarModalRechazo}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Por favor, indica el motivo por el cual se rechaza esta
                solicitud. Esta información será visible en el historial.
              </p>
              <textarea
                className="textarea-motivo"
                placeholder="Escribe el motivo del rechazo aquí..."
                value={motivoRechazo}
                onChange={(event) => setMotivoRechazo(event.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancelar"
                onClick={cerrarModalRechazo}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirmar-rechazo"
                onClick={rechazarRegistro}
                disabled={loading || !motivoRechazo.trim()}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {archivoPreview && (
        <FilePreviewModal
          isOpen
          fileUrl={archivoPreview.url}
          onClose={() => setArchivoPreview(null)}
        />
      )}
    </div>
  );
};

export default PanelAprobaciones;
