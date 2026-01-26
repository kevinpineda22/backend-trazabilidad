// src/pages/trazabilidad_contabilidad/views/ExpedienteProveedorView.jsx
import React, { useState, useEffect } from "react";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import {
  FaArrowLeft,
  FaBuilding,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaInfoCircle,
  FaDownload,
} from "react-icons/fa";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";
import Loader from "../components/Loader";

// Importa los estilos del expediente de empleado (reutilizamos)
import "./ExpedienteEmpleadoView.css";

// Componente simple para mostrar "Label: Value"
const InfoItem = ({ label, value }) => (
  <div className="info-item">
    <span className="info-label">{label}</span>
    <span className="info-value">{value || "N/A"}</span>
  </div>
);

const ExpedienteProveedorView = ({
  proveedorId,
  onBack,
  onPreview,
  userRole,
}) => {
  const [proveedor, setProveedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!proveedorId) {
      setLoading(false);
      setError("No se ha seleccionado un proveedor.");
      return;
    }

    const fetchExpediente = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(
          `/trazabilidad/admin/expediente-proveedor/${proveedorId}`,
        );
        setProveedor(data.proveedor);
        setError(null);
      } catch (err) {
        console.error("Error fetching expediente proveedor:", err);
        const errorMsg =
          err.response?.data?.message || "No se pudo cargar el expediente.";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchExpediente();
  }, [proveedorId]);

  const getFileIcon = (fileNameOrUrl) => {
    if (!fileNameOrUrl) return <FaFileAlt className="file-icon other" />;
    const cleanName = fileNameOrUrl.split("?")[0].toLowerCase();
    if (cleanName.endsWith(".pdf"))
      return <FaFilePdf className="file-icon pdf" />;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(cleanName))
      return <FaFileImage className="file-icon image" />;
    return <FaFileAlt className="file-icon other" />;
  };

  const formatFechaCorta = (fecha) => {
    if (!fecha) return "N/A";
    try {
      return format(parseISO(`${fecha}T00:00:00`), "dd/MM/yy");
    } catch (error) {
      return fecha;
    }
  };

  // Crear array de documentos a partir del objeto proveedor
  let documentosDefinidos = [];
  if (proveedor) {
    if (userRole === "admin_tesoreria") {
      documentosDefinidos = [
        {
          label: "Certificación Bancaria",
          url: proveedor.url_certificacion_bancaria,
        },
      ];
    } else {
      documentosDefinidos = [
        { label: "RUT", url: proveedor.url_rut },
        { label: "Cámara de Comercio", url: proveedor.url_camara_comercio },
        {
          label: "Certificación Bancaria",
          url: proveedor.url_certificacion_bancaria,
        },
        {
          label: "Documento Identidad Rep. Legal",
          url: proveedor.url_doc_identidad_rep_legal,
        },
        {
          label: "Composición Accionaria",
          url: proveedor.url_composicion_accionaria,
        },
        {
          label: "Certificado SAGRILAFT",
          url: proveedor.url_certificado_sagrilaft,
        },
      ];
    }
  }

  if (loading) {
    return (
      <div className="expediente-loader-container">
        <Loader />
      </div>
    );
  }

  return (
    <>
      <div className="expediente-container-inner">
        <button onClick={onBack} className="expediente-back-button">
          <FaArrowLeft /> Volver a la lista
        </button>

        {error && (
          <div className="admin-cont-empty-message">
            <FaInfoCircle />
            <span>Error: {error}</span>
          </div>
        )}

        {proveedor && (
          <>
            {/* ENCABEZADO */}
            <div className="expediente-header">
              <FaBuilding className="header-icon" />
              <div className="header-info">
                <h1 className="header-title">
                  {proveedor.razon_social ||
                    proveedor.nombre_contacto ||
                    "Proveedor"}
                </h1>
                <span className="header-subtitle">
                  {proveedor.tipo_documento}: {proveedor.nit}
                  {proveedor.dv ? `-${proveedor.dv}` : ""}
                </span>
              </div>
            </div>

            {/* TARJETA DE INFORMACIÓN GENERAL */}
            <div className="expediente-info-card">
              <h2 className="info-card-title">Información General</h2>
              <div className="info-card-grid">
                <InfoItem
                  label="Tipo de Régimen"
                  value={proveedor.tipo_regimen}
                />
                <InfoItem
                  label="Tipo de Documento"
                  value={proveedor.tipo_documento}
                />
                <InfoItem
                  label="Número de Documento"
                  value={
                    proveedor.nit
                      ? `${proveedor.nit}${
                          proveedor.dv ? `-${proveedor.dv}` : ""
                        }`
                      : "N/A"
                  }
                />
                <InfoItem label="Razón Social" value={proveedor.razon_social} />
                <InfoItem
                  label="Nombre Establecimiento"
                  value={proveedor.nombre_establecimiento}
                />
                <InfoItem label="Código CIIU" value={proveedor.codigo_ciiu} />
                <InfoItem
                  label="Descripción CIIU"
                  value={proveedor.descripcion_ciiu}
                />
                <InfoItem
                  label="Fecha Diligenciamiento"
                  value={formatFechaCorta(proveedor.fecha_diligenciamiento)}
                />
                <InfoItem
                  label="Cupo Aprobado"
                  value={proveedor.cupo_aprobado}
                />
              </div>
            </div>

            {/* TARJETA DE UBICACIÓN */}
            <div className="expediente-info-card">
              <h2 className="info-card-title">Ubicación y Contacto</h2>
              <div className="info-card-grid">
                <InfoItem
                  label="Dirección Domicilio"
                  value={proveedor.direccion_domicilio}
                />
                <InfoItem label="Departamento" value={proveedor.departamento} />
                <InfoItem label="Ciudad" value={proveedor.ciudad} />
                <InfoItem
                  label="Nombre Contacto"
                  value={proveedor.nombre_contacto}
                />
                <InfoItem
                  label="Email Contacto"
                  value={proveedor.email_contacto}
                />
                <InfoItem
                  label="Teléfono Contacto"
                  value={proveedor.telefono_contacto}
                />
                <InfoItem
                  label="Email Factura Electrónica"
                  value={proveedor.email_factura_electronica}
                />
              </div>
            </div>

            {/* TARJETA DE REPRESENTANTE LEGAL */}
            {proveedor.tipo_regimen === "persona_juridica" && (
              <div className="expediente-info-card">
                <h2 className="info-card-title">Representante Legal</h2>
                <div className="info-card-grid">
                  <InfoItem label="Nombre" value={proveedor.rep_legal_nombre} />
                  <InfoItem
                    label="Apellidos"
                    value={proveedor.rep_legal_apellidos}
                  />
                  <InfoItem
                    label="Tipo de Documento"
                    value={proveedor.rep_legal_tipo_doc}
                  />
                  <InfoItem
                    label="Número de Documento"
                    value={proveedor.rep_legal_num_doc}
                  />
                </div>
              </div>
            )}

            {/* TARJETA DE DECLARACIONES */}
            <div className="expediente-info-card">
              <h2 className="info-card-title">Declaraciones</h2>
              <div className="info-card-grid">
                <InfoItem label="Declara PEP" value={proveedor.declara_pep} />
                <InfoItem
                  label="Recursos Públicos"
                  value={proveedor.declara_recursos_publicos}
                />
                <InfoItem
                  label="Obligaciones Tributarias"
                  value={proveedor.declara_obligaciones_tributarias}
                />
              </div>
            </div>

            {/* TARJETA DE REGISTRO */}
            <div className="expediente-info-card">
              <h2 className="info-card-title">Información de Registro</h2>
              <div className="info-card-grid">
                <InfoItem
                  label="Creado por"
                  value={proveedor.profiles?.nombre}
                />
                <InfoItem
                  label="Fecha Creación"
                  value={format(
                    parseISO(proveedor.created_at),
                    "dd/MM/yyyy hh:mm a",
                  )}
                />
              </div>
            </div>
          </>
        )}

        {/* LISTA DE DOCUMENTOS */}
        <div className="expediente-file-list">
          <h2 className="file-list-title">Documentos del Expediente</h2>
          {proveedor &&
          documentosDefinidos.filter((doc) => doc.url).length > 0 ? (
            <ul>
              {documentosDefinidos
                .filter((doc) => doc.url)
                .map((doc) => (
                  <li key={doc.label} className="file-item">
                    <div className="file-info">
                      {getFileIcon(doc.url)}
                      <span className="file-name">{doc.label}</span>
                    </div>
                    <div className="file-actions">
                      <button
                        className="file-action-btn preview"
                        onClick={() => onPreview(doc.url)}
                      >
                        Vista Previa
                      </button>
                      <a
                        href={doc.url}
                        download={doc.label.replace(/ /g, "_")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-action-btn download"
                      >
                        <FaDownload /> Descargar
                      </a>
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            !loading &&
            !error && (
              <div
                className="admin-cont-empty-message"
                style={{ marginTop: "1rem" }}
              >
                <FaInfoCircle />
                <span>No se encontraron documentos para este proveedor.</span>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
};

export default ExpedienteProveedorView;
