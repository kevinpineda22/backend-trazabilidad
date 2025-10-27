// src/pages/trazabilidad_contabilidad/CreacionSubirEmpleado.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaUserPlus, FaUpload, FaSpinner, FaHistory, FaFileAlt, FaInfoCircle, 
    FaCheckCircle, FaTimesCircle, FaDownload, FaUser, FaEye, FaFilePdf, FaFileImage 
} from 'react-icons/fa';
import { apiTrazabilidad as api } from '../../services/api';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2'; // <-- Importar SweetAlert
import { format, parseISO } from 'date-fns';
import './CreacionSubirEmpleado.css';
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
                    accept=".pdf,.doc,.docx,.jpg,.png"
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


// --- Componente Principal ---
const CreacionSubirEmpleado = () => {
    const [nombre, setNombre] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [cedulaInput, setCedulaInput] = useState('');
    const [contacto, setContacto] = useState('');
    const [correo, setCorreo] = useState('');
    const [direccion, setDireccion] = useState('');
    const [codigoCiudad, setCodigoCiudad] = useState('');
    const [hojaDeVida, setHojaDeVida] = useState(null);
    const [cedulaFile, setCedulaFile] = useState(null);
    const [certificadoBancario, setCertificadoBancario] = useState(null);
    
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
        setNombre('');
        setApellidos('');
        setCedulaInput('');
        setContacto('');
        setCorreo('');
        setDireccion('');
        setCodigoCiudad('');
        setHojaDeVida(null);
        setCedulaFile(null);
        setCertificadoBancario(null);
        document.getElementById('hoja_de_vida').value = null;
        document.getElementById('cedula_file').value = null;
        document.getElementById('certificado_bancario').value = null;
    };

    const fetchHistorial = useCallback(async () => {
        setLoadingHistorial(true);
        try {
            const { data } = await api.get('/trazabilidad/empleados/historial');
            setHistorial(data || []);
        } catch (error) {
            console.error("Error al cargar el historial:", error);
            if (error.response?.status !== 404) {
                 toast.error("No se pudo cargar el historial.");
            }
        } finally {
            setLoadingHistorial(false);
        }
    }, []);

    useEffect(() => {
        fetchHistorial();
        // Limpiar timeout si el componente se desmonta
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

        if (!nombre || !apellidos || !cedulaInput) {
            Swal.fire("Campos incompletos", "Nombre, Apellidos y Cédula son obligatorios.", "warning");
            return;
        }
        if (!hojaDeVida || !cedulaFile || !certificadoBancario) {
            Swal.fire("Documentos faltantes", "Debe adjuntar Hoja de Vida, Cédula y Certificado Bancario.", "warning");
            return;
        }

        // --- Confirmación con SweetAlert ---
        const confirmResult = await Swal.fire({
            title: "¿Confirmar creación del empleado?",
            html: `
                <div style="text-align: left; margin-top: 1rem;">
                    <p><strong>Nombre:</strong> ${nombre} ${apellidos}</p>
                    <p><strong>Cédula:</strong> ${cedulaInput}</p>
                    <hr style="margin: 1rem 0;" />
                    <p><strong>Hoja de Vida:</strong> ${hojaDeVida.name}</p>
                    <p><strong>Cédula Adjunta:</strong> ${cedulaFile.name}</p>
                    <p><strong>Cert. Bancario:</strong> ${certificadoBancario.name}</p>
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
        // Timeout de seguridad de 30s
        submitTimeoutRef.current = setTimeout(() => {
            setIsSubmitting(false);
            setLoading(false);
            toast.error("Tiempo de espera agotado. Inténtelo nuevamente.");
        }, 30000);

        const formData = new FormData();
        formData.append('nombre', nombre);
        formData.append('apellidos', apellidos);
        formData.append('cedula', cedulaInput);
        formData.append('contacto', contacto);
        formData.append('correo_electronico', correo);
        formData.append('direccion', direccion);
        formData.append('codigo_ciudad', codigoCiudad);
        formData.append('hoja_de_vida', hojaDeVida);
        formData.append('cedula_file', cedulaFile);
        formData.append('certificado_bancario', certificadoBancario);

        try {
            await api.post('/trazabilidad/empleados', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            clearTimeout(submitTimeoutRef.current);
            Swal.fire("¡Éxito!", "Empleado creado correctamente.", "success");
            resetForm();
            fetchHistorial();
        } catch (error) {
            clearTimeout(submitTimeoutRef.current);
            console.error("Error al crear empleado:", error);
            let errorMsg = "Error al crear el empleado.";
            if (error.response?.data?.details?.includes('empleados_contabilidad_cedula_key')) {
                errorMsg = "Error: Ya existe un empleado con esa cédula.";
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            }
            Swal.fire("Error", errorMsg, "error");
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
                    <FaUserPlus />
                    Crear Nuevo Empleado (Contabilidad)
                </h2>
                <p className="trazabilidad-subtitle">
                    Diligencia los datos y adjunta los documentos requeridos para el ingreso del nuevo empleado.
                </p>

                <form onSubmit={handleSubmitWithProtection} className="trazabilidad-form">
                    <div className="trazabilidad-form-grid three-cols">
                        {/* ... (inputs de texto sin cambios) ... */}
                        <div className="form-group">
                            <label htmlFor="nombre">Nombre <span className="required">*</span></label>
                            <input type="text" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Ana" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="apellidos">Apellidos <span className="required">*</span></label>
                            <input type="text" id="apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Ej: Pérez" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="cedula_input">Cédula (N°) <span className="required">*</span></label>
                            <input type="text" id="cedula_input" value={cedulaInput} onChange={(e) => setCedulaInput(e.target.value)} placeholder="Ej: 10203040" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="contacto">Contacto (Celular)</label>
                            <input type="tel" id="contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Ej: 3001234567" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="correo">Correo Electrónico</label>
                            <input type="email" id="correo" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Ej: ana.perez@email.com" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="direccion">Dirección</label>
                            <input type="text" id="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Calle 50 # 45 - 30" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="codigo_pais">Código País</label>
                            <input type="text" id="codigo_pais" value="169" readOnly disabled className="readonly-input" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="codigo_dpto">Código Departamento</label>
                            <input type="text" id="codigo_dpto" value="05" readOnly disabled className="readonly-input" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="codigo_ciudad">Código Ciudad</label>
                            <input type="text" id="codigo_ciudad" value={codigoCiudad} onChange={(e) => setCodigoCiudad(e.target.value)} placeholder="Ej: 001 (Medellín)" />
                        </div>
                    </div>

                    <div className="form-separator">
                        <span>Documentos Requeridos</span>
                    </div>

                    <div className="trazabilidad-form-grid three-cols file-grid">
                        <FileInput label="Hoja de Vida" name="hoja_de_vida" file={hojaDeVida} setFile={setHojaDeVida} isRequired={true} />
                        <FileInput label="Cédula Adjunta" name="cedula_file" file={cedulaFile} setFile={setCedulaFile} isRequired={true} />
                        <FileInput label="Certificado Bancario" name="certificado_bancario" file={certificadoBancario} setFile={setCertificadoBancario} isRequired={true} />
                    </div>

                    <div className="form-actions">
                        <button 
                            type="submit" 
                            className={`submit-btn ${isSubmitting ? "submitting" : ""}`} 
                            disabled={loading || isSubmitting}
                        >
                            {loading || isSubmitting ? <FaSpinner className="spinner" /> : <FaUserPlus />}
                            {loading || isSubmitting ? "Guardando..." : "Guardar Empleado"}
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
                    Historial de Creaciones
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
                            <span>No has creado ningún empleado todavía.</span>
                        </motion.div>
                    ) : (
                        <motion.div key="list" className="historial-list">
                            <div className="historial-table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Creado Por</th>
                                            <th>Nombre Completo</th>
                                            <th>Cédula</th>
                                            <th>Contacto</th>
                                            <th>Documentos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.map(emp => (
                                            <tr key={emp.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <FaUser />
                                                        {emp.profiles?.nombre || 'N/A'}
                                                    </div>
                                                </td>
                                                <td>{emp.nombre} {emp.apellidos}</td>
                                                <td>{emp.cedula || 'N/A'}</td>
                                                <td>{emp.contacto || 'N/A'}</td>
                                                <td className="historial-docs">
                                                    <DocLink url={emp.url_hoja_de_vida} title="Hoja de Vida" onPreview={openPreview} />
                                                    <DocLink url={emp.url_cedula} title="Cédula" onPreview={openPreview} />
                                                    <DocLink url={emp.url_certificado_bancario} title="Cert. Bancario" onPreview={openPreview} />
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

export default CreacionSubirEmpleado;