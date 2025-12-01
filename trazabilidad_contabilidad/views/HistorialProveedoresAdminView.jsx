// src/pages/trazabilidad_contabilidad/views/HistorialProveedoresAdminView.jsx
import React, { useEffect, useState } from "react";
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
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";

const HistorialProveedoresAdminView = ({ onOpenExpediente }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        "/trazabilidad/admin/historial-proveedores"
      );
      setHistorial(data || []);
    } catch (error) {
      toast.error("Error al cargar el historial de proveedores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleArchivar = async (id) => {
    if (!window.confirm("¿Estás seguro de archivar este proveedor?")) return;
    try {
      await api.post("/trazabilidad/admin/archivar-entidad", {
        tipo: "proveedor",
        id,
      });
      toast.success("Proveedor archivado correctamente.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error al archivar el proveedor.");
    }
  };

  const handleRestaurar = async (id) => {
    if (!window.confirm("¿Estás seguro de restaurar este proveedor?")) return;
    try {
      await api.post("/trazabilidad/admin/restaurar-entidad", {
        tipo: "proveedor",
        id,
      });
      toast.success("Proveedor restaurado correctamente.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error al restaurar el proveedor.");
    }
  };

  const registrosFiltrados = historial.filter(
    (item) => !!item.is_archivado === mostrarArchivados
  );

  if (loading) return <Loader />;

  if (historial.length === 0)
    return <MensajeVacio mensaje="No se han creado proveedores." />;

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
              ? "No hay proveedores archivados."
              : "No hay proveedores activos."
          }
        />
      ) : (
        <HistorialTabla>
          <thead>
            <tr className="admin-cont-table-header-centered">
              <th>Creado por</th>
              <th>Fecha Creación</th>
              <th>Razón Social / Nombre</th>
              <th>NIT / Documento</th>
              <th>Cupo Aprobado</th>
              <th>Tipo Régimen</th>
              <th>Expediente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.map((prov) => (
              <tr key={prov.id}>
                <td className="admin-cont-cell-centered">
                  <div className="user-cell">
                    <FaUser />
                    {prov.profiles?.nombre || "N/A"}
                  </div>
                </td>
                <td className="admin-cont-cell-centered">
                  {format(parseISO(prov.created_at), "dd/MM/yy hh:mm a")}
                </td>
                <td>{prov.razon_social || prov.nombre_contacto || "N/A"}</td>
                <td className="admin-cont-cell-centered">
                  {prov.nit
                    ? `${prov.nit}${prov.dv ? `-${prov.dv}` : ""}`
                    : "N/A"}
                </td>
                <td className="admin-cont-cell-centered">
                  {prov.cupo_aprobado || "N/A"}
                </td>
                <td className="admin-cont-cell-centered">
                  {prov.tipo_regimen || "N/A"}
                </td>
                <td className="admin-cont-cell-centered">
                  <button
                    onClick={() => onOpenExpediente(prov.id)}
                    className="admin-cont-expediente-button"
                    title="Ver expediente completo"
                  >
                    <FaFolderOpen /> Ver Expediente
                  </button>
                </td>
                <td className="admin-cont-cell-centered">
                  {mostrarArchivados ? (
                    <button
                      onClick={() => handleRestaurar(prov.id)}
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
                      onClick={() => handleArchivar(prov.id)}
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

export default HistorialProveedoresAdminView;
