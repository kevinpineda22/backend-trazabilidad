// src/pages/trazabilidad_contabilidad/views/HistorialProveedoresAdminView.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import { format, parseISO } from "date-fns";
import { FaUser } from "react-icons/fa";
import Loader from "../components/Loader";
import MensajeVacio from "../components/MensajeVacio";
import HistorialTabla from "../components/HistorialTabla";
import AdminDocLink from "../components/AdminDocLink";

const HistorialProveedoresAdminView = ({ onPreview }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Usamos el endpoint de admin (que ya tiene todos los registros)
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
            <th>RUT</th>
            <th>Cám. Comercio</th>
            <th>Cert. Bancaria</th>
            <th>Doc. Rep. Legal</th>
            <th>Cert. SAGRILAFT</th>
            <th>Comp. Accionaria</th>
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
              <td className="admin-cont-doc-cell admin-cont-cell-centered">
                <AdminDocLink
                  url={prov.url_rut}
                  label="RUT"
                  onPreview={onPreview}
                />
              </td>
              <td className="admin-cont-doc-cell admin-cont-cell-centered">
                <AdminDocLink
                  url={prov.url_camara_comercio}
                  label="Cám. Comercio"
                  onPreview={onPreview}
                />
              </td>
              <td className="admin-cont-doc-cell admin-cont-cell-centered">
                {/* --- ¡AQUÍ ESTABA EL ERROR! Corregido de 'onV' a 'onPreview' --- */}
                <AdminDocLink
                  url={prov.url_certificacion_bancaria}
                  label="Cert. Bancaria"
                  onPreview={onPreview}
                />
              </td>
              <td className="admin-cont-doc-cell admin-cont-cell-centered">
                <AdminDocLink
                  url={prov.url_doc_identidad_rep_legal}
                  label="Doc. Rep. Legal"
                  onPreview={onPreview}
                />
              </td>
              <td className="admin-cont-doc-cell admin-cont-cell-centered">
                <AdminDocLink
                  url={prov.url_certificado_sagrilaft}
                  label="Cert. SAGRILAFT"
                  onPreview={onPreview}
                />
              </td>
              <td className="admin-cont-doc-cell admin-cont-cell-centered">
                <AdminDocLink
                  url={prov.url_composicion_accionaria}
                  label="Comp. Accionaria"
                  onPreview={onPreview}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </HistorialTabla>
    </div>
  );
};

export default HistorialProveedoresAdminView;
