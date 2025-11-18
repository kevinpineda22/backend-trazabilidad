// src/pages/trazabilidad_contabilidad/views/ExpedienteClienteView.jsx
import React, { useState, useEffect } from "react";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import {
  FaArrowLeft,
  FaUserTie,
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

const ExpedienteClienteView = ({ clienteId, onBack, onPreview }) => {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clienteId) {
      setLoading(false);
      setError("No se ha seleccionado un cliente.");
      return;
    }

    const fetchExpediente = async () => {
      try {
        setLoading(true);
        // Intentar obtener del endpoint de admin-contabilidad
        const { data } = await api.get(
          `/trazabilidad/clientes/admin/expediente/${clienteId}`
        );
        setCliente(data.cliente);
        setError(null);
      } catch (err) {
        console.error("Error fetching expediente cliente:", err);
        const errorMsg =
          err.response?.data?.message || "No se pudo cargar el expediente.";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchExpediente();
  }, [clienteId]);

  const getFileIcon = (fileNameOrUrl) => {
    if (!fileNameOrUrl) return <FaFileAlt className="file-icon other" />;
    if (fileNameOrUrl.toLowerCase().endsWith(".pdf"))
      return <FaFilePdf className="file-icon pdf" />;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileNameOrUrl))
      return <FaFileImage className="file-icon image" />;
    return <FaFileAlt className="file-icon other" />;
  };

  // Crear array de documentos del cliente
  let documentosDefinidos = [];
  if (cliente) {
    documentosDefinidos = [
      { label: "RUT", url: cliente.url_rut },
      { label: "Cámara de Comercio", url: cliente.url_camara_comercio },
      { label: "Formato SAGRILAFT", url: cliente.url_formato_sangrilaft },
      { label: "Cédula", url: cliente.url_cedula },
    ];
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
          <FaArrowLeft /> Volver al historial
        </button>

        {error && (
          <div className="admin-cont-empty-message">
            <FaInfoCircle />
            <span>Error: {error}</span>
          </div>
        )}

        {cliente && (
          <>
            {/* Encabezado */}
            <div className="expediente-header">
              <FaUserTie className="header-icon" />
              <div className="header-info">
                <h1 className="header-title">Solicitud de Cliente</h1>
                <span className="header-subtitle">
                  Cupo: {cliente.cupo || "N/A"}
                </span>
              </div>
            </div>

            {/* Tarjeta de Información */}
            <div className="expediente-info-card">
              <h2 className="info-card-title">Información de Solicitud</h2>
              <div className="info-card-grid">
                <InfoItem label="Cupo Solicitado" value={cliente.cupo} />
                <InfoItem label="Plazo" value={cliente.plazo} />
                <InfoItem label="Creado por" value={cliente.profiles?.nombre} />
                <InfoItem
                  label="Fecha Creación"
                  value={
                    cliente.created_at
                      ? format(
                          parseISO(cliente.created_at),
                          "dd/MM/yyyy hh:mm a"
                        )
                      : "N/A"
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* Lista de Documentos */}
        <div className="expediente-file-list">
          <h2 className="file-list-title">Documentos del Expediente</h2>
          {cliente &&
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
                <span>No se encontraron documentos para este cliente.</span>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
};

export default ExpedienteClienteView;
