// src/pages/trazabilidad_contabilidad/views/HistorialEmpleadosAdminView.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import { format, parseISO } from "date-fns";
import { FaUser, FaFolderOpen } from "react-icons/fa";
// --- ¡ELIMINADO! Ya no usamos Link aquí ---
// import { Link } from "react-router-dom";

// Importamos los componentes compartidos
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";

// --- ¡ACTUALIZADO! Aceptamos la nueva prop 'onOpenExpediente' y 'apiEndpoint' ---
const HistorialEmpleadosAdminView = ({
  onPreview,
  onOpenExpediente,
  apiEndpoint = "/trazabilidad/admin/historial-empleados",
}) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(apiEndpoint);
        setHistorial(data || []);
      } catch (error) {
        toast.error("Error al cargar el historial de empleados.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiEndpoint]);

  if (loading) return <Loader />;
  if (historial.length === 0)
    return <MensajeVacio mensaje="No se han creado empleados." />;

  return (
    <div className="admin-cont-historial-wrapper">
      <HistorialTabla>
        <thead>
          <tr className="admin-cont-table-header-centered">
            <th>Creado por</th>
            <th>Nombre Empleado</th>
            <th>Cédula</th>
            <th>Fecha Creación</th>
            <th>Expediente</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((emp) => (
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
                {format(parseISO(emp.created_at), "dd/MM/yy hh:mm a")}
              </td>

              {/* --- CELDA MODIFICADA --- */}
              <td className="admin-cont-cell-centered">
                <button
                  onClick={() => onOpenExpediente(emp.id)} // ¡Llama a la función del padre!
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

export default HistorialEmpleadosAdminView;
