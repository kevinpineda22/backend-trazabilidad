// src/pages/trazabilidad_contabilidad/views/HistorialEmpleadosAdminView.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import { format, parseISO } from "date-fns";
import {
  FaUser,
  FaFolderOpen,
  FaArchive,
  FaUndo,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

// Importamos los componentes compartidos
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";

const HistorialEmpleadosAdminView = ({ onPreview, onOpenExpediente }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/trazabilidad/admin/historial-empleados");
      setHistorial(data || []);
    } catch (error) {
      toast.error("Error al cargar el historial de empleados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleArchivar = async (id) => {
    if (!window.confirm("¿Estás seguro de archivar este empleado?")) return;
    try {
      await api.post("/trazabilidad/admin/archivar-entidad", {
        tipo: "empleado",
        id,
      });
      toast.success("Empleado archivado correctamente.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error al archivar el empleado.");
    }
  };

  const handleRestaurar = async (id) => {
    if (!window.confirm("¿Estás seguro de restaurar este empleado?")) return;
    try {
      await api.post("/trazabilidad/admin/restaurar-entidad", {
        tipo: "empleado",
        id,
      });
      toast.success("Empleado restaurado correctamente.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error al restaurar el empleado.");
    }
  };

  const registrosFiltrados = historial.filter(
    (item) => !!item.is_archivado === mostrarArchivados
  );

  if (loading) return <Loader />;

  if (historial.length === 0)
    return <MensajeVacio mensaje="No se han creado empleados." />;

  return (
    <div className="admin-cont-historial-wrapper">
      <div
        className="admin-cont-toolbar"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <button
          className="btn-toggle-archivados"
          onClick={() => setMostrarArchivados(!mostrarArchivados)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background: mostrarArchivados ? "#e2e8f0" : "#fff",
            cursor: "pointer",
            fontWeight: "500",
            color: "#333",
          }}
        >
          {mostrarArchivados ? <FaEyeSlash /> : <FaEye />}
          {mostrarArchivados ? "Ver Activos" : "Ver Archivados"}
        </button>
      </div>

      {registrosFiltrados.length === 0 ? (
        <MensajeVacio
          mensaje={
            mostrarArchivados
              ? "No hay empleados archivados."
              : "No hay empleados activos."
          }
        />
      ) : (
        <HistorialTabla>
          <thead>
            <tr className="admin-cont-table-header-centered">
              <th>Creado por</th>
              <th>Nombre Empleado</th>
              <th>Cédula</th>
              <th>Fecha Contratación</th>
              <th>Fecha Creación</th>
              <th>Expediente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.map((emp) => (
              <tr key={emp.id}>
                <td className="admin-cont-cell-centered">
                  <div className="user-cell">
                    <FaUser />
                    {emp.profiles?.nombre || "N/A"}
                  </div>
                </td>
                <td>
                  {emp.nombre} {emp.apellidos}
                </td>
                <td className="admin-cont-cell-centered">
                  {emp.cedula || "N/A"}
                </td>
                <td className="admin-cont-cell-centered">
                  {emp.fecha_contratacion
                    ? format(parseISO(emp.fecha_contratacion), "dd/MM/yyyy")
                    : "N/A"}
                </td>
                <td className="admin-cont-cell-centered">
                  {format(parseISO(emp.created_at), "dd/MM/yy hh:mm a")}
                </td>

                <td className="admin-cont-cell-centered">
                  <button
                    onClick={() => onOpenExpediente(emp.id)}
                    className="admin-cont-expediente-button"
                    title="Ver expediente digital"
                  >
                    <FaFolderOpen /> Ver Expediente
                  </button>
                </td>
                <td className="admin-cont-cell-centered">
                  {mostrarArchivados ? (
                    <button
                      onClick={() => handleRestaurar(emp.id)}
                      className="btn-icon-restaurar"
                      title="Restaurar"
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: "#2ecc71",
                        fontSize: "1.2rem",
                      }}
                    >
                      <FaUndo />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchivar(emp.id)}
                      className="btn-icon-archivar"
                      title="Archivar"
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: "#e74c3c",
                        fontSize: "1.2rem",
                      }}
                    >
                      <FaArchive />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </HistorialTabla>
      )}
    </div>
  );
};

export default HistorialEmpleadosAdminView;
