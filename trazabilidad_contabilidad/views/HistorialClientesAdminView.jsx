// src/pages/trazabilidad_contabilidad/views/HistorialClientesAdminView.jsx
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

// Importación de componentes reutilizables
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";
import AdminDocLink from "../components/AdminDocLink";

const HistorialClientesAdminView = ({ onPreview, onOpenExpediente }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/trazabilidad/admin/historial-clientes");
      setHistorial(data || []);
    } catch (error) {
      console.error("Error al cargar el historial de clientes:", error);
      toast.error("Error al cargar el historial de clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleArchivar = async (id) => {
    if (!window.confirm("¿Estás seguro de archivar este cliente?")) return;
    try {
      await api.post("/trazabilidad/admin/archivar-entidad", {
        tipo: "cliente",
        id,
      });
      toast.success("Cliente archivado correctamente.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error al archivar el cliente.");
    }
  };

  const handleRestaurar = async (id) => {
    if (!window.confirm("¿Estás seguro de restaurar este cliente?")) return;
    try {
      await api.post("/trazabilidad/admin/restaurar-entidad", {
        tipo: "cliente",
        id,
      });
      toast.success("Cliente restaurado correctamente.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error al restaurar el cliente.");
    }
  };

  const registrosFiltrados = historial.filter(
    (item) => !!item.is_archivado === mostrarArchivados
  );

  if (loading) return <Loader />;

  if (historial.length === 0) {
    return <MensajeVacio mensaje="No se han creado clientes." />;
  }

  return (
    <>
      <div
        className="admin-cont-toolbar"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <button
          className={`btn-toggle-archivados ${
            mostrarArchivados ? "active" : ""
          }`}
          onClick={() => setMostrarArchivados(!mostrarArchivados)}
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
                ? "No hay clientes archivados."
                : "No hay clientes activos."
            }
          />
        ) : (
          <HistorialTabla>
            <thead>
              <tr className="admin-cont-table-header-centered">
                <th>Creado por</th>
                <th>Fecha Creación</th>
                <th>Cupo</th>
                <th>Plazo</th>
                <th>Expediente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((cli) => (
                <tr key={cli.id}>
                  <td className="admin-cont-cell-centered">
                    <div className="user-cell">
                      <FaUser />
                      {cli.profiles?.nombre || "N/A"}
                    </div>
                  </td>
                  <td className="admin-cont-cell-centered">
                    {format(parseISO(cli.created_at), "dd/MM/yy hh:mm a")}
                  </td>
                  <td className="admin-cont-cell-centered">
                    {cli.cupo || "N/A"}
                  </td>
                  <td className="admin-cont-cell-centered">
                    {cli.plazo || "N/A"}
                  </td>
                  <td className="admin-cont-cell-centered">
                    <button
                      onClick={() => onOpenExpediente(cli.id)}
                      className="admin-cont-expediente-button"
                      title="Ver expediente digital"
                    >
                      <FaFolderOpen /> Ver Expediente
                    </button>
                  </td>
                  <td className="admin-cont-cell-centered">
                    {mostrarArchivados ? (
                      <button
                        onClick={() => handleRestaurar(cli.id)}
                        className="btn-icon-restaurar"
                        title="Restaurar"
                      >
                        <FaUndo />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchivar(cli.id)}
                        className="btn-icon-archivar"
                        title="Archivar"
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
    </>
  );
};

export default HistorialClientesAdminView;
