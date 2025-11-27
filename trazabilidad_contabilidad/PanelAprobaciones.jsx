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
  FaFileAlt,
  FaFilter,
  FaHistory,
  FaClock,
  FaSearch,
} from "react-icons/fa";

const TIPOS_FILTRO = [
  { value: "todos", label: "Todos" },
  { value: "empleado", label: "Empleados" },
  { value: "cliente", label: "Clientes" },
  { value: "proveedor", label: "Proveedores" },
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
  const mensajeTimeout = useRef(null);

  // Estados para expedientes en historial
  const [vistaExpediente, setVistaExpediente] = useState(null); // 'empleado', 'proveedor', 'cliente', o null
  const [expedienteId, setExpedienteId] = useState(null);

  // Determinar qué tipos puede ver el usuario
  const tiposPermitidos = useMemo(() => {
    if (!userRole || userRole === "admin" || userRole === "super_admin") {
      return ["empleado", "cliente", "proveedor"];
    }
    if (["admin_cliente", "admin_proveedor"].includes(userRole)) {
      return ["cliente", "proveedor"];
    }
    // Si el rol es admin_empleado, retorna ['empleado']
    const tipo = userRole.replace("admin_", "");
    return [tipo];
  }, [userRole]);

  // Ajustar filtro inicial según rol
  useEffect(() => {
    if (
      !userRole ||
      userRole === "admin" ||
      userRole === "super_admin" ||
      userRole === "authenticated"
    ) {
      // Si es admin o no tiene rol específico, mantener 'todos' o lo que estaba
    } else {
      if (["admin_cliente", "admin_proveedor"].includes(userRole)) {
        setFiltroTipo("todos");
      } else {
        // Si tiene un rol específico, forzar el filtro a su tipo
        const tipo = userRole.replace("admin_", "");
        setFiltroTipo(tipo);
      }
    }
  }, [userRole]);

  useEffect(() => {
    if (vistaActual === "pendientes") {
      cargarPendientes();
    } else {
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
    let filtrados = registrosPendientes;

    // 1. Filtrar por permisos de rol (seguridad)
    if (
      userRole &&
      userRole !== "admin" &&
      userRole !== "super_admin" &&
      userRole !== "authenticated"
    ) {
      if (["admin_cliente", "admin_proveedor"].includes(userRole)) {
        filtrados = filtrados.filter((r) =>
          ["cliente", "proveedor"].includes(r.tipo)
        );
      } else {
        const tipoPermitido = userRole.replace("admin_", "");
        filtrados = filtrados.filter((r) => r.tipo === tipoPermitido);
      }
    }

    // 2. Filtrar por selección de UI
    if (filtroTipo === "todos") {
      return filtrados;
    }
    return filtrados.filter((registro) => registro.tipo === filtroTipo);
  }, [registrosPendientes, filtroTipo, userRole]);

  const historialFiltrado = useMemo(() => {
    let filtrados = historial;

    // 1. Filtrar por permisos de rol (seguridad)
    if (
      userRole &&
      userRole !== "admin" &&
      userRole !== "super_admin" &&
      userRole !== "authenticated"
    ) {
      if (["admin_cliente", "admin_proveedor"].includes(userRole)) {
        filtrados = filtrados.filter((r) =>
          ["cliente", "proveedor"].includes(r.tipo)
        );
      } else {
        const tipoPermitido = userRole.replace("admin_", "");
        filtrados = filtrados.filter((r) => r.tipo === tipoPermitido);
      }
    }

    // 2. Filtrar por selección de UI
    if (filtroTipo === "todos") {
      return filtrados;
    }
    return filtrados.filter((registro) => registro.tipo === filtroTipo);
  }, [historial, filtroTipo, userRole]);

  const contadorPorTipo = useMemo(() => {
    const base = vistaActual === "pendientes" ? registrosPendientes : historial;
    // Filtrar base por rol primero para que los conteos sean correctos
    let basePermitida = base;
    if (
      userRole &&
      userRole !== "admin" &&
      userRole !== "super_admin" &&
      userRole !== "authenticated"
    ) {
      if (["admin_cliente", "admin_proveedor"].includes(userRole)) {
        basePermitida = base.filter((r) =>
          ["cliente", "proveedor"].includes(r.tipo)
        );
      } else {
        const tipoPermitido = userRole.replace("admin_", "");
        basePermitida = base.filter((r) => r.tipo === tipoPermitido);
      }
    }

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
  }, [registrosPendientes, historial, vistaActual, userRole]);

  useEffect(() => {
    if (vistaActual !== "pendientes") return;
    if (pendientesFiltrados.length === 0) {
      setRegistroSeleccionado(null);
      return;
    }
    if (!registroSeleccionado) {
      setRegistroSeleccionado(pendientesFiltrados[0]);
      return;
    }
    const sigueDisponible = pendientesFiltrados.some(
      (registro) => registro.id === registroSeleccionado.id
    );
    if (!sigueDisponible) {
      setRegistroSeleccionado(pendientesFiltrados[0]);
    }
  }, [pendientesFiltrados, registroSeleccionado, vistaActual]);

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
    if (registro?.tipo && filtroTipo !== registro.tipo) {
      setFiltroTipo(registro.tipo);
    }
  };

  const aprobarRegistro = async () => {
    if (!registroSeleccionado) return;
    if (!window.confirm("¿Estás seguro de aprobar este registro?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/aprobaciones/aprobar/${registroSeleccionado.id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      mostrarMensaje("Registro aprobado exitosamente.", "success");
      await Promise.all([cargarPendientes(), cargarHistorial()]);
    } catch (error) {
      console.error("Error al aprobar:", error);
      mostrarMensaje("Error al aprobar el registro.", "error");
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

              {detalleSeleccionado.campos.length > 0 && (
                <div className="detalle-grid">
                  {detalleSeleccionado.campos.map((campo) => (
                    <div key={campo.label} className="detalle-campo">
                      <label>{campo.label}</label>
                      <span>{campo.value || "N/A"}</span>
                    </div>
                  ))}
                </div>
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
                      ) : (
                        <span className="accion-na">—</span>
                      )}
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

              if (["admin_cliente", "admin_proveedor"].includes(userRole)) {
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
                !["admin_cliente", "admin_proveedor"].includes(userRole)
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
