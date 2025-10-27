// src/pages/trazabilidad_contabilidad/CreacionProveedor.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Añadir useRef
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaHardHat, FaUpload, FaSpinner, FaHistory, FaFileAlt, FaCheckCircle, 
    FaTimesCircle, FaDownload, FaUser, FaUserPlus, FaInfoCircle,
    FaEye, FaFilePdf, FaFileImage // Iconos para DocLink
} from 'react-icons/fa';
import { apiTrazabilidad as api } from '../../services/api'; // Usar la API correcta
import { toast } from 'react-toastify';
import Swal from 'sweetalert2'; // <-- Importar SweetAlert
import { format, parseISO } from 'date-fns';
import './CreacionSubirEmpleado.css'; // Reutilizar CSS
import FilePreviewModal from './FilePreviewModal'; // <-- Importar Modal

// --- Componente de Input de Archivo (Sin cambios) ---
const FileInput = ({ label, name, file, setFile, isRequired = false }) => {
    // ... (Tu código de FileInput va aquí, sin cambios) ...
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };
    const handleRemoveFile = () => {
        setFile(null);
        const input = document.getElementById(name);
        if (input) input.value = null;
    };
    return (
        <div className={`form-group ${file ? 'file-selected' : ''}`}>
            <label htmlFor={name}>
                {label} {isRequired && <span className="required">*</span>}
            </label>
            <div className="file-input-wrapper">
                <input
                    type="file"
                    id={name}
                    name={name}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.png,.zip,.rar"
                />
                {!file ? (
                    <label htmlFor={name} className="file-input-label">
                        <FaUpload />
                        <span>Adjuntar documento</span>
                    </label>
                ) : (
                    <div className="file-preview">
                        <FaFileAlt />
                        <span className="file-name" title={file.name}>{file.name}</span>
                        <button type="button" onClick={handleRemoveFile} className="file-remove-btn" title="Quitar archivo">
                            <FaTimesCircle />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- NUEVO: Componente DocLink (reutilizable) ---
const DocLink = ({ url, title, onPreview }) => {
    if (!url) return <span className="doc-link-empty">N/A</span>;
    
    const isPdf = url.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const icon = isPdf ? <FaFilePdf /> : isImage ? <FaFileImage /> : <FaFileAlt />;

    return (
        <button type="button" className="doc-link-button" onClick={() => onPreview(url)} title={`Ver ${title}`}>
            {icon}
            <span>{title}</span>
        </button>
    );
};

// Componente principal
const CreacionProveedor = () => {
    const [rut, setRut] = useState(null);
    const [camaraComercio, setCamaraComercio] = useState(null);
    const [formatoVinculacion, setFormatoVinculacion] = useState(null);
    const [composicionAccionaria, setComposicionAccionaria] = useState(null);
    const [certificacionBancaria, setCertificacionBancaria] = useState(null);
    const [loading, setLoading] = useState(false);
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(true);

    // --- NUEVO: Estado para protección de envío y modal ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitTimeoutRef = useRef(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");

    const openPreview = (url) => { setPreviewUrl(url); setModalOpen(true); };
    const closePreview = () => { setModalOpen(false); setPreviewUrl(""); };
    // --- Fin nuevo estado ---

    const resetForm = () => {
        setRut(null);
        setCamaraComercio(null);
        setFormatoVinculacion(null);
        setComposicionAccionaria(null);
        setCertificacionBancaria(null);
        const inputs = ['rut', 'camara_comercio', 'formato_vinculacion', 'composicion_accionaria', 'certificacion_bancaria'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = null;
        });
    };

    const fetchHistorial = useCallback(async () => {
        setLoadingHistorial(true);
        try {
            const { data } = await api.get('/trazabilidad/proveedores/historial');
            setHistorial(data || []);
        } catch (error) {
            console.error("Error al cargar el historial de proveedores:", error);
            if (error.response?.status !== 404) {
                toast.error("No se pudo cargar el historial de proveedores.");
            }
        } finally {
            setLoadingHistorial(false);
        }
    }, []);

    useEffect(() => {
        fetchHistorial();
        return () => {
            if (submitTimeoutRef.current) {
                clearTimeout(submitTimeoutRef.current);
            }
        };
    }, [fetchHistorial]);

    // --- NUEVO: handleSubmit con protecciones y SweetAlert ---
    const handleSubmitWithProtection = async (e) => {
        e.preventDefault();
        if (isSubmitting || loading) {
            toast.warning("Ya se está procesando una solicitud. Por favor, espere.");
            return;
        }

        if (!rut || !camaraComercio || !certificacionBancaria) {
            Swal.fire("Documentos obligatorios", "RUT, Cámara de Comercio y Certificación Bancaria son obligatorios.", "warning");
            return;
        }
        
        // --- Confirmación con SweetAlert ---
        const confirmResult = await Swal.fire({
            title: "¿Confirmar creación del proveedor?",
            html: `
                <div style="text-align: left; margin-top: 1rem;">
                    <p>Se adjuntarán los siguientes archivos:</p>
                    <ul style="list-style-position: inside;">
                        <li><strong>RUT:</strong> ${rut.name}</li>
                        <li><strong>Cám. Comercio:</strong> ${camaraComercio.name}</li>
                        <li><strong>Cert. Bancaria:</strong> ${certificacionBancaria.name}</li>
                        ${formatoVinculacion ? `<li><strong>Vinculación:</strong> ${formatoVinculacion.name}</li>` : ''}
                        ${composicionAccionaria ? `<li><strong>Comp. Accionaria:</strong> ${composicionAccionaria.name}</li>` : ''}
                    </ul>
                </div>
            `,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "✅ Sí, crear",
            cancelButtonText: "❌ Cancelar",
        });

        if (!confirmResult.isConfirmed) {
            return;
        }

        setIsSubmitting(true);
        setLoading(true);
        submitTimeoutRef.current = setTimeout(() => {
            setIsSubmitting(false);
            setLoading(false);
            toast.error("Tiempo de espera agotado. Inténtelo nuevamente.");
        }, 30000); // 30 segundos de timeout

        const formData = new FormData();
        formData.append('rut', rut);
        formData.append('camara_comercio', camaraComercio);
        if (formatoVinculacion) formData.append('formato_vinculacion', formatoVinculacion);
        if (composicionAccionaria) formData.append('composicion_accionaria', composicionAccionaria);
        formData.append('certificacion_bancaria', certificacionBancaria);

        try {
            await api.post('/trazabilidad/proveedores', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            clearTimeout(submitTimeoutRef.current);
            Swal.fire("¡Éxito!", "Proveedor creado correctamente.", "success");
            resetForm();
            fetchHistorial();
        } catch (error) {
            clearTimeout(submitTimeoutRef.current);
            console.error("Error al crear proveedor:", error);
            Swal.fire("Error", error.response?.data?.message || "Error al crear el proveedor.", "error");
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="trazabilidad-page">
            <FilePreviewModal isOpen={modalOpen} onClose={closePreview} fileUrl={previewUrl} />

            <motion.div
                className="trazabilidad-form-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="trazabilidad-title">
                    <FaHardHat />
                    Crear Nuevo Proveedor (Contabilidad)
                </h2>
                <p className="trazabilidad-subtitle">
                    Adjunta todos los documentos requeridos para la creación y vinculación del proveedor.
                </p>

                <form onSubmit={handleSubmitWithProtection} className="trazabilidad-form">
                    <div className="form-separator">
                        <span>Documentos Requeridos</span>
                    </div>
                    <div className="trazabilidad-form-grid three-cols file-grid">
                        <FileInput label="RUT" name="rut" file={rut} setFile={setRut} isRequired={true} />
                        <FileInput label="Cámara de Comercio" name="camara_comercio" file={camaraComercio} setFile={setCamaraComercio} isRequired={true} />
                        <FileInput label="Certificación Bancaria" name="certificacion_bancaria" file={certificacionBancaria} setFile={setCertificacionBancaria} isRequired={true} />
                        <FileInput label="Formato Vinculación" name="formato_vinculacion" file={formatoVinculacion} setFile={setFormatoVinculacion} />
                        <FileInput label="Composición Accionaria" name="composicion_accionaria" file={composicionAccionaria} setFile={setComposicionAccionaria} />
                    </div>
                    <div className="form-actions">
                        <button 
                            type="submit" 
                            className={`submit-btn ${isSubmitting ? "submitting" : ""}`} 
                            disabled={loading || isSubmitting || !rut || !camaraComercio || !certificacionBancaria}
                        >
                            {loading || isSubmitting ? <FaSpinner className="spinner" /> : <FaUserPlus />}
                            {loading || isSubmitting ? "Guardando..." : "Guardar Proveedor"}
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* --- SECCIÓN DE HISTORIAL (ACTUALIZADA CON DocLink) --- */}
            <motion.div
                className="trazabilidad-historial-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="trazabilidad-title">
                    <FaHistory />
                    Historial de Proveedores Creados
                </h2>
                <AnimatePresence mode="wait">
                    {loadingHistorial ? (
                        <motion.div key="loading" className="historial-message loading">
                            <FaSpinner className="spinner" />
                            <span>Cargando historial...</span>
                        </motion.div>
                    ) : historial.length === 0 ? (
                        <motion.div key="empty" className="historial-message">
                            <FaInfoCircle />
                            <span>No has creado ningún proveedor todavía.</span>
                        </motion.div>
                    ) : (
                        <motion.div key="list" className="historial-list">
                            <div className="historial-table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Creado por</th>
                                            <th>Fecha Creación</th>
                                            <th>RUT</th>
                                            <th>Cám. Comercio</th>
                                            <th>Cert. Bancaria</th>
                                            <th>Vinculación</th>
                                            <th>Comp. Accionaria</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.map(prov => (
                                            <tr key={prov.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <FaUser />
                                                        {prov.profiles?.nombre || 'Usuario desconocido'}
                                                    </div>
                                                </td>
                                                <td>
                                                    {format(parseISO(prov.created_at), 'dd/MM/yyyy hh:mm a')}
                                                </td>
                                                <td className="historial-docs">
                                                    <DocLink url={prov.url_rut} title="RUT" onPreview={openPreview} />
                                                </td>
                                                <td className="historial-docs">
                                                    <DocLink url={prov.url_camara_comercio} title="C. Comercio" onPreview={openPreview} />
                                                </td>
                                                <td className="historial-docs">
                                                    <DocLink url={prov.url_certificacion_bancaria} title="Cert. Banc." onPreview={openPreview} />
                                                </td>
                                                <td className="historial-docs">
                                                    <DocLink url={prov.url_formato_vinculacion} title="Vinculación" onPreview={openPreview} />
                                                </td>
                                                <td className="historial-docs">
                                                    <DocLink url={prov.url_composicion_accionaria} title="Comp. Acc." onPreview={openPreview} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default CreacionProveedor;