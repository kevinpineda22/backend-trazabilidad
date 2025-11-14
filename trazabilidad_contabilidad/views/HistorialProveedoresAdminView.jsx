// src/pages/trazabilidad_contabilidad/views/HistorialProveedoresAdminView.jsx
import React, { useEffect, useState } from "react";
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
  const [detalleProveedor, setDetalleProveedor] = useState(null);

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

  const abrirDetalle = (proveedor) => setDetalleProveedor(proveedor);
  const cerrarDetalle = () => setDetalleProveedor(null);

  const renderIdentificacion = (prov) => (
    <div className="admin-cont-stack">
      <span className="admin-cont-strong">
        {prov.razon_social || prov.nombre_contacto || "Sin nombre"}
      </span>
      <span>
        {prov.tipo_documento || "Documento"}: {prov.nit || "N/A"}
        {prov.dv ? `-${prov.dv}` : ""}
      </span>
      {prov.fecha_diligenciamiento && (
        <span>
          Formulario{" "}
          {format(
            parseISO(`${prov.fecha_diligenciamiento}T00:00:00`),
            "dd/MM/yy"
          )}
        </span>
      )}
    </div>
  );

  const renderContacto = (prov) => (
    <div className="admin-cont-stack">
      <span>{prov.nombre_contacto || "Sin contacto"}</span>
      <span>{prov.email_contacto || "Sin correo"}</span>
      <span>{prov.telefono_contacto || "Sin teléfono"}</span>
    </div>
  );

  const renderDeclaraciones = (prov) => (
    <div className="admin-cont-pill-group">
      <span className="admin-cont-pill">PEP: {prov.declara_pep || "N/A"}</span>
      <span className="admin-cont-pill">
        Recursos públicos: {prov.declara_recursos_publicos || "N/A"}
      </span>
      <span className="admin-cont-pill">
        Obligaciones tributarias:{" "}
        {prov.declara_obligaciones_tributarias || "N/A"}
      </span>
    </div>
  );

  const renderDocumentos = (prov) => (
    <div className="admin-cont-doc-grid">
      <AdminDocLink url={prov.url_rut} label="RUT" onPreview={onPreview} />
      <AdminDocLink
        url={prov.url_camara_comercio}
        label="Cám. Comercio"
        onPreview={onPreview}
      />
      <AdminDocLink
        url={prov.url_certificacion_bancaria}
        label="Cert. Bancaria"
        onPreview={onPreview}
      />
      <AdminDocLink
        url={prov.url_doc_identidad_rep_legal}
        label="Doc. Rep. Legal"
        onPreview={onPreview}
      />
      <AdminDocLink
        url={prov.url_certificado_sagrilaft}
        label="Cert. SAGRILAFT"
        onPreview={onPreview}
      />
      <AdminDocLink
        url={prov.url_composicion_accionaria}
        label="Comp. Accionaria"
        onPreview={onPreview}
      />
    </div>
  );

  const renderDetalleCampo = (label, value) => (
    <div className="admin-cont-modal-field" key={label}>
      <span className="admin-cont-modal-label">{label}</span>
      <span>{value || "N/A"}</span>
    </div>
  );

  const renderDetalle = () => {
    if (!detalleProveedor) return null;

    const prov = detalleProveedor;

    return (
      <div
        className="admin-cont-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-cont-modal-title"
        onClick={cerrarDetalle}
      >
        <div
          className="admin-cont-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="admin-cont-modal-header">
            <div>
              <h2
                id="admin-cont-modal-title"
                className="admin-cont-modal-title"
              >
                Detalle del proveedor
              </h2>
              <p className="admin-cont-modal-subtitle">
                Creado por {prov.profiles?.nombre || "N/A"} ·{" "}
                {format(parseISO(prov.created_at), "dd/MM/yy hh:mm a")}
              </p>
            </div>
            <button
              type="button"
              className="admin-cont-modal-close"
              onClick={cerrarDetalle}
              aria-label="Cerrar detalle"
            >
              ×
            </button>
          </header>

          <div className="admin-cont-modal-body">
            <section className="admin-cont-modal-section">
              <h3>Identificación</h3>
              <div className="admin-cont-modal-grid">
                {renderDetalleCampo("Tipo documento", prov.tipo_documento)}
                {renderDetalleCampo("Número", prov.nit)}
                {renderDetalleCampo("Dígito verificación", prov.dv)}
                {renderDetalleCampo("Régimen", prov.tipo_regimen)}
                {renderDetalleCampo(
                  "Fecha diligenciamiento",
                  prov.fecha_diligenciamiento
                )}
                {renderDetalleCampo("Código CIIU", prov.codigo_ciiu)}
              </div>
            </section>

            <section className="admin-cont-modal-section">
              <h3>Empresa</h3>
              <div className="admin-cont-modal-grid">
                {renderDetalleCampo("Razón social", prov.razon_social)}
                {renderDetalleCampo(
                  "Nombre comercial",
                  prov.nombre_establecimiento
                )}
                {renderDetalleCampo(
                  "Correo factura electrónica",
                  prov.email_factura_electronica
                )}
              </div>
            </section>

            <section className="admin-cont-modal-section">
              <h3>Contacto y ubicación</h3>
              <div className="admin-cont-modal-grid">
                {renderDetalleCampo("Nombre contacto", prov.nombre_contacto)}
                {renderDetalleCampo("Correo contacto", prov.email_contacto)}
                {renderDetalleCampo(
                  "Teléfono contacto",
                  prov.telefono_contacto
                )}
                {renderDetalleCampo("Departamento", prov.departamento)}
                {renderDetalleCampo("Ciudad", prov.ciudad)}
                {renderDetalleCampo("Dirección", prov.direccion_domicilio)}
              </div>
            </section>

            <section className="admin-cont-modal-section">
              <h3>Representante legal</h3>
              <div className="admin-cont-modal-grid">
                {renderDetalleCampo("Nombre", prov.rep_legal_nombre)}
                {renderDetalleCampo("Apellidos", prov.rep_legal_apellidos)}
                {renderDetalleCampo("Tipo documento", prov.rep_legal_tipo_doc)}
                {renderDetalleCampo("Número documento", prov.rep_legal_num_doc)}
              </div>
            </section>

            <section className="admin-cont-modal-section">
              <h3>Declaraciones</h3>
              <div className="admin-cont-modal-grid">
                {renderDetalleCampo("Declara PEP", prov.declara_pep)}
                {renderDetalleCampo(
                  "Recursos públicos",
                  prov.declara_recursos_publicos
                )}
                {renderDetalleCampo(
                  "Obligaciones tributarias",
                  prov.declara_obligaciones_tributarias
                )}
              </div>
            </section>

            <section className="admin-cont-modal-section">
              <h3>Documentos</h3>
              <div className="admin-cont-modal-docs">
                {renderDocumentos(prov)}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-cont-historial-wrapper">
      <HistorialTabla>
        <thead>
          <tr className="admin-cont-table-header-centered">
            <th>Creado por</th>
            <th>Fecha creación</th>
            <th>Proveedor</th>
            <th>Contacto</th>
            <th>Declaraciones</th>
            <th>Documentos</th>
            <th>Acciones</th>
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
              <td>{renderIdentificacion(prov)}</td>
              <td>{renderContacto(prov)}</td>
              <td>{renderDeclaraciones(prov)}</td>
              <td className="admin-cont-doc-cell">{renderDocumentos(prov)}</td>
              <td className="admin-cont-cell-centered">
                <button
                  type="button"
                  className="admin-cont-detail-button"
                  onClick={() => abrirDetalle(prov)}
                >
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </HistorialTabla>
      {renderDetalle()}
    </div>
  );
};

export default HistorialProveedoresAdminView;
