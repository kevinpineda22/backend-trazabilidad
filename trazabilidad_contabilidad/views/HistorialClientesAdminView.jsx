// src/pages/trazabilidad_contabilidad/views/HistorialClientesAdminView.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import { format, parseISO } from "date-fns";
import { FaUser, FaFolderOpen } from "react-icons/fa";

// Importación de componentes reutilizables
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";
import AdminDocLink from "../components/AdminDocLink";

const HistorialClientesAdminView = ({
  onPreview,
  onOpenExpediente,
  apiEndpoint = "/trazabilidad/admin/historial-clientes",
}) => {
  // 1. Definición de Estado
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Efecto para Cargar Datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // El endpoint de admin ya trae todos los campos (select=*)
        const { data } = await api.get(apiEndpoint);
        setHistorial(data || []);
      } catch (error) {
        console.error("Error al cargar el historial de clientes:", error);
        toast.error("Error al cargar el historial de clientes.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiEndpoint]); // Se ejecuta una vez al montar el componente    // 3. Manejo de Estados de Carga y Vacío
  if (loading) {
    return <Loader />;
  }

  if (historial.length === 0) {
    return <MensajeVacio mensaje="No se han creado clientes." />;
  }

  // 4. Renderizado del Componente
  return (
    <div className="admin-cont-historial-wrapper">
      <HistorialTabla>
        <thead>
          <tr className="admin-cont-table-header-centered">
            <th>Creado por</th>
            <th>Fecha Creación</th>
            <th>Cupo</th>
            <th>Plazo</th>
            <th>Expediente</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((cli) => (
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
              <td className="admin-cont-cell-centered">{cli.cupo || "N/A"}</td>
              <td className="admin-cont-cell-centered">{cli.plazo || "N/A"}</td>
              <td className="admin-cont-cell-centered">
                <button
                  onClick={() => onOpenExpediente(cli.id)}
                  className="admin-cont-expediente-button"
                  title="Ver expediente digital"
                >
                  <FaFolderOpen /> Ver Expediente
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </HistorialTabla>
    </div>
  );
};

export default HistorialClientesAdminView;
