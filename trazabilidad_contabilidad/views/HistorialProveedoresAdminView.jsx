// src/pages/trazabilidad_contabilidad/views/HistorialProveedoresAdminView.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import { format, parseISO } from "date-fns";
import { FaUser, FaFolderOpen } from "react-icons/fa";
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";

const HistorialProveedoresAdminView = ({ onOpenExpediente }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchData();
  }, []);

  if (loading) return <Loader />;
  if (historial.length === 0)
    return <MensajeVacio mensaje="No se han creado proveedores." />;

  return (
    <div className="admin-cont-historial-wrapper">
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
          </tr>
        </thead>
        <tbody>
          {historial.map((prov) => (
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
            </tr>
          ))}
        </tbody>
      </HistorialTabla>
    </div>
  );
};

export default HistorialProveedoresAdminView;
