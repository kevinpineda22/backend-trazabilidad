// src/pages/trazabilidad_contabilidad/views/HistorialClientesAdminView.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  FaFolderOpen,
  FaArchive,
  FaUndo,
  FaEye,
  FaEyeSlash,
  FaBuilding,
  FaUserTie,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaClipboardCheck,
  FaSpinner,
} from "react-icons/fa";

// Importación de componentes reutilizables
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";

const HistorialClientesAdminView = ({
  onPreview,
  onOpenExpediente,
  userRole,
}) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [processingIds, setProcessingIds] = useState([]);

  // Solo Super Admin y Admin Contabilidad pueden dar el check final
  const canValidate = ["super_admin", "admin"].includes(userRole);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/trazabilidad/admin/historial-clientes");
      setHistorial(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addToProcessing = (id) => setProcessingIds((prev) => [...prev, id]);
  const removeFromProcessing = (id) =>
    setProcessingIds((prev) => prev.filter((pid) => pid !== id));

  const handleArchivar = async (id) => {
    if (!window.confirm("¿Archivar este cliente?")) return;
    addToProcessing(id);
    const toastId = toast.loading("Archivando...");
    try {
      await api.post("/trazabilidad/admin/archivar-entidad", {
        tipo: "cliente",
        id,
      });
      toast.update(toastId, {
        render: "Cliente archivado.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      fetchData();
    } catch (error) {
      toast.update(toastId, {
        render: "Error al archivar.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      removeFromProcessing(id);
    }
  };

  const handleRestaurar = async (id) => {
    if (!window.confirm("¿Restaurar este cliente?")) return;
    addToProcessing(id);
    const toastId = toast.loading("Restaurando...");
    try {
      await api.post("/trazabilidad/admin/restaurar-entidad", {
        tipo: "cliente",
        id,
      });
      toast.update(toastId, {
        render: "Cliente restaurado.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      fetchData();
    } catch (error) {
      toast.update(toastId, {
        render: "Error al restaurar.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      removeFromProcessing(id);
    }
  };

  const handleMarcarCreado = async (id, nombre) => {
    if (
      !window.confirm(
        `¿Confirmar que ${nombre} ha sido creado por Contabilidad? Se enviará un correo de notificación.`,
      )
    )
      return;
    addToProcessing(id);
    const toastId = toast.loading("Procesando validación y enviando correos...");

    try {
      await api.post("/trazabilidad/admin/marcar-creado", {
        tipo: "cliente",
        id,
      });
      toast.update(toastId, {
        render: "¡Éxito! Marcado como creado y notificado.",
        type: "success",
        isLoading: false,
        autoClose: 4000,
      });
      fetchData();
    } catch (error) {
      console.error(error);
      toast.update(toastId, {
        render: "Error al marcar como creado.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      removeFromProcessing(id);
    }
  };

  // Helper para formatear el tipo de documento
  const formatDocType = (type) => {
    if (!type) return "NIT"; // Default si es null
    return type
      .toString()
      .replace(/_/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getNombreCliente = (cli) => {
    if (cli.razon_social) return cli.razon_social;
    const nombres = [
      cli.primer_nombre,
      cli.segundo_nombre,
      cli.primer_apellido,
      cli.segundo_apellido,
    ]
      .filter(Boolean)
      .join(" ");
    return nombres || "Sin Nombre Registrado";
  };

  const registrosFiltrados = historial.filter(
    (item) => !!item.is_archivado === mostrarArchivados,
  );

  if (loading) return <Loader />;
  if (historial.length === 0)
    return <MensajeVacio mensaje="No hay clientes registrados." />;

  return (
    <>
      {/* Toolbar Superior (Solo botón, sin título) */}
      <div
        className="admin-cont-toolbar"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <button
          className={`btn-toggle-archivados ${mostrarArchivados ? "active" : ""}`}
          onClick={() => setMostrarArchivados(!mostrarArchivados)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            background: "white",
            cursor: "pointer",
            fontWeight: 600,
            color: "#64748b",
          }}
        >
          {mostrarArchivados ? <FaEyeSlash /> : <FaEye />}
          {mostrarArchivados ? "Ver Activos" : "Ver Archivados"}
        </button>
      </div>

      <div className="admin-cont-historial-wrapper">
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .icon-spin { animation: spin 1s linear infinite; }
        `}</style>
        {registrosFiltrados.length === 0 ? (
          <MensajeVacio
            mensaje={
              mostrarArchivados
                ? "Papelera vacía."
                : "No se encontraron clientes activos."
            }
          />
        ) : (
          <HistorialTabla>
            <thead>
              <tr className="admin-cont-table-header-left">
                <th style={{ width: "35%" }}>Cliente / Razón Social</th>
                <th style={{ width: "20%" }}>Contacto</th>
                <th style={{ width: "20%" }}>Ubicación</th>
                <th style={{ width: "15%" }}>Datos Comerciales</th>
                <th style={{ width: "10%", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((cli) => {
                const nombrePrincipal = getNombreCliente(cli);
                // Lógica de documento corregida
                const labelDoc = formatDocType(cli.tipo_documento);
                const numeroDoc = cli.nit
                  ? `${cli.nit}${cli.dv ? "-" + cli.dv : ""}`
                  : cli.cedula || "N/A";

                const isCompany = !!cli.razon_social;

                return (
                  <tr
                    key={cli.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    {/* COLUMNA 1: INFO PRINCIPAL */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: isCompany ? "#2563eb" : "#059669",
                              fontSize: "1.1rem",
                            }}
                          >
                            {isCompany ? <FaBuilding /> : <FaUserTie />}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "1rem",
                              color: "#0f172a",
                            }}
                          >
                            {nombrePrincipal}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "#475569",
                            marginLeft: "24px",
                            fontWeight: 500,
                          }}
                        >
                          {labelDoc}: {numeroDoc}
                        </span>
                        {/* Auditoría Sutil */}
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#94a3b8",
                            marginTop: "4px",
                            marginLeft: "24px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <FaClock size={10} />
                          Reg:{" "}
                          {format(parseISO(cli.created_at), "d MMM yyyy", {
                            locale: es,
                          })}{" "}
                          por {cli.profiles?.nombre || "Sistema"}
                        </div>
                      </div>
                    </td>

                    {/* COLUMNA 2: CONTACTO */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          fontSize: "0.85rem",
                        }}
                      >
                        {cli.email_factura_electronica && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "#475569",
                            }}
                            title="Email Facturación"
                          >
                            <FaEnvelope style={{ color: "#64748b" }} />{" "}
                            {cli.email_factura_electronica}
                          </div>
                        )}
                        {cli.telefono_contacto && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "#475569",
                            }}
                            title="Teléfono"
                          >
                            <FaPhone style={{ color: "#64748b" }} />{" "}
                            {cli.telefono_contacto}
                          </div>
                        )}
                        {cli.nombre_contacto && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "0.75rem",
                              color: "#64748b",
                              fontStyle: "italic",
                            }}
                          >
                            <FaUserTie size={10} /> {cli.nombre_contacto}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* COLUMNA 3: UBICACIÓN */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "6px",
                          fontSize: "0.85rem",
                          color: "#475569",
                        }}
                      >
                        <FaMapMarkerAlt
                          style={{ marginTop: "3px", color: "#ef4444" }}
                        />
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span>{cli.ciudad || "Ciudad N/A"}</span>
                          <span
                            style={{ fontSize: "0.75rem", color: "#94a3b8" }}
                          >
                            {cli.departamento || "Dpto N/A"}
                          </span>
                          <span
                            style={{ fontSize: "0.75rem", color: "#94a3b8" }}
                          >
                            {cli.direccion_domicilio}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* COLUMNA 4: DATOS COMERCIALES */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {cli.cupo && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "0.85rem",
                              color: "#059669",
                              fontWeight: 600,
                            }}
                          >
                            <FaMoneyBillWave /> Cupo: {cli.cupo}
                          </div>
                        )}
                        {cli.plazo && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              padding: "2px 8px",
                              background: "#f1f5f9",
                              borderRadius: "12px",
                              color: "#475569",
                              width: "fit-content",
                            }}
                          >
                            Plazo: {cli.plazo}
                          </span>
                        )}
                        {cli.tipo_regimen && (
                          <span
                            style={{ fontSize: "0.75rem", color: "#64748b" }}
                          >
                            {cli.tipo_regimen.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* COLUMNA 5: ACCIONES */}
                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() => onOpenExpediente(cli.id)}
                          className="admin-cont-action-btn view"
                          title="Ver Expediente Digital"
                          style={{
                            background: "#eff6ff",
                            color: "#2563eb",
                            border: "none",
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FaFolderOpen />
                        </button>

                        {!mostrarArchivados &&
                          (cli.is_creado ? (
                            <div
                              title="Creado por Contabilidad"
                              style={{
                                color: "#10b981",
                                fontSize: "1.2rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "32px",
                              }}
                            >
                              <FaCheckCircle />
                            </div>
                          ) : (
                            canValidate && (
                              <button
                                onClick={() =>
                                  handleMarcarCreado(cli.id, nombrePrincipal)
                                }
                                disabled={processingIds.includes(cli.id)}
                                title="Marcar como Creado (Enviar Feedback)"
                                style={{
                                  background: processingIds.includes(cli.id)
                                    ? "#e2e8f0"
                                    : "#ecfdf5",
                                  color: processingIds.includes(cli.id)
                                    ? "#64748b"
                                    : "#059669",
                                  border: "none",
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  cursor: processingIds.includes(cli.id)
                                    ? "wait"
                                    : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {processingIds.includes(cli.id) ? (
                                  <FaSpinner className="icon-spin" />
                                ) : (
                                  <FaClipboardCheck />
                                )}
                              </button>
                            )
                          ))}

                        {/* Botón Archivar disponible para todos */}
                        <button
                          onClick={() =>
                            mostrarArchivados
                              ? handleRestaurar(cli.id)
                              : handleArchivar(cli.id)
                          }
                          disabled={processingIds.includes(cli.id)}
                          title={
                            mostrarArchivados
                              ? "Restaurar"
                              : "Archivar (Solo para mí)"
                          }
                          className={`admin-cont-action-btn ${mostrarArchivados ? "restore" : "archive"}`}
                          style={{
                            background: mostrarArchivados
                              ? "#f0fdf4"
                              : "#fef2f2",
                            color: mostrarArchivados ? "#16a34a" : "#dc2626",
                            border: "none",
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            cursor: processingIds.includes(cli.id)
                              ? "wait"
                              : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: processingIds.includes(cli.id) ? 0.6 : 1,
                          }}
                        >
                          {processingIds.includes(cli.id) ? (
                            <FaSpinner className="icon-spin" />
                          ) : mostrarArchivados ? (
                            <FaUndo />
                          ) : (
                            <FaArchive />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </HistorialTabla>
        )}
      </div>
    </>
  );
};

export default HistorialClientesAdminView;
