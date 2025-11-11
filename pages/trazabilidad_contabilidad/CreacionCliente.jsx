import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaUserTie, FaUserPlus, FaUser, FaUpload, FaFileAlt, FaTimesCircle, FaFilePdf, FaFileImage, FaHistory, FaSpinner, FaInfoCircle, FaSort, FaSortUp, FaSortDown,
    FaEdit, 
} from "react-icons/fa";
import { format, parseISO } from "date-fns";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
    
import { apiTrazabilidad } from "../../services/apiTrazabilidad";
import { uploadFileToBucket } from "../../supabaseClient"; 
import FilePreviewModal from "./FilePreviewModal";
import "./CreacionSubirEmpleado.css"; 

// CONFIGURACIÓN CENTRALIZADA
const BUCKET_NAME = 'documentos_contabilidad'; 
const FOLDER_BASE = 'clientes';
const SWAL_CUSTOM_CLASSES = {
    container: 'tc-swal-container',
    title: 'tc-swal-title',
    confirmButton: 'tc-swal-confirm',
    cancelButton: 'tc-swal-cancel',
};

//==================================================================
// 1. COMPONENTE FileInput (¡NUEVA VERSIÓN INTELIGENTE!)
//==================================================================
const FileInput = ({ label, name, file, setFile, isRequired = false }) => {
    
    const fileInputRef = useRef(null);
    const isString = typeof file === 'string' && file.length > 0;
    const isFile = file instanceof File;

    let displayName = "N/A";
    if (isString) {
        const match = file.match(/[^/]*$/);
        displayName = match ? match[0].split('?')[0] : "Archivo Cargado";
        try {
            displayName = decodeURIComponent(displayName);
        } catch (e) { /* No hacer nada */ }
    } else if (isFile) {
        displayName = file.name;
    }

    const getIcon = () => {
        const nameToTest = isString ? file : (isFile ? file.name : "");
        if (nameToTest.toLowerCase().endsWith(".pdf")) return <FaFilePdf style={{ color: '#E53E3E' }} />;
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(nameToTest)) return <FaFileImage style={{ color: '#38A169' }} />;
        return <FaFileAlt />;
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleRemoveFile = (e) => {
        e.stopPropagation();
        setFile(null); 
        if (fileInputRef.current) {
            fileInputRef.current.value = null; 
        }
    };

    const handleTriggerInput = (e) => {
        e.preventDefault();
        fileInputRef.current.click();
    };
    
    return (
        <div className={`tc-form-group ${file ? "tc-file-selected" : ""}`}>
            <label htmlFor={name}>
                {label} {isRequired && <span className="required">*</span>}
            </label>
            <div className="tc-file-input-wrapper">
                <input 
                    type="file" 
                    id={name} 
                    name={name} 
                    onChange={handleFileChange} 
                    ref={fileInputRef} 
                    style={{ display: 'none' }}
                />
                {!file && (
                    <label htmlFor={name} className="tc-file-label">
                        <FaUpload /> <span>Adjuntar documento</span>
                    </label>
                )}
                {isFile && (
                    <div className="tc-file-preview tc-file-new">
                        {getIcon()}
                        <span className="tc-file-name" title={displayName}>{displayName}</span>
                        <button type="button" onClick={handleRemoveFile} className="tc-file-remove-btn" title="Quitar archivo">
                            <FaTimesCircle />
                        </button>
                    </div>
                )}
                {isString && (
                    <div className="tc-file-preview tc-file-existing">
                        {getIcon()}
                        <span className="tc-file-name" title={displayName}>✔️ {displayName}</span>
                        <button type="button" onClick={handleTriggerInput} className="tc-file-change-btn" title="Cambiar archivo">
                            Cambiar
                        </button>
                        <button type="button" onClick={handleRemoveFile} className="tc-file-remove-btn" title="Quitar archivo">
                            <FaTimesCircle />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

//==================================================================
// 2. COMPONENTES REUTILIZABLES (Sin cambios)
//==================================================================

const DocLink = ({ url, label, onPreview }) => {
    // (Esta función no cambia)
    if (!url) return <span className="tc-doc-item doc-link-empty">{label}: N/A</span>;
    
    const isPdf = url.toLowerCase().endsWith(".pdf");
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const icon = isPdf ? <FaFilePdf style={{ color: '#E53E3E' }} /> : isImage ? <FaFileImage style={{ color: '#38A169' }} /> : <FaFileAlt />;

    const fileNameMatch = url.match(/[^/]*$/);
    const fileName = fileNameMatch ? fileNameMatch[0].split('?')[0] : 'Documento';

    return (
        <div className="tc-doc-item">
            <span className="tc-doc-label">{label}:</span>
            <button 
                type="button" 
                className="tc-doc-button" 
                onClick={() => onPreview(url)} 
                title={`Ver ${label} (${fileName})`}
            >
                {icon}
            </button>
        </div>
    );
};

const useSortableData = (items, config = null) => {
    // (Esta función no cambia)
    const [sortConfig, setSortConfig] = useState(config);
    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                if (valA < valB) return sortConfig.direction === "ascending" ? -1 : 1;
                if (valA > valB) return sortConfig.direction === "ascending" ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key) => {
        let direction = "ascending";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
            direction = "descending";
        }
        setSortConfig({ key, direction });
    };
    return { items: sortedItems, requestSort, sortConfig };
};

const HistorialTable = ({ isLoading, data, columns, emptyMessage, defaultSortKey = "created_at" }) => {
    // (Esta función no cambia)
    const { items, requestSort, sortConfig } = useSortableData(data, {
        key: defaultSortKey,
        direction: "descending",
    });

    const getSortIcon = (key) => {
        if (!sortConfig || sortConfig.key !== key) return <FaSort className="tc-sort-icon" />;
        return sortConfig.direction === "ascending" ? (
            <FaSortUp className="tc-sort-icon active" />
        ) : (
            <FaSortDown className="tc-sort-icon active" />
        );
    };

    return (
        <AnimatePresence mode="wait">
            {isLoading ? (
                <motion.div key="loading" className="tc-historial-message loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <FaSpinner className="tc-spinner" /> <span>Cargando historial...</span>
                </motion.div>
            ) : items.length === 0 ? (
                <motion.div key="empty" className="tc-historial-message" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <FaInfoCircle /> <span>{emptyMessage}</span>
                </motion.div>
            ) : (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="tc-historial-table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    {columns.map((col) => (
                                        <th 
                                            key={col.key} 
                                            className={col.sortable ? "tc-sortable-header" : ""} 
                                            style={{ textAlign: 'center' }} 
                                            onClick={() => (col.sortable ? requestSort(col.key) : null)}
                                        >
                                            {col.header}
                                            {col.sortable && getSortIcon(col.key)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        {columns.map((col) => (
                                            <td key={`${item.id}-${col.key}`} className={`${col.className || ""} ${col.centered ? 'tc-centered-cell' : ''}`}>
                                                {col.cell ? col.cell(item) : item[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const TrazabilidadPageLayout = ({ title, icon, subtitle, formContent, historialTitle, historialContent, formCardRef }) => {
    // (Esta función no cambia)
    return (
        <div className="tc-page-container">
            <motion.div className="tc-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} ref={formCardRef}>
                <h2 className="tc-title">{icon}{title}</h2>
                <p className="tc-subtitle">{subtitle}</p>
                {formContent}
            </motion.div>
            
            {/* Ocultar historial en modo público */}
            {!modoPublico && (
                <motion.div className="tc-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h2 className="tc-title"><FaHistory />{historialTitle}</h2>
                    {historialContent}
                </motion.div>
            )}
        </div>
    );
};

const parseApiError = (error) => {
    // (Esta función no cambia)
    if (error.response?.data?.message) {
        return error.response.data.message;
    }
    if (error.message) {
        if (error.message.includes('timeout')) {
            return "Tiempo de espera agotado. La solicitud tardó demasiado.";
        }
        if (error.message.includes('Network Error')) {
            return "Error de red. Verifique la conexión o la configuración del servidor.";
        }
        return error.message; 
    }
    return "Ocurrió un error inesperado al procesar la solicitud.";
};

// ==================================================================

//==================================================================
// 3. COMPONENTE PRINCIPAL (¡ACTUALIZADO!)
//==================================================================
const CreacionCliente = () => {
    // Detectar si hay token en la URL (modo público)
    const [searchParams] = useSearchParams();
    const tokenPublico = searchParams.get('token');
    const modoPublico = !!tokenPublico;

    // --- ¡NUEVO ESTADO DE EDICIÓN! ---
    const [idParaEditar, setIdParaEditar] = useState(null);
    const enModoEdicion = idParaEditar !== null;
    const formCardRef = useRef(null); // Ref para hacer scroll

    // --- ¡ESTADO DEL FORMULARIO ACTUALIZADO! ---
    const [cupo, setCupo] = useState("");
    const [plazo, setPlazo] = useState("");
    const [rut, setRut] = useState(null);
    const [camaraComercio, setCamaraComercio] = useState(null);
    const [formatoSangrilaft, setFormatoSangrilaft] = useState(null); // Renombrado
    const [cedulaFile, setCedulaFile] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    
    // --- (Estados de Carga y Modal no cambian) ---
    const [modalOpen, setModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitTimeoutRef = useRef(null);

    const openPreview = (url) => { setPreviewUrl(url); setModalOpen(true); };
    const closePreview = () => { setModalOpen(false); setPreviewUrl(""); };
    
    // --- (Lógica de Historial no cambia) ---
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(true);
    
    const fetchHistorial = useCallback(async () => {
        setLoadingHistorial(true);
        try {
            const { data } = await apiTrazabilidad.get("/trazabilidad/clientes/historial");
            setHistorial(data || []);
        } catch (error) {
            console.error("Error al cargar el historial:", error);
            if (error.response?.status !== 404 && error.response?.status !== 401) {
                toast.error("No se pudo cargar el historial.");
            }
            setHistorial([]);
        } finally {
            setLoadingHistorial(false);
        }
    }, []);
    
    useEffect(() => {
        // Solo cargar historial si NO está en modo público
        if (!modoPublico) {
            fetchHistorial();
        }
        return () => {
            if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
        };
    }, [fetchHistorial, modoPublico]);

    // --- ¡FUNCIÓN resetForm ACTUALIZADA! ---
    const resetForm = () => {
        setIdParaEditar(null); 
        setCupo("");
        setPlazo("");
        setRut(null);
        setCamaraComercio(null);
        setFormatoSangrilaft(null); // Renombrado
        setCedulaFile(null);
        setFormErrors({});
        
        const inputs = ["rut_cliente", "camara_comercio", "formato_sangrilaft", "cedula_cliente"]; // Renombrado
        inputs.forEach((id) => {
            const input = document.getElementById(id);
            if (input) input.value = null;
        });
    };
    
    // --- ¡NUEVA FUNCIÓN! ---
    // Carga los datos del item en el formulario para editar
    const handleCargarParaEditar = (item) => {
        setIdParaEditar(item.id);
        setCupo(item.cupo || "");
        setPlazo(item.plazo || "");
        setRut(item.url_rut || null);
        setCamaraComercio(item.url_camara_comercio || null);
        setFormatoSangrilaft(item.url_formato_sangrilaft || null); // Renombrado
        setCedulaFile(item.url_cedula || null);
        setFormErrors({});
        if (formCardRef.current) {
            formCardRef.current.scrollIntoView({ behavior: "smooth" });
        }
        toast.info("Modo de edición activado. Los datos han sido cargados en el formulario.");
    };

    // --- ¡NUEVA FUNCIÓN DE VALIDACIÓN! ---
    const validateForm = () => {
        const errors = {};
        if (!cupo.trim()) errors.cupo = "El Cupo es requerido.";
        if (!plazo.trim()) errors.plazo = "El Plazo es requerido.";
        if (!rut) errors.rut = "El RUT es requerido.";
        if (!camaraComercio) errors.camaraComercio = "La Cámara de Comercio es requerida.";
        if (!formatoSangrilaft) errors.formatoSangrilaft = "El Formato Sangrilaft es requerido."; // Renombrado
        if (!cedulaFile) errors.cedulaFile = "La Cédula es requerida.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // --- ¡LÓGICA DE SUBIDA ACTUALIZADA! ---
    const handleApiSubmit = async (payload, confirmationDetails, successMessage) => {
        if (isSubmitting || loading) {
            toast.warning("Ya se está procesando una solicitud. Por favor, espere.");
            return;
        }
    
        const confirmResult = await Swal.fire({
            ...confirmationDetails,
            customClass: SWAL_CUSTOM_CLASSES,
            showCancelButton: true,
            confirmButtonText: `✅ Sí, ${enModoEdicion ? "actualizar" : "crear"}`,
            cancelButtonText: "❌ Cancelar",
        });
    
        if (!confirmResult.isConfirmed) return;
    
        setIsSubmitting(true);
        setLoading(true);
        const savingToast = toast.loading(`${enModoEdicion ? "Actualizando" : "Subiendo"} archivos y guardando datos...`);

        const folderPath = `${FOLDER_BASE}/transaccion_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        try {
            const uploadFileOrKeepUrl = (file, fileName) => {
                if (file instanceof File) {
                    return uploadFileToBucket({ bucket: BUCKET_NAME, path: `${folderPath}/${fileName}.${file.name.split('.').pop()}`, file });
                }
                return Promise.resolve(file); 
            };

            // 1. Subir/Procesar TODOS los archivos
            const [
                url_rut,
                url_camara_comercio,
                url_formato_sangrilaft, // Renombrado
                url_cedula
            ] = await Promise.all([
                uploadFileOrKeepUrl(rut, "rut"),
                uploadFileOrKeepUrl(camaraComercio, "camara_comercio"),
                uploadFileOrKeepUrl(formatoSangrilaft, "formato_sangrilaft"), // Renombrado
                uploadFileOrKeepUrl(cedulaFile, "cedula")
            ]);

            // 2. Crear el payload FINAL (con URLs y datos de texto)
            const finalPayload = {
                ...payload, // cupo y plazo
                url_rut,
                url_camara_comercio,
                url_formato_sangrilaft, // Renombrado
                url_cedula
            };

            // 3. Enviar JSON al Backend (POST o PATCH)
            // Modo público: enviar a registro-publico
            if (modoPublico) {
                await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/trazabilidad/registro-publico/cliente/${tokenPublico}`,
                    finalPayload,
                    { headers: { "Content-Type": "application/json" } }
                );
            } 
            // Modo normal: enviar directo a clientes
            else {
                if (enModoEdicion) {
                    await apiTrazabilidad.patch(`/trazabilidad/clientes/${idParaEditar}`, finalPayload, {
                        headers: { "Content-Type": "application/json" },
                    });
                } else {
                    await apiTrazabilidad.post("/trazabilidad/clientes", finalPayload, {
                        headers: { "Content-Type": "application/json" },
                    });
                }
            }
    
            // --- ¡ALERTA DE ÉXITO ACTUALIZADA! ---
            toast.dismiss(savingToast);
            
            if (modoPublico) {
                Swal.fire({
                    title: "¡Registro Enviado!",
                    text: "Tu registro ha sido enviado y está pendiente de aprobación. Serás notificado una vez sea revisado.", 
                    icon: "success",
                    customClass: SWAL_CUSTOM_CLASSES,
                    confirmButtonText: "✅ Entendido"
                });
            } else {
                Swal.fire({
                    title: enModoEdicion ? "¡Actualizado!" : "¡Creado!",
                    text: successMessage, 
                    icon: "success",
                    customClass: SWAL_CUSTOM_CLASSES,
                    confirmButtonText: "✅ Entendido"
                });
            }
            // ------------------------------------

            resetForm();
            if (!modoPublico) {
                fetchHistorial();
            }
        } catch (error) {
            console.error(`Error al ${enModoEdicion ? "actualizar" : "crear"} cliente:`, error);
            const errorMsg = parseApiError(error);
            toast.update(savingToast, { render: errorMsg, type: "error", isLoading: false, autoClose: 6000 });
            Swal.fire({
                icon: "error",
                title: `Error de ${enModoEdicion ? "Actualización" : "Creación"}`,
                text: errorMsg,
                customClass: SWAL_CUSTOM_CLASSES,
            });
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };
    
    // --- ¡MANEJADOR DE ENVÍO ACTUALIZADO! ---
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            Swal.fire({
                title: "Campos Incompletos", 
                text: "Por favor, revise todos los campos de texto y documentos requeridos.", 
                icon: "warning",
                customClass: SWAL_CUSTOM_CLASSES
            });
            return;
        }
        
        const payload = { cupo, plazo };
        
        const confirmationDetails = {
            title: `¿Confirmar ${enModoEdicion ? "actualización" : "creación"} del cliente?`,
            html: ` 
                <div style="text-align: left; margin-top: 1rem;">
                    <p><strong>Cupo:</strong> ${cupo}</p>
                    <p><strong>Plazo:</strong> ${plazo}</p>
                </div>`,
            icon: "question"
        };
    
        const successMessage = enModoEdicion
            ? "Cliente actualizado correctamente."
            : "Cliente creado correctamente.";

        await handleApiSubmit(payload, confirmationDetails, successMessage);
    };
    
    // --- ¡COLUMNAS DE TABLA ACTUALIZADAS! ---
    const columns = [
        { 
            header: "Creado por", 
            key: "profiles", 
            sortable: true, 
            centered: true,
            className: "tc-centered-cell", 
            cell: (item) => (<div className="tc-user-cell"><FaUser />{item.profiles?.nombre || "Usuario desconocido"}</div>), 
        },
        { 
            header: "Fecha Creación", 
            key: "created_at", 
            sortable: true, 
            centered: true,
            className: "tc-centered-cell", 
            cell: (item) => format(parseISO(item.created_at), "dd/MM/yyyy hh:mm a"), 
        },
        { 
            header: "Cupo", 
            key: "cupo", 
            sortable: true,
            centered: true,
            className: "tc-centered-cell",
            cell: (item) => item.cupo || "N/A"
        },
        { 
            header: "Plazo", 
            key: "plazo", 
            sortable: true,
            centered: true,
            className: "tc-centered-cell",
            cell: (item) => item.plazo || "N/A"
        },
        {
            header: "Documentos (Ver)",
            key: "documentos",
            className: "tc-doc-links-cell tc-centered-cell",
            cell: (item) => (
                <div className="tc-doc-list">
                    <DocLink url={item.url_rut} label="RUT" onPreview={openPreview} />
                    <DocLink url={item.url_camara_comercio} label="C. Comercio" onPreview={openPreview} />
                    <DocLink url={item.url_formato_sangrilaft} label="F. Sangrilaft" onPreview={openPreview} /> 
                    <DocLink url={item.url_cedula} label="Cédula" onPreview={openPreview} />
                </div>
            ),
        },
        // --- ¡NUEVA COLUMNA DE ACCIONES! ---
        {
            header: "Acciones",
            key: "acciones",
            centered: true,
            className: "tc-centered-cell",
            cell: (item) => (
                <button 
                    className="tc-action-btn-edit" 
                    title="Editar este registro"
                    onClick={() => handleCargarParaEditar(item)}
                >
                    <FaEdit />
                </button>
            ),
        },
    ];
    
    // --- ¡CONTENIDO DEL FORMULARIO ACTUALIZADO! ---
    const formContent = (
        <form onSubmit={handleFormSubmit} className="tc-form">
            <div className="tc-form-separator">
                <span>Datos del Cliente</span>
            </div>
            
            <div className="tc-form-grid">
                <div className="tc-form-group">
                    <label htmlFor="cupo">Cupo <span className="required">*</span></label>
                    <input 
                        type="text" 
                        id="cupo" 
                        value={cupo} 
                        onChange={(e) => setCupo(e.target.value)} 
                        placeholder="Ej: 1000000" 
                        required 
                        className={`tc-form-input ${formErrors.cupo ? 'is-invalid' : ''}`} 
                    />
                    {formErrors.cupo && <span className="tc-validation-error">{formErrors.cupo}</span>}
                </div>
                <div className="tc-form-group">
                    <label htmlFor="plazo">Plazo <span className="required">*</span></label>
                    <input 
                        type="text" 
                        id="plazo" 
                        value={plazo} 
                        onChange={(e) => setPlazo(e.target.value)} 
                        placeholder="Ej: 30 días" 
                        required 
                        className={`tc-form-input ${formErrors.plazo ? 'is-invalid' : ''}`} 
                    />
                    {formErrors.plazo && <span className="tc-validation-error">{formErrors.plazo}</span>}
                </div>
            </div>

            <div className="tc-form-separator">
                <span>Documentos Requeridos</span>
            </div>

            <div className="tc-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}> 
                <FileInput
                    label="RUT del Cliente"
                    name="rut_cliente"
                    file={rut}
                    setFile={setRut}
                    isRequired={true}
                />
                <FileInput
                    label="Cámara de Comercio"
                    name="camara_comercio"
                    file={camaraComercio}
                    setFile={setCamaraComercio}
                    isRequired={true}
                />
                <FileInput
                    label="Formato Sangrilaft"
                    name="formato_sangrilaft"
                    file={formatoSangrilaft}
                    setFile={setFormatoSangrilaft}
                    isRequired={true}
                />
                <FileInput
                    label="Cédula"
                    name="cedula_cliente"
                    file={cedulaFile}
                    setFile={setCedulaFile}
                    isRequired={true}
                />
            </div>
            
            {/* Resumen de errores de archivos */}
            { (formErrors.rut || formErrors.camaraComercio || formErrors.formatoSangrilaft || formErrors.cedulaFile) &&
                <div className="tc-error-summary">
                    {formErrors.rut && <span className="tc-validation-error">⚠️ {formErrors.rut}</span>}
                    {formErrors.camaraComercio && <span className="tc-validation-error">⚠️ {formErrors.camaraComercio}</span>}
                    {formErrors.formatoSangrilaft && <span className="tc-validation-error">⚠️ {formErrors.formatoSangrilaft}</span>}
                    {formErrors.cedulaFile && <span className="tc-validation-error">⚠️ {formErrors.cedulaFile}</span>}
                </div>
            }

            <div className="tc-form-actions">
                {enModoEdicion && (
                    <button
                        type="button"
                        className="tc-cancel-btn"
                        onClick={resetForm}
                    >
                        Cancelar Edición
                    </button>
                )}
                <button
                    type="submit"
                    className={`tc-submit-btn ${isSubmitting ? "submitting" : ""}`}
                    disabled={loading || isSubmitting || !rut || !cupo || !plazo || !camaraComercio || !formatoSangrilaft || !cedulaFile}
                >
                    {loading || isSubmitting ? <FaSpinner className="tc-spinner" /> : (enModoEdicion ? <FaEdit /> : <FaUserPlus />)}
                    {loading || isSubmitting ? (enModoEdicion ? "Actualizando..." : "Guardando...") : (enModoEdicion ? "Actualizar Cliente" : "Guardar Cliente")}
                </button>
            </div>
        </form>
    );
    
    // --- (Renderizado final no cambia) ---
    return (
        <>
            <FilePreviewModal
                isOpen={modalOpen}
                onClose={closePreview}
                fileUrl={previewUrl}
            />
            <TrazabilidadPageLayout
                title={enModoEdicion ? "Editar Cliente (Contabilidad)" : "Crear Nuevo Cliente (Contabilidad)"}
                icon={enModoEdicion ? <FaEdit style={{fontSize: '1.25em'}} /> : <FaUserTie style={{fontSize: '1.25em'}} />}
                subtitle={enModoEdicion ? `Editando cliente (Cupo: ${cupo}, Plazo: ${plazo})` : "Adjunta los datos y documentos para registrar un nuevo cliente."}
                formContent={formContent}
                historialTitle="Historial de Clientes Creados"
                historialContent={
                    <HistorialTable
                        isLoading={loadingHistorial}
                        data={historial}
                        columns={columns}
                        emptyMessage="No has creado ningún cliente todavía."
                    />
                }
                formCardRef={formCardRef} 
            />
        </>
    );
};
    
export default CreacionCliente;