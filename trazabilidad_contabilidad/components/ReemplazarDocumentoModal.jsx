import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTimes,
  FaUpload,
  FaHistory,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaExchangeAlt,
  FaDownload,
  FaExclamationTriangle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import { uploadFileToBucket } from "../../../supabaseClient";
import { format, parseISO } from "date-fns";
import "./ReemplazarDocumentoModal.css";

const BUCKET_NAME = "documentos_contabilidad";

const ReemplazarDocumentoModal = ({
  isOpen,
  onClose,
  docLabel,
  docCampo,
  expedienteTipo,
  expedienteId,
  currentUrl,
  onDocReemplazado,
}) => {
  const [archivo, setArchivo] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setArchivo(null);
      setMotivo("");
      setSubiendo(false);
      setMostrarHistorial(false);
      setHistorial([]);
    }
  }, [isOpen]);

  const cargarHistorial = async () => {
    if (historial.length > 0) {
      setMostrarHistorial(!mostrarHistorial);
      return;
    }
    try {
      setCargandoHistorial(true);
      const { data } = await api.get(
        `/trazabilidad/documentos-versiones/historial/${expedienteTipo}/${expedienteId}?campo=${docCampo}`,
      );
      setHistorial(data || []);
      setMostrarHistorial(true);
    } catch (err) {
      console.error("Error cargando historial:", err);
      toast.error("No se pudo cargar el historial de versiones.");
    } finally {
      setCargandoHistorial(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("El archivo no puede superar los 10MB.");
        e.target.value = "";
        return;
      }
      setArchivo(file);
    }
  };

  const handleSubmit = async () => {
    if (!archivo) {
      toast.warning("Seleccioná un archivo para reemplazar.");
      return;
    }
    if (!motivo.trim()) {
      toast.warning("El motivo del reemplazo es obligatorio.");
      return;
    }

    try {
      setSubiendo(true);
      const toastId = toast.loading("Subiendo documento...");

      // 1. Subir archivo a Storage
      const ext = archivo.name.split(".").pop();
      const cleanName = archivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const timestamp = Date.now();
      const folderPath = `versiones/${expedienteTipo}_${expedienteId}`;
      const fileName = `${docCampo}_v${timestamp}_${cleanName}`;

      const url_nueva = await uploadFileToBucket({
        bucket: BUCKET_NAME,
        path: `${folderPath}/${fileName}`,
        file: archivo,
      });

      // 2. Registrar reemplazo en backend
      await api.patch("/trazabilidad/documentos-versiones/reemplazar", {
        expediente_tipo: expedienteTipo,
        expediente_id: expedienteId,
        campo_documento: docCampo,
        url_nueva,
        motivo: motivo.trim(),
      });

      toast.dismiss(toastId);
      toast.success(`"${docLabel}" reemplazado correctamente.`);

      if (onDocReemplazado) {
        onDocReemplazado();
      }
      onClose();
    } catch (err) {
      console.error("Error reemplazando documento:", err);
      const errorMsg =
        err.response?.data?.message || "Error al reemplazar el documento.";
      toast.error(errorMsg);
    } finally {
      setSubiendo(false);
    }
  };

  const getFileIcon = (url) => {
    if (!url) return <FaFileAlt />;
    const clean = url.split("?")[0].toLowerCase();
    if (clean.endsWith(".pdf"))
      return <FaFilePdf style={{ color: "#E53E3E" }} />;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(clean))
      return <FaFileImage style={{ color: "#38A169" }} />;
    return <FaFileAlt style={{ color: "#64748b" }} />;
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="reemplazar-doc-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="reemplazar-doc-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="reemplazar-doc-close-btn"
              onClick={onClose}
              disabled={subiendo}
            >
              <FaTimes />
            </button>

            <div className="reemplazar-doc-content">
              {/* Header */}
              <div className="reemplazar-doc-header">
                <FaExchangeAlt className="reemplazar-doc-header-icon" />
                <div>
                  <h2 className="reemplazar-doc-title">Reemplazar Documento</h2>
                  <p className="reemplazar-doc-subtitle">{docLabel}</p>
                </div>
              </div>

              {/* Warning */}
              <div className="reemplazar-doc-warning">
                <FaExclamationTriangle />
                <span>
                  Esta acción reemplazará el documento actual. La versión
                  anterior quedará registrada en el historial.
                </span>
              </div>

              {/* Current Doc */}
              {currentUrl && (
                <div className="reemplazar-doc-current">
                  <span className="reemplazar-doc-label">
                    Documento actual:
                  </span>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="reemplazar-doc-current-link"
                  >
                    {getFileIcon(currentUrl)} Ver documento actual
                  </a>
                </div>
              )}

              {/* File Input */}
              <div className="reemplazar-doc-field">
                <label className="reemplazar-doc-label">
                  Nuevo documento *
                </label>
                <div className="reemplazar-doc-file-input-wrapper">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleFileChange}
                    disabled={subiendo}
                    id="reemplazar-doc-file"
                  />
                  {archivo && (
                    <span className="reemplazar-doc-file-name">
                      {getFileIcon(archivo.name)} {archivo.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Motivo */}
              <div className="reemplazar-doc-field">
                <label className="reemplazar-doc-label">
                  Motivo del reemplazo *
                </label>
                <textarea
                  className="reemplazar-doc-textarea"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: El documento anterior estaba vencido y se actualizó con la versión vigente..."
                  maxLength={500}
                  disabled={subiendo}
                  rows={3}
                />
                <span className="reemplazar-doc-char-count">
                  {motivo.length}/500
                </span>
              </div>

              {/* Buttons */}
              <div className="reemplazar-doc-actions">
                <button
                  className="reemplazar-doc-btn secondary"
                  onClick={onClose}
                  disabled={subiendo}
                >
                  Cancelar
                </button>
                <button
                  className="reemplazar-doc-btn primary"
                  onClick={handleSubmit}
                  disabled={subiendo || !archivo || !motivo.trim()}
                >
                  {subiendo ? (
                    "Subiendo..."
                  ) : (
                    <>
                      <FaUpload /> Reemplazar Documento
                    </>
                  )}
                </button>
              </div>

              {/* Historial Toggle */}
              <div className="reemplazar-doc-historial-toggle">
                <button
                  className="reemplazar-doc-btn-historial"
                  onClick={cargarHistorial}
                  disabled={cargandoHistorial}
                >
                  <FaHistory />{" "}
                  {cargandoHistorial
                    ? "Cargando..."
                    : mostrarHistorial
                      ? "Ocultar historial"
                      : "Ver historial de versiones"}
                </button>
              </div>

              {/* Historial List */}
              <AnimatePresence>
                {mostrarHistorial && (
                  <motion.div
                    className="reemplazar-doc-historial"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {historial.length === 0 ? (
                      <p className="reemplazar-doc-historial-empty">
                        No hay versiones anteriores registradas.
                      </p>
                    ) : (
                      <ul className="reemplazar-doc-historial-list">
                        {historial.map((v) => (
                          <li
                            key={v.id}
                            className="reemplazar-doc-historial-item"
                          >
                            <div className="historial-item-header">
                              <span className="historial-item-date">
                                {format(
                                  parseISO(v.reemplazado_en),
                                  "dd/MM/yyyy hh:mm a",
                                )}
                              </span>
                              <span className="historial-item-user">
                                {v.reemplazado_por_nombre ||
                                  v.reemplazado_por_email ||
                                  "Usuario desconocido"}
                              </span>
                            </div>
                            <p className="historial-item-motivo">
                              <strong>Motivo:</strong> {v.motivo}
                            </p>
                            <div className="historial-item-links">
                              <a
                                href={v.url_anterior}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="historial-link anterior"
                              >
                                <FaDownload /> Versión anterior
                              </a>
                              <a
                                href={v.url_nueva}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="historial-link nueva"
                              >
                                <FaDownload /> Versión nueva
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ReemplazarDocumentoModal;
