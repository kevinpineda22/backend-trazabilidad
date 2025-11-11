import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaHardHat, FaUserPlus, FaUser, FaUpload, FaFileAlt, FaTimesCircle, FaFilePdf, FaFileImage, FaHistory, FaSpinner, FaInfoCircle, FaSort, FaSortUp, FaSortDown,
    FaEdit, 
} from "react-icons/fa";
import { format, parseISO } from "date-fns";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

// Importaciones locales
import { apiTrazabilidad } from "../../services/apiTrazabilidad";
import { uploadFileToBucket } from "../../supabaseClient"; 
import FilePreviewModal from "./FilePreviewModal";
import "./CreacionSubirEmpleado.css"; 

// CONFIGURACIÓN CENTRALIZADA
const BUCKET_NAME = 'documentos_contabilidad'; 
const FOLDER_BASE = 'proveedores';
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
const CreacionProveedor = () => {
    // Detectar si hay token en la URL (modo público)
    const [searchParams] = useSearchParams();
    const tokenPublico = searchParams.get('token');
    const modoPublico = !!tokenPublico;

    // --- (Estados actualizados) ---
    const [idParaEditar, setIdParaEditar] = useState(null);
    const enModoEdicion = idParaEditar !== null;
    const formCardRef = useRef(null); 
    const [rut, setRut] = useState(null);
    const [camaraComercio, setCamaraComercio] = useState(null);
    const [formatoVinculacion, setFormatoVinculacion] = useState(null);
    const [composicionAccionaria, setComposicionAccionaria] = useState(null);
    const [certificacionBancaria, setCertificacionBancaria] = useState(null);
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
            const { data } = await apiTrazabilidad.get("/trazabilidad/proveedores/historial");
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

    // --- (resetForm no cambia) ---
    const resetForm = () => {
        setIdParaEditar(null); 
        setRut(null);
        setCamaraComercio(null);
        setFormatoVinculacion(null);
        setComposicionAccionaria(null);
        setCertificacionBancaria(null);
        setFormErrors({});
        
        const inputs = ["rut", "camara_comercio", "formato_vinculacion", "composicion_accionaria", "certificacion_bancaria"];
        inputs.forEach((id) => {
            const input = document.getElementById(id);
            if (input) input.value = null;
        });
    };

    // --- (handleCargarParaEditar no cambia) ---
    const handleCargarParaEditar = (item) => {
        setIdParaEditar(item.id);
        setRut(item.url_rut || null);
        setCamaraComercio(item.url_camara_comercio || null); 
        setCertificacionBancaria(item.url_certificacion_bancaria || null);
        setFormatoVinculacion(item.url_formato_vinculacion || null);
        setComposicionAccionaria(item.url_composicion_accionaria || null);
        setFormErrors({});
        if (formCardRef.current) {
            formCardRef.current.scrollIntoView({ behavior: "smooth" });
        }
        toast.info("Modo de edición activado. Los datos han sido cargados en el formulario.");
    };

    // --- ¡handleApiSubmit ACTUALIZADO! ---
    const handleApiSubmit = async (confirmationDetails, successMessage) => {
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
            
            const [
                url_rut,
                url_certificacion_bancaria,
                url_formato_vinculacion,
                url_composicion_accionaria,
                url_camara_comercio, 
            ] = await Promise.all([
                // Obligatorios
                uploadFileOrKeepUrl(rut, "rut"),
                uploadFileOrKeepUrl(certificacionBancaria, "certificacion_bancaria"),
                uploadFileOrKeepUrl(formatoVinculacion, "formato_vinculacion"),
                uploadFileOrKeepUrl(composicionAccionaria, "composicion_accionaria"),
                // Opcional
                uploadFileOrKeepUrl(camaraComercio, "camara_comercio"),
            ]);

            const finalPayload = {
                url_rut,
                url_camara_comercio, 
                url_certificacion_bancaria,
                url_formato_vinculacion,
                url_composicion_accionaria,
            };

            // Modo público: enviar a registro-publico
            if (modoPublico) {
                await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/trazabilidad/registro-publico/proveedor/${tokenPublico}`,
                    finalPayload,
                    { headers: { "Content-Type": "application/json" } }
                );
            } 
            // Modo normal: enviar directo a proveedores
            else {
                if (enModoEdicion) {
                    await apiTrazabilidad.patch(`/trazabilidad/proveedores/${idParaEditar}`, finalPayload, {
                        headers: { "Content-Type": "application/json" },
                    });
                } else {
                    await apiTrazabilidad.post("/trazabilidad/proveedores", finalPayload, {
                        headers: { "Content-Type": "application/json" },
                    });
                }
            }

            // --- ¡AQUÍ ESTÁ EL CAMBIO! ---
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
            // -----------------------------

            resetForm();
            if (!modoPublico) {
                fetchHistorial();
            } 
        } catch (error) {
            console.error(`Error al ${enModoEdicion ? "actualizar" : "crear"} proveedor:`, error);
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

    // --- (validateForm no cambia) ---
    const validateForm = () => {
        const errors = {};
        
        if (!rut) errors.rut = "RUT es requerido.";
        if (!certificacionBancaria) errors.certificacionBancaria = "Certificación Bancaria es requerida.";
        if (!formatoVinculacion) errors.formatoVinculacion = "Formato Vinculación es requerido.";
        if (!composicionAccionaria) errors.composicionAccionaria = "Composición Accionaria es requerida.";

        const validErrors = Object.fromEntries(Object.entries(errors).filter(([_, v]) => v));
        setFormErrors(validErrors);
        return Object.keys(validErrors).length === 0;
    };

    // --- ¡handleFormSubmit ACTUALIZADO! ---
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            Swal.fire({
                title: "Documentos Incompletos", 
                text: "RUT, Certificación Bancaria, Formato Vinculación y Composición Accionaria son obligatorios.", 
                icon: "warning",
                customClass: SWAL_CUSTOM_CLASSES
            });
            return;
        }
        
        const confirmationDetails = {
            title: `¿Confirmar ${enModoEdicion ? "actualización" : "creación"} del proveedor?`,
            // --- ¡CORRECCIÓN! 'htmlContent' se cambió a 'html' ---
            html: `
                <div style="text-align: left; margin-top: 1rem;">
                    <p>Se ${enModoEdicion ? "actualizarán" : "adjuntarán"} 4 documentos obligatorios y 1 opcional.</p>
                </div>
            `,
            icon: "question"
        };

        // --- ¡AQUÍ ESTÁ EL CAMBIO! ---
        const successMessage = enModoEdicion
            ? "Proveedor actualizado correctamente."
            : "Proveedor creado correctamente.";

        await handleApiSubmit(confirmationDetails, successMessage);
        // -----------------------------
    };

    // --- (columns no cambia) ---
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
            header: "Documentos Adjuntos (Ver)", 
            key: "documentos",
            className: "tc-doc-links-cell tc-centered-cell",
            cell: (item) => (
                <div className="tc-doc-list">
                    <DocLink url={item.url_rut} label="RUT" onPreview={openPreview} />
                    <DocLink url={item.url_camara_comercio} label="Cámara de Comercio" onPreview={openPreview} />
                    <DocLink url={item.url_certificacion_bancaria} label="Certificación Bancaria" onPreview={openPreview} />
                    <DocLink url={item.url_formato_vinculacion} label="Formato Vinculación" onPreview={openPreview} />
                    <DocLink url={item.url_composicion_accionaria} label="Composición Accionaria" onPreview={openPreview} />
                </div>
            ),
        },
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

    // --- (formContent no cambia) ---
    const formContent = (
        <form onSubmit={handleFormSubmit} className="tc-form">
            <div className="tc-form-separator">
                <span>Documentos Requeridos y Opcionales</span>
            </div>
            
            <div className="tc-form-grid">
                <FileInput label="RUT" name="rut" file={rut} setFile={setRut} isRequired={true} />
                <FileInput label="Certificación Bancaria" name="certificacion_bancaria" file={certificacionBancaria} setFile={setCertificacionBancaria} isRequired={true} />
                <FileInput label="Formato Vinculación" name="formato_vinculacion" file={formatoVinculacion} setFile={setFormatoVinculacion} isRequired={true} />
                <FileInput label="Composición Accionaria" name="composicion_accionaria" file={composicionAccionaria} setFile={setComposicionAccionaria} isRequired={true} />
                <FileInput label="Cámara de Comercio (Opcional)" name="camara_comercio" file={camaraComercio} setFile={setCamaraComercio} isRequired={false} />
            </div>

            { (formErrors.rut || formErrors.certificacionBancaria || formErrors.formatoVinculacion || formErrors.composicionAccionaria) &&
                <div className="tc-error-summary">
                    {formErrors.rut && <span className="tc-validation-error">⚠️ {formErrors.rut}</span>}
                    {formErrors.certificacionBancaria && <span className="tc-validation-error">⚠️ {formErrors.certificacionBancaria}</span>}
                    {formErrors.formatoVinculacion && <span className="tc-validation-error">⚠️ {formErrors.formatoVinculacion}</span>}
                    {formErrors.composicionAccionaria && <span className="tc-validation-error">⚠️ {formErrors.composicionAccionaria}</span>}
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
                    disabled={loading || isSubmitting || !rut || !certificacionBancaria || !formatoVinculacion || !composicionAccionaria}
                >
                    {loading || isSubmitting ? <FaSpinner className="tc-spinner" /> : (enModoEdicion ? <FaEdit /> : <FaUserPlus />)}
                    {loading || isSubmitting ? (enModoEdicion ? "Actualizando..." : "Guardando...") : (enModoEdicion ? "Actualizar Proveedor" : "Guardar Proveedor")}
                </button>
            </div>
        </form>
    );

    // --- (Renderizado final no cambia) ---
    return (
        <>
            <FilePreviewModal isOpen={modalOpen} onClose={closePreview} fileUrl={previewUrl} />
            <TrazabilidadPageLayout
                title={enModoEdicion ? "Editar Proveedor (Contabilidad)" : "Crear Nuevo Proveedor (Contabilidad)"}
                icon={enModoEdicion ? <FaEdit style={{fontSize: '1.25em'}} /> : <FaHardHat style={{fontSize: '1.25em'}} />}
                subtitle={enModoEdicion ? "Actualice los campos o documentos del proveedor." : "Adjunta todos los documentos requeridos para la creación y vinculación del proveedor."}
                formContent={formContent}
                historialTitle="Historial de Proveedores Creados"
                historialContent={
                    <HistorialTable
                        isLoading={loadingHistorial}
                        data={historial}
                        columns={columns}
                        emptyMessage="No has creado ningún proveedor todavía."
                    />
                }
                formCardRef={formCardRef} 
            />
        </>
    );
};

export default CreacionProveedor;