// src/pages/trazabilidad_contabilidad/views/ExpedienteEmpleadoView.jsx
import React, { useState, useEffect } from "react";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import {
  FaArrowLeft,
  FaUserCircle,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaInfoCircle,
  FaDownload,
} from "react-icons/fa";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";
import Loader from "../components/Loader";

// Importa los estilos
import "./ExpedienteEmpleadoView.css";

// Componente simple para mostrar "Label: Value"
const InfoItem = ({ label, value }) => (
  <div className="info-item">
    <span className="info-label">{label}</span>
    <span className="info-value">{value || "N/A"}</span>
  </div>
);

const ExpedienteEmpleadoView = ({ empleadoId, onBack, onPreview }) => {
  const [empleado, setEmpleado] = useState(null);
  // ¡ELIMINADO! Ya no usamos el array 'documentos' del estado
  // const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!empleadoId) {
      setLoading(false);
      setError("No se ha seleccionado un empleado.");
      return;
    }

    const fetchExpediente = async () => {
      try {
        setLoading(true);
        // El backend ahora solo nos devuelve el 'empleado'
        const { data } = await api.get(
          `/trazabilidad/admin/expediente-empleado/${empleadoId}`
        );
        setEmpleado(data.empleado); // ¡Solo guardamos el empleado!
        setError(null);
      } catch (err) {
        console.error("Error fetching expediente:", err);
        const errorMsg =
          err.response?.data?.message || "No se pudo cargar el expediente.";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchExpediente();
  }, [empleadoId]);

  const getFileIcon = (fileNameOrUrl) => {
    // Esta función ahora es segura, solo revisa el final del string (la URL)
    if (!fileNameOrUrl) return <FaFileAlt className="file-icon other" />;
    const cleanName = fileNameOrUrl.split("?")[0].toLowerCase();
    if (cleanName.endsWith(".pdf"))
      return <FaFilePdf className="file-icon pdf" />;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(cleanName))
      return <FaFileImage className="file-icon image" />;
    return <FaFileAlt className="file-icon other" />;
  };

  // --- ¡NUEVA LÓGICA DE DOCUMENTOS! ---
  // Creamos un array de documentos definidos a partir del objeto 'empleado'
  let documentosDefinidos = [];
  if (empleado) {
    documentosDefinidos = [
      { label: "Hoja de Vida", url: empleado.url_hoja_de_vida },
      { label: "Documento de Identidad", url: empleado.url_cedula },
      { label: "Certificado Bancario", url: empleado.url_certificado_bancario },
      { label: "Habeas Data", url: empleado.url_habeas_data },
      { label: "Autorización Firma", url: empleado.url_autorizacion_firma },
    ];
  }
  // ------------------------------------

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

        {empleado && (
          <>
            {/* --- ENCABEZADO (Solo nombre y cédula) --- */}
            <div className="expediente-header">
              <FaUserCircle className="header-icon" />
              <div className="header-info">
                <h1 className="header-title">
                  {empleado.nombre} {empleado.apellidos}
                </h1>
                <span className="header-subtitle">
                  {empleado.tipo_documento || "Doc"}: {empleado.cedula}
                </span>
              </div>
            </div>

            {/* --- TARJETA DE INFORMACIÓN (con todos los campos) --- */}
            <div className="expediente-info-card">
              <h2 className="info-card-title">
                Información de Contacto y Registro
              </h2>
              <div className="info-card-grid">
                <InfoItem
                  label="Tipo de Documento"
                  value={empleado.tipo_documento}
                />
                <InfoItem label="Número de Documento" value={empleado.cedula} />
                {empleado.dv && <InfoItem label="DV" value={empleado.dv} />}
                <InfoItem
                  label="Correo Electrónico"
                  value={empleado.correo_electronico}
                />
                <InfoItem
                  label="Contacto (Celular)"
                  value={empleado.contacto}
                />
                <InfoItem label="Dirección" value={empleado.direccion} />

                {/* Campos del sistema */}
                <InfoItem
                  label="Creado por"
                  value={empleado.profiles?.nombre}
                />
                <InfoItem
                  label="Fecha Creación"
                  value={format(
                    parseISO(empleado.created_at),
                    "dd/MM/yyyy hh:mm a"
                  )}
                />
              </div>
            </div>
          </>
        )}

        {/* --- ¡LISTA DE DOCUMENTOS ACTUALIZADA! --- */}
        <div className="expediente-file-list">
          <h2 className="file-list-title">Documentos del Expediente</h2>
          {/* Verificamos si hay documentos filtrando los que tienen URL */}
          {empleado &&
          documentosDefinidos.filter((doc) => doc.url).length > 0 ? (
            <ul>
              {documentosDefinidos
                .filter((doc) => doc.url) // Solo muestra documentos que SÍ tienen URL
                .map((doc) => (
                  <li key={doc.label} className="file-item">
                    {" "}
                    {/* Key ahora es el label */}
                    <div className="file-info">
                      {/* Pasamos la URL al getFileIcon */}
                      {getFileIcon(doc.url)}
                      {/* ¡AQUÍ ESTÁ EL CAMBIO! Mostramos la etiqueta */}
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
                        // Sugiere un nombre de descarga limpio
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
                <span>No se encontraron documentos para este empleado.</span>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
};

export default ExpedienteEmpleadoView;
