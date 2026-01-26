// src/pages/trazabilidad_contabilidad/views/HistorialEmpleadosAdminView.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  FaUser,
  FaFolderOpen,
  FaArchive,
  FaUndo,
  FaEye,
  FaEyeSlash,
  FaIdCard,
  FaBriefcase,
  FaMapMarkerAlt,
  FaEnvelope,
  FaClock,
  FaCheckCircle,
  FaClipboardCheck,
} from "react-icons/fa";

import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";

const HistorialEmpleadosAdminView = ({
  onPreview,
  onOpenExpediente,
  userRole,
  routePermission,
}) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  const hasAdminRole = ["super_admin", "admin", "admin_empleado"].includes(
    userRole,
  );
  const hasRouteAccess = routePermission === "full_access";
  const canEdit = hasAdminRole || hasRouteAccess;
  const isReadOnly = !canEdit;

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/trazabilidad/admin/historial-empleados");
      setHistorial(data || []);
    } catch (error) {
      toast.error("Error al cargar empleados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleArchivar = async (id) => {
    if (!window.confirm("¿Archivar este empleado?")) return;
    try {
      await api.post("/trazabilidad/admin/archivar-entidad", {
        tipo: "empleado",
        id,
      });
      toast.success("Empleado archivado.");
      fetchData();
    } catch (error) {
      toast.error("Error al archivar.");
    }
  };

  const handleRestaurar = async (id) => {
    if (!window.confirm("¿Restaurar este empleado?")) return;
    try {
      await api.post("/trazabilidad/admin/restaurar-entidad", {
        tipo: "empleado",
        id,
      });
      toast.success("Empleado restaurado.");
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
        tipo: "empleado",
        id,
      });
      toast.success("Marcado como creado y notificado.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error al marcar como creado."); // OJO: Mensaje de error personalizado
    }
  };

  // Helper para formatear el tipo de documento
  const formatDocType = (type) => {
    if (!type) return "DOC"; // Default si es null
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
    return <MensajeVacio mensaje="No hay empleados registrados." />;

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
                : "No hay empleados activos."
            }
          />
        ) : (
          <HistorialTabla>
            <thead>
              <tr className="admin-cont-table-header-left">
                <th style={{ width: "35%" }}>Colaborador</th>
                <th style={{ width: "25%" }}>Cargo y Sede</th>
                <th style={{ width: "20%" }}>Contacto</th>
                <th style={{ width: "10%" }}>Contratación</th>
                <th style={{ width: "10%", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((emp) => {
                // Lógica de documento corregida
                const labelDoc = formatDocType(emp.tipo_documento);
                const numeroDoc = emp.cedula || "N/A";

                return (
                  <tr
                    key={emp.id}
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
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              background: "#e0e7ff",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#4338ca",
                              fontSize: "0.9rem",
                            }}
                          >
                            <FaUser />
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "1rem",
                              color: "#0f172a",
                            }}
                          >
                            {emp.nombre} {emp.apellidos}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.85rem",
                            color: "#475569",
                            marginLeft: "40px",
                          }}
                        >
                          <FaIdCard style={{ color: "#94a3b8" }} />
                          {labelDoc}: {numeroDoc}
                        </div>
                        {/* META SUTIL */}
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#94a3b8",
                            marginTop: "4px",
                            marginLeft: "40px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <FaClock size={10} />
                          Creado por {emp.profiles?.nombre || "Sistema"}
                        </div>
                      </div>
                    </td>

                    {/* CARGO Y SEDE */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          <FaBriefcase style={{ color: "#64748b" }} />{" "}
                          {emp.nombre_cargo || "Cargo sin definir"}
                        </div>
                        {emp.sede && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "0.8rem",
                              color: "#64748b",
                            }}
                          >
                            <FaMapMarkerAlt /> Sede: {emp.sede}
                          </div>
                        )}
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
                        {emp.correo_electronico && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "#475569",
                            }}
                            title="Email"
                          >
                            <FaEnvelope style={{ color: "#94a3b8" }} />{" "}
                            {emp.correo_electronico}
                          </div>
                        )}
                        {emp.contacto && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#64748b",
                              marginLeft: "20px",
                            }}
                          >
                            Tel: {emp.contacto}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* FECHA CONTRATACIÓN */}
                    <td>
                      {emp.fecha_contratacion ? (
                        <span
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "#0f172a",
                            background: "#f1f5f9",
                            padding: "4px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          {format(
                            parseISO(emp.fecha_contratacion),
                            "d MMM yy",
                            { locale: es },
                          )}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                          -
                        </span>
                      )}
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
                          onClick={() => onOpenExpediente(emp.id)}
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
                          (emp.is_creado ? (
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
                                handleMarcarCreado(
                                  emp.id,
                                  `${emp.nombre} ${emp.apellidos}`,
                                )
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
                                ? handleRestaurar(emp.id)
                                : handleArchivar(emp.id)
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

export default HistorialEmpleadosAdminView;
