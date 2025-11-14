// src/pages/trazabilidad_contabilidad/FilePreviewModal.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { Worker } from "@react-pdf-viewer/core";
import { Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "./FilePreviewModal.css";

const FilePreviewModal = ({ isOpen, fileUrl, onClose }) => {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const isValidUrl = fileUrl && typeof fileUrl === "string";
  const isPdf = isValidUrl && fileUrl.toLowerCase().endsWith(".pdf");
  const isImage = isValidUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

  let content;
  if (isValidUrl) {
    if (isPdf) {
      content = (
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <div className="file-preview-pdf-viewer">
            <Viewer fileUrl={fileUrl} plugins={[defaultLayoutPluginInstance]} />
          </div>
        </Worker>
      );
    } else if (isImage) {
      content = <img src={fileUrl} alt="Vista previa" className="file-preview-image" />;
    } else {
      content = (
        <div className="file-preview-unsupported">
          <p>No se puede previsualizar este tipo de archivo.</p>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="file-preview-download-btn">
            Descargar Archivo
          </a>
        </div>
      );
    }
  } else {
    content = (
      <div className="file-preview-unsupported">
        <p>No se proporcionó un archivo válido.</p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="file-preview-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="file-preview-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="file-preview-close-btn" onClick={onClose}>
              <FaTimes />
            </button>
            <div className="file-preview-content">{content}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilePreviewModal;
