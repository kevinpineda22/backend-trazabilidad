// trazabilidad_contabilidad/PanelAprobaciones.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import FilePreviewModal from "./FilePreviewModal";
import "./PanelAprobaciones.css";

// Importar componentes de expedientes
import ExpedienteEmpleadoView from "./views/ExpedienteEmpleadoView";
import ExpedienteProveedorView from "./views/ExpedienteProveedorView";
import ExpedienteClienteView from "./views/ExpedienteClienteView";
import { FaFolderOpen } from "react-icons/fa";

const TIPOS_FILTRO = [
  { value: "todos", label: "Todos" },
  { value: "empleado", label: "Empleados" },
  { value: "cliente", label: "Clientes" },
  { value: "proveedor", label: "Proveedores" },
];

const PanelAprobaciones = () => {
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
    if (filtroTipo === "todos") {
      return registrosPendientes;
    }
    return registrosPendientes.filter(
      (registro) => registro.tipo === filtroTipo
    );
  }, [registrosPendientes, filtroTipo]);

  const historialFiltrado = useMemo(() => {
    if (filtroTipo === "todos") {
      return historial;
    }
    return historial.filter((registro) => registro.tipo === filtroTipo);
  }, [historial, filtroTipo]);

  const contadorPorTipo = useMemo(() => {
    const base = vistaActual === "pendientes" ? registrosPendientes : historial;
    const conteo = {
      todos: base.length,
      empleado: 0,
      cliente: 0,
      proveedor: 0,
    };
    base.forEach((registro) => {
      if (conteo[registro.tipo] !== undefined) {
        conteo[registro.tipo] += 1;
      }
    });
    return conteo;
  }, [registrosPendientes, historial, vistaActual]);

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
        return {
          resumen: `Solicitud de cliente`,
          campos: [
            { label: "Cupo solicitado", value: datos.cupo || "N/A" },
            { label: "Plazo", value: datos.plazo || "N/A" },
          ],
          documentos: mapDocs([
            { label: "RUT", url: datos.url_rut },
            { label: "Cámara de Comercio", url: datos.url_camara_comercio },
            { label: "Formato SAGRILAFT", url: datos.url_formato_sangrilaft },
            { label: "Cédula", url: datos.url_cedula },
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
      case "cliente":
        return {
          titulo: `Cliente — Cupo ${datos.cupo || "N/A"}`,
          meta: documentosLabel,
        };
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
                  <div className="registro-item-header">
                    <span className={`badge-tipo ${registro.tipo}`}>
                      {registro.tipo}
                    </span>
                    <span className="registro-item-fecha">
                      {formatearFecha(registro.created_at)}
                    </span>
                  </div>
                  <p className="registro-item-resumen">
                    {resumen.titulo}
                    <span>{resumen.meta}</span>
                  </p>
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
                  Aprobar registro
                </button>
                <button
                  type="button"
                  className="action-button rechazar"
                  onClick={abrirModalRechazo}
                  disabled={loading}
                >
                  Rechazar registro
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
        <div className="estado">
          {loading
            ? "Cargando historial..."
            : "No hay historial para este filtro."}
        </div>
      );
    }

    return (
      <div className="historial-wrapper">
        <table className="historial-tabla">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Registro</th>
              <th>Fecha de registro</th>
              <th>Estado</th>
              <th>Fecha decisión</th>
              <th>Motivo rechazo</th>
              <th>Expediente</th>
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
                    <span className={`badge-tipo ${registro.tipo}`}>
                      {registro.tipo}
                    </span>
                  </td>
                  <td>
                    <div className="historial-resumen">{resumen.titulo}</div>
                    <div className="historial-meta">{resumen.meta}</div>
                  </td>
                  <td>{formatearFecha(registro.created_at)}</td>
                  <td>
                    <span className={`badge-estado estado-${estado}`}>
                      {estado}
                    </span>
                  </td>
                  <td>{fechaDecision}</td>
                  <td>{registro.motivo_rechazo || "N/A"}</td>
                  <td>
                    {estado === "aprobado" && registro.registro_aprobado_id && (
                      <button
                        type="button"
                        className="btn-ver-expediente"
                        onClick={() =>
                          abrirExpediente(
                            registro.tipo,
                            registro.registro_aprobado_id
                          )
                        }
                        title="Ver expediente completo"
                      >
                        <FaFolderOpen /> Ver Expediente
                      </button>
                    )}
                    {estado === "rechazado" && (
                      <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Si estamos viendo un expediente, mostrar el componente correspondiente
  if (vistaExpediente && expedienteId) {
    if (vistaExpediente === "empleado") {
      return (
        <ExpedienteEmpleadoView
          empleadoId={expedienteId}
          onBack={cerrarExpediente}
          onPreview={(url) => setArchivoPreview({ url, nombre: "Documento" })}
        />
      );
    }
    if (vistaExpediente === "proveedor") {
      return (
        <ExpedienteProveedorView
          proveedorId={expedienteId}
          onBack={cerrarExpediente}
          onPreview={(url) => setArchivoPreview({ url, nombre: "Documento" })}
        />
      );
    }
    if (vistaExpediente === "cliente") {
      return (
        <ExpedienteClienteView
          clienteId={expedienteId}
          onBack={cerrarExpediente}
          onPreview={(url) => setArchivoPreview({ url, nombre: "Documento" })}
        />
      );
    }
  }

  return (
    <div className="panel-aprobaciones-container">
      <div className="panel-header">
        <h1>Panel de Aprobaciones</h1>
        <p className="panel-subtitle">
          Revisa los registros generados desde los formularios públicos,
          controla los documentos y deja trazabilidad de cada decisión.
        </p>
      </div>

      {mensaje && (
        <div
          className={`alert ${
            tipoMensaje === "success" ? "alert-success" : "alert-error"
          }`}
        >
          {mensaje}
        </div>
      )}

      <div className="panel-controls">
        <div className="tabs">
          <button
            type="button"
            className={`tab ${
              vistaActual === "pendientes" ? "tab-activa" : ""
            }`}
            onClick={() => setVistaActual("pendientes")}
          >
            Pendientes
          </button>
          <button
            type="button"
            className={`tab ${vistaActual === "historial" ? "tab-activa" : ""}`}
            onClick={() => setVistaActual("historial")}
          >
            Historial
          </button>
        </div>

        <div className="tipo-filtro">
          {TIPOS_FILTRO.map(({ value, label }) => {
            const count = contadorPorTipo[value] ?? 0;
            return (
              <button
                key={value}
                type="button"
                className={`filtro-chip ${
                  filtroTipo === value ? "filtro-chip-activa" : ""
                }`}
                onClick={() => setFiltroTipo(value)}
              >
                {label}
                <span className="filtro-chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {vistaActual === "pendientes" ? renderPendientes() : renderHistorial()}

      {modalRechazoAbierto && (
        <div className="modal-overlay" onClick={cerrarModalRechazo}>
          <div
            className="modal-contenido"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Rechazar registro</h2>
            <p>Describe brevemente el motivo del rechazo.</p>
            <textarea
              className="textarea-motivo"
              placeholder="Motivo del rechazo..."
              value={motivoRechazo}
              onChange={(event) => setMotivoRechazo(event.target.value)}
            />
            <div className="modal-botones">
              <button
                type="button"
                className="btn-confirmar-rechazo"
                onClick={rechazarRegistro}
                disabled={loading || !motivoRechazo.trim()}
              >
                Confirmar rechazo
              </button>
              <button
                type="button"
                className="btn-cancelar"
                onClick={cerrarModalRechazo}
                disabled={loading}
              >
                Cancelar
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
