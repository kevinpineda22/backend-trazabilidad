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

  const formatFechaCorta = (fecha) => {
    if (!fecha) return "N/A";
    try {
      return format(parseISO(`${fecha}T00:00:00`), "dd/MM/yy");
    } catch (error) {
      return fecha;
    }
  };

  const renderSummaryItem = (label, value) => (
    <div className="admin-cont-summary-item">
      <span className="admin-cont-summary-label">{label}</span>
      <span className="admin-cont-summary-value">{value || "N/A"}</span>
    </div>
  );

  const renderIdentificacion = (prov) => (
    <div className="admin-cont-summary-block">
      <p className="admin-cont-summary-title">
        {prov.razon_social || prov.nombre_contacto || "Proveedor sin nombre"}
      </p>
      <div className="admin-cont-summary-grid">
        {renderSummaryItem("Tipo documento", prov.tipo_documento)}
        {renderSummaryItem(
          "Número",
          prov.nit ? `${prov.nit}${prov.dv ? `-${prov.dv}` : ""}` : "N/A"
        )}
        {renderSummaryItem("Régimen", prov.tipo_regimen)}
        {renderSummaryItem("Código CIIU", prov.codigo_ciiu)}
        {renderSummaryItem(
          "Formulario",
          formatFechaCorta(prov.fecha_diligenciamiento)
        )}
      </div>
    </div>
  );

  const renderContacto = (prov) => (
    <div className="admin-cont-summary-block">
      <p className="admin-cont-summary-title">Contacto principal</p>
      <div className="admin-cont-summary-grid">
        {renderSummaryItem("Nombre", prov.nombre_contacto)}
        {renderSummaryItem("Correo", prov.email_contacto)}
        {renderSummaryItem("Teléfono", prov.telefono_contacto)}
        {renderSummaryItem(
          "Ubicación",
          [prov.ciudad, prov.departamento].filter(Boolean).join(", ")
        )}
        {renderSummaryItem("Dirección", prov.direccion_domicilio)}
      </div>
    </div>
  );

  const renderDeclaracionPill = (label, value) => {
    const normalized = (value || "N/A").toString();
    const tone = normalized.trim().toLowerCase();
    let toneClass = "admin-cont-pill-neutral";

    if (["si", "sí", "true", "cumple"].includes(tone)) {
      toneClass = "admin-cont-pill-positive";
    } else if (["no", "false", "n/a", "ninguno"].includes(tone)) {
      toneClass = "admin-cont-pill-negative";
    }

    return (
      <span className={`admin-cont-pill ${toneClass}`} key={label}>
        <span className="admin-cont-pill-label">{label}</span>
        <span className="admin-cont-pill-value">{normalized}</span>
      </span>
    );
  };

  const renderDeclaraciones = (prov) => (
    <div className="admin-cont-summary-block">
      <p className="admin-cont-summary-title">Declaraciones</p>
      <div className="admin-cont-pill-grid">
        {renderDeclaracionPill("Declara PEP", prov.declara_pep)}
        {renderDeclaracionPill(
          "Recursos públicos",
          prov.declara_recursos_publicos
        )}
        {renderDeclaracionPill(
          "Obligaciones tributarias",
          prov.declara_obligaciones_tributarias
        )}
      </div>
    </div>
  );

  const renderDocumentos = (prov) => {
    const sections = [
      {
        title: "Registro legal",
        docs: [
          { label: "RUT", url: prov.url_rut },
          { label: "Cám. Comercio", url: prov.url_camara_comercio },
          { label: "Comp. Accionaria", url: prov.url_composicion_accionaria },
        ],
      },
      {
        title: "Cumplimiento",
        docs: [
          { label: "Cert. SAGRILAFT", url: prov.url_certificado_sagrilaft },
        ],
      },
      {
        title: "Financiero",
        docs: [
          {
            label: "Cert. Bancaria",
            url: prov.url_certificacion_bancaria,
          },
        ],
      },
      {
        title: "Representación legal",
        docs: [
          {
            label: "Doc. Rep. Legal",
            url: prov.url_doc_identidad_rep_legal,
          },
        ],
      },
    ];

    return (
      <div className="admin-cont-doc-sectioned">
        {sections.map((section) => (
          <div className="admin-cont-doc-group" key={section.title}>
            <span className="admin-cont-doc-group-title">{section.title}</span>
            <div className="admin-cont-doc-group-grid">
              {section.docs.map((doc) => (
                <AdminDocLink
                  key={doc.label}
                  url={doc.url}
                  label={doc.label}
                  onPreview={onPreview}
                />
              ))}
            </div>
          </div>
        ))}
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
            </tr>
          ))}
        </tbody>
      </HistorialTabla>
    </div>
  );
};

export default HistorialProveedoresAdminView;
