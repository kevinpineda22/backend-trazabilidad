import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaTrash,
  FaDownload,
  FaUpload,
  FaFileAlt,
  FaFilePdf,
  FaFileImage,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { uploadFileToBucket } from "../../supabaseClient";
import "./GestionDocumentos.css";

const GestionDocumentos = ({ userRole }) => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nuevoDoc, setNuevoDoc] = useState({
    file: null,
    tipo_destino: "ambos",
  });

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/admin-documentos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDocumentos(response.data);
    } catch (error) {
      console.error("Error cargando documentos:", error);
      toast.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setNuevoDoc({ ...nuevoDoc, file: e.target.files[0] });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!nuevoDoc.file) return toast.warning("Selecciona un archivo");

    try {
      setUploading(true);
      const token = localStorage.getItem("token");

      // 1. Subir a Storage
      const folder = "admin_docs";
      // Limpiar nombre de archivo de caracteres especiales
      const cleanName = nuevoDoc.file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const fileName = `${Date.now()}_${cleanName}`;

      const url = await uploadFileToBucket({
        bucket: "documentos_contabilidad",
        path: `${folder}/${fileName}`,
        file: nuevoDoc.file,
      });

      // 2. Guardar en BD
      await axios.post(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/admin-documentos`,
        {
          nombre_archivo: nuevoDoc.file.name,
          url_archivo: url,
          tipo_destino: nuevoDoc.tipo_destino,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Documento subido correctamente");
      setNuevoDoc({ ...nuevoDoc, file: null });
      // Reset file input
      document.getElementById("file-upload").value = "";
      cargarDocumentos();
    } catch (error) {
      console.error("Error subiendo documento:", error);
      toast.error("Error al subir documento");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este documento?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/admin-documentos/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Documento eliminado");
      cargarDocumentos();
    } catch (error) {
      console.error("Error eliminando documento:", error);
      toast.error("Error al eliminar documento");
    }
  };

  const getIcon = (fileName) => {
    if (fileName.endsWith(".pdf"))
      return <FaFilePdf className="doc-icon pdf" />;
    if (fileName.match(/\.(jpg|jpeg|png|gif)$/i))
      return <FaFileImage className="doc-icon image" />;
    return <FaFileAlt className="doc-icon" />;
  };

  return (
    <div className="gestion-docs-container">
      <div className="docs-header">
        <h2>Gestión de Documentos Anexos</h2>
        <p>
          Sube documentos que estarán disponibles para descargar en los
          formularios de proveedores y clientes.
        </p>
      </div>

      <div className="docs-content-wrapper">
        <div className="docs-upload-card">
          <h3>
            <FaUpload /> Subir Nuevo Documento
          </h3>
          <form onSubmit={handleUpload} className="docs-upload-form">
            <div className="form-group">
              <label>Archivo</label>
              <div className="file-input-wrapper">
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  required
                  className="file-input"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Destino (Quién lo verá)</label>
              <select
                value={nuevoDoc.tipo_destino}
                onChange={(e) =>
                  setNuevoDoc({ ...nuevoDoc, tipo_destino: e.target.value })
                }
                className="select-input"
              >
                <option value="ambos">Ambos (Clientes y Proveedores)</option>
                <option value="cliente">Solo Clientes</option>
                <option value="proveedor">Solo Proveedores</option>
              </select>
            </div>
            <button type="submit" disabled={uploading} className="btn-upload">
              {uploading ? "Subiendo..." : "Subir Documento"}
            </button>
          </form>
        </div>

        <div className="docs-list-card">
          <h3>Documentos Activos</h3>
          {loading ? (
            <div className="loader">Cargando...</div>
          ) : (
            <div className="table-responsive">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Destino</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center">
                        No hay documentos cargados.
                      </td>
                    </tr>
                  ) : (
                    documentos.map((doc) => (
                      <tr key={doc.id}>
                        <td className="doc-name-cell">
                          {getIcon(doc.nombre_archivo)}
                          <span>{doc.nombre_archivo}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${doc.tipo_destino}`}>
                            {doc.tipo_destino === "ambos"
                              ? "Todos"
                              : doc.tipo_destino}
                          </span>
                        </td>
                        <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                        <td className="actions-cell">
                          <a
                            href={doc.url_archivo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-icon btn-view"
                            title="Ver/Descargar"
                          >
                            <FaDownload />
                          </a>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="btn-icon btn-delete"
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestionDocumentos;
