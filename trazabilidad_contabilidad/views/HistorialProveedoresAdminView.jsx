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
} from "react-icons/fa";
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";

const HistorialProveedoresAdminView = ({
  onOpenExpediente,
  userRole,
  routePermission,
}) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  const hasAdminRole = ["super_admin", "admin", "admin_proveedor"].includes(
    userRole,
  );
  const hasRouteAccess = routePermission === "full_access";
  const canEdit = hasAdminRole || hasRouteAccess;
  const isReadOnly = !canEdit;

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

  const handleArchivar = async (id) => {
    if (!window.confirm("¿Archivar este proveedor?")) return;
    try {
      await api.post("/trazabilidad/admin/archivar-entidad", {
        tipo: "proveedor",
        id,
      });
      toast.success("Proveedor archivado.");
      fetchData();
    } catch (error) {
      toast.error("Error al archivar.");
    }
  };

  const handleRestaurar = async (id) => {
    if (!window.confirm("¿Restaurar este proveedor?")) return;
    try {
      await api.post("/trazabilidad/admin/restaurar-entidad", {
        tipo: "proveedor",
        id,
      });
      toast.success("Proveedor restaurado.");
      fetchData();
    } catch (error) {
      toast.error("Error al restaurar.");
    }
  };

  const handleMarcarCreado = async (id, nombre) => {
    if (
      !window.confirm(
        `¿Confirmar que ${nombre} ha sido creado por Contabilidad? Se enviará un correo de notificación.`,
      )
    )
      return;
    try {
      await api.post("/trazabilidad/admin/marcar-creado", {
        tipo: "proveedor",
        id,
      });
      toast.success("Marcado como creado y notificado.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error al marcar como creado."); // OJO: Feedback
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

  if (loading) return <Loader />;
  if (historial.length === 0)
    return <MensajeVacio mensaje="No hay proveedores registrados." />;

  return (
    <>
      {/* Toolbar Superior (Solo botón) */}
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
        {registrosFiltrados.length === 0 ? (
          <MensajeVacio
            mensaje={
              mostrarArchivados
                ? "Papelera vacía."
                : "No hay proveedores activos."
            }
          />
        ) : (
          <HistorialTabla>
            <thead>
              <tr className="admin-cont-table-header-left">
                <th style={{ width: "35%" }}>Proveedor / Razón Social</th>
                <th style={{ width: "20%" }}>Contacto</th>
                <th style={{ width: "20%" }}>Ubicación</th>
                <th style={{ width: "15%" }}>Datos Fiscales</th>
                <th style={{ width: "10%", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((prov) => {
                const nombreMostrar =
                  prov.razon_social || prov.nombre_contacto || "Sin Nombre";
                // Lógica documento corregida
                const labelDoc = formatDocType(prov.tipo_documento);
                const numeroDoc = prov.nit
                  ? `${prov.nit}${prov.dv ? "-" + prov.dv : ""}`
                  : "N/A";

                return (
                  <tr
                    key={prov.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    {/* INFO PRINCIPAL */}
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
                        {/* META SUTIL */}
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

                    {/* CONTACTO */}
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
                        {prov.telefono_contacto && (
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
                            {prov.telefono_contacto}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* UBICACIÓN */}
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

                    {/* DATOS FISCALES */}
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
                        {prov.tipo_regimen && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.75rem",
                              color: "#64748b",
                            }}
                          >
                            <FaFileContract />{" "}
                            {prov.tipo_regimen.replace(/_/g, " ")}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ACCIONES */}
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
                          title="Ver Expediente"
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

                        {!isReadOnly &&
                          !mostrarArchivados &&
                          (prov.is_creado ? (
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
                            <button
                              onClick={() =>
                                handleMarcarCreado(prov.id, nombreMostrar)
                              }
                              title="Marcar como Creado (Enviar Feedback)"
                              style={{
                                background: "#ecfdf5",
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
                              <FaClipboardCheck />
                            </button>
                          ))}

                        {!isReadOnly && (
                          <button
                            onClick={() =>
                              mostrarArchivados
                                ? handleRestaurar(prov.id)
                                : handleArchivar(prov.id)
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
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {mostrarArchivados ? <FaUndo /> : <FaArchive />}
                          </button>
                        )}
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

export default HistorialProveedoresAdminView;
