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

const HistorialProveedoresAdminView = ({
  onOpenExpediente,
  userRole,
  routePermission,
}) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  // Definir quiénes tienen permiso de EDICIÓN (Archivar/Restaurar)
  const hasAdminRole = ["super_admin", "admin", "admin_proveedor"].includes(
    userRole
  );
  const hasRouteAccess = routePermission === "full_access";

  const canEdit = hasAdminRole || hasRouteAccess;
  const isReadOnly = !canEdit;

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
                {!isReadOnly && <th>Acciones</th>}
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
                  {!isReadOnly && (
                    <td className="admin-cont-cell-centered">
                      {mostrarArchivados ? (
                        <button
                          onClick={() => handleRestaurar(prov.id)}
                          className="btn-icon-restaurar"
                          title="Restaurar"
                        >
                          <FaUndo />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchivar(prov.id)}
                          className="btn-icon-archivar"
                          title="Archivar"
                        >
                          <FaArchive />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </HistorialTabla>
        )}
      </div>
    </>
  );
};

export default HistorialProveedoresAdminView;
