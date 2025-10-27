// src/pages/trazabilidad_contabilidad/CreacionCliente.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Añadir useRef
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaUserTie, FaUserPlus, FaUpload, FaSpinner, FaInfoCircle, 
    FaHistory, FaFileAlt, FaCheckCircle, FaTimesCircle, FaDownload, 
    FaUser, FaEye, FaFilePdf, FaFileImage // Iconos para DocLink
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
const CreacionCliente = () => {
    const [rut, setRut] = useState(null);
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
        const input = document.getElementById('rut_cliente');
        if (input) input.value = null;
    };

    const fetchHistorial = useCallback(async () => {
        setLoadingHistorial(true);
        try {
            const { data } = await api.get('/trazabilidad/clientes/historial');
            setHistorial(data || []);
        } catch (error) {
            console.error("Error al cargar el historial de clientes:", error);
            if (error.response?.status !== 404) {
                toast.error("No se pudo cargar el historial de clientes.");
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
        
        if (!rut) {
            Swal.fire("Documento requerido", "Debe adjuntar el archivo RUT del cliente.", "warning");
            return;
        }

        // --- Confirmación con SweetAlert ---
        const confirmResult = await Swal.fire({
            title: "¿Confirmar creación del cliente?",
            html: `
                <div style="text-align: left; margin-top: 1rem;">
                    <p><strong>Archivo RUT:</strong> ${rut.name}</p>
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
        formData.append('rut_cliente', rut);

        try {
            await api.post('/trazabilidad/clientes', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            clearTimeout(submitTimeoutRef.current);
            Swal.fire("¡Éxito!", "Cliente creado correctamente.", "success");
            resetForm();
            fetchHistorial();
        } catch (error) {
            clearTimeout(submitTimeoutRef.current);
            console.error("Error al crear cliente:", error);
            Swal.fire("Error", error.response?.data?.message || "Error al crear el cliente.", "error");
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
                    <FaUserTie />
                    Crear Nuevo Cliente (Contabilidad)
                </h2>
                <p className="trazabilidad-subtitle">
                    Adjunta el RUT para registrar un nuevo cliente.
                </p>

                <form onSubmit={handleSubmitWithProtection} className="trazabilidad-form">
                    <div className="form-separator">
                        <span>Documento Requerido</span>
                    </div>
                    <div className="trazabilidad-form-grid" style={{gridTemplateColumns: '1fr'}}>
                        <FileInput
                            label="RUT del Cliente"
                            name="rut_cliente"
                            file={rut}
                            setFile={setRut}
                            isRequired={true}
                        />
                    </div>
                    <div className="form-actions">
                        <button 
                            type="submit" 
                            className={`submit-btn ${isSubmitting ? "submitting" : ""}`}
                            disabled={loading || isSubmitting || !rut}
                        >
                            {loading || isSubmitting ? <FaSpinner className="spinner" /> : <FaUserPlus />}
                            {loading || isSubmitting ? "Guardando..." : "Guardar Cliente"}
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
                    Historial de Clientes Creados
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
                            <span>No has creado ningún cliente todavía.</span>
                        </motion.div>
                    ) : (
                        <motion.div key="list" className="historial-list">
                            <div className="historial-table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Creado por</th>
                                            <th>Fecha Creación</th>
                                            <th>RUT (Documento)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.map(cli => (
                                            <tr key={cli.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <FaUser />
                                                        {cli.profiles?.nombre || 'Usuario desconocido'}
                                                    </div>
                                                </td>
                                                <td>
                                                    {format(parseISO(cli.created_at), 'dd/MM/yyyy hh:mm a')}
                                                </td>
                                                <td className="historial-docs">
                                                    <DocLink url={cli.url_rut} title="RUT" onPreview={openPreview} />
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

export default CreacionCliente;