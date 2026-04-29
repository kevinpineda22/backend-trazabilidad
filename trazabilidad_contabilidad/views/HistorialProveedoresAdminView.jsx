// src/pages/trazabilidad_contabilidad/views/HistorialProveedoresAdminView.jsx
import React, { useEffect, useState } from "react";
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
  FaTruck,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaFileContract,
  FaClock,
  FaCheckCircle,
  FaClipboardCheck,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";
import SharedPagination from "../components/SharedPagination";
import "../components/SharedPagination.css";

const HistorialProveedoresAdminView = ({ onOpenExpediente, userRole }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [processingIds, setProcessingIds] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  useEffect(() => {
    setPaginaActual(1);
  }, [mostrarArchivados]);

  // Solo Super Admin y Admin Contabilidad pueden dar el check final
  const canValidate = ["super_admin", "admin"].includes(userRole);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        "/trazabilidad/admin/historial-proveedores",
      );
      setHistorial(data || []);
    } catch (error) {
      toast.error("Error al cargar proveedores.");
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
    if (!window.confirm("¿Archivar este proveedor?")) return;
    addToProcessing(id);
    const toastId = toast.loading("Archivando...");
    try {
      await api.post("/trazabilidad/admin/archivar-entidad", {
        tipo: "proveedor",
        id,
      });
      toast.update(toastId, {
        render: "Proveedor archivado.",
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
    if (!window.confirm("¿Restaurar este proveedor?")) return;
    addToProcessing(id);
    const toastId = toast.loading("Restaurando...");
    try {
      await api.post("/trazabilidad/admin/restaurar-entidad", {
        tipo: "proveedor",
        id,
      });
      toast.update(toastId, {
        render: "Proveedor restaurado.",
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
    const toastId = toast.loading(
      "Procesando validación y enviando correos...",
    );

    try {
      await api.post("/trazabilidad/admin/marcar-creado", {
        tipo: "proveedor",
        id,
      });
      toast.update(toastId, {
        render: "¡Éxito! Marcado como creado y notificadores enviados.",
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
    if (!type) return "NIT";
    return type
      .toString()
      .replace(/_/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const registrosFiltrados = historial.filter(
    (item) => !!item.is_archivado === mostrarArchivados,
  );

  const totalPaginas = Math.ceil(registrosFiltrados.length / itemsPorPagina);
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const itemsAMostrar = registrosFiltrados.slice(inicio, fin);

  if (loading) return <Loader />;
  if (historial.length === 0)
    return <MensajeVacio mensaje="No hay proveedores registrados." />;

  return (
    <>
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
            transition: "all 0.2s ease",
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
                : "No hay proveedores activos."
            }
          />
        ) : (
          <>
            <HistorialTabla>
              <thead>
                <tr className="admin-cont-table-header-left">
                  <th style={{ width: "35%" }}>Proveedor / Razón Social</th>
                  <th style={{ width: "20%" }}>Contacto</th>
                  <th style={{ width: "20%" }}>Ubicación</th>
                  <th style={{ width: "15%" }}>Datos Fiscales</th>
                  <th style={{ width: "10%", textAlign: "center" }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemsAMostrar.map((prov) => {
                  const nombreMostrar = prov.razon_social || "Sin Nombre";
                  const labelDoc = formatDocType(prov.tipo_documento);
                  const numeroDoc = prov.nit
                    ? `${prov.nit}${prov.dv ? "-" + prov.dv : ""}`
                    : "N/A";

                  return (
                    <tr
                      key={prov.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
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
                              style={{ color: "#ea580c", fontSize: "1.1rem" }}
                            >
                              <FaTruck />
                            </span>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: "#0f172a",
                              }}
                            >
                              {nombreMostrar}
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
                            {format(parseISO(prov.created_at), "d MMM yyyy", {
                              locale: es,
                            })}{" "}
                            por {prov.profiles?.nombre || "Sistema"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            fontSize: "0.85rem",
                          }}
                        >
                          {prov.email_factura_electronica && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                color: "#475569",
                              }}
                              title="Email"
                            >
                              <FaEnvelope style={{ color: "#64748b" }} />{" "}
                              {prov.email_factura_electronica}
                            </div>
                          )}
                          {(prov.telefono_contacto ||
                            prov.contacto_compras_telefono ||
                            prov.contacto_cartera_telefono) && (
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
                              {prov.telefono_contacto ||
                                prov.contacto_compras_telefono ||
                                prov.contacto_cartera_telefono}
                            </div>
                          )}
                        </div>
                      </td>
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
                            <span>{prov.ciudad || "N/A"}</span>
                            <span
                              style={{ fontSize: "0.75rem", color: "#94a3b8" }}
                            >
                              {prov.direccion_domicilio}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {prov.cupo_aprobado && (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                color: "#059669",
                              }}
                            >
                              Cupo: {prov.cupo_aprobado}
                            </span>
                          )}
                          {prov.condicion_pago && (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                color: "#d97706",
                              }}
                            >
                              Pago: {prov.condicion_pago}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={() => onOpenExpediente(prov.id)}
                            className="admin-cont-action-btn view"
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
                            (prov.is_creado ? (
                              <div
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
                                    handleMarcarCreado(prov.id, nombreMostrar)
                                  }
                                  disabled={processingIds.includes(prov.id)}
                                  style={{
                                    background: processingIds.includes(prov.id)
                                      ? "#e2e8f0"
                                      : "#ecfdf5",
                                    color: "#059669",
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
                                  {processingIds.includes(prov.id) ? (
                                    <FaSpinner className="icon-spin" />
                                  ) : (
                                    <FaClipboardCheck />
                                  )}
                                </button>
                              )
                            ))}
                          <button
                            onClick={() =>
                              mostrarArchivados
                                ? handleRestaurar(prov.id)
                                : handleArchivar(prov.id)
                            }
                            disabled={processingIds.includes(prov.id)}
                            style={{
                              background: mostrarArchivados
                                ? "#f0fdf4"
                                : "#fef2f2",
                              color: mostrarArchivados ? "#16a34a" : "#dc2626",
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
                            {processingIds.includes(prov.id) ? (
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

            <SharedPagination
              currentPage={paginaActual}
              totalPages={totalPaginas}
              onPageChange={setPaginaActual}
            />
          </>
        )}
      </div>
    </>
  );
};

export default HistorialProveedoresAdminView;
