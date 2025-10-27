// src/pages/trazabilidad_contabilidad/SuperAdminContabilidad.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaArrowLeft, FaChartBar, FaUsers, FaHardHat,
    FaUserTie, FaHistory, FaSpinner, FaInfoCircle,
    FaFileAlt, FaDownload, FaUserShield, FaEye, FaFilePdf, FaFileImage // Iconos añadidos
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { toast, ToastContainer } from "react-toastify";
import { format, parseISO } from 'date-fns';
import "./SuperAdminContabilidad.css";
import FilePreviewModal from './FilePreviewModal'; // <-- Importar Modal

// Nombres de las vistas
const VISTAS = {
    DASHBOARD: 'dashboard',
    EMPLEADOS: 'empleados',
    PROVEEDORES: 'proveedores',
    CLIENTES: 'clientes',
};

const TITULOS_VISTA = {
    [VISTAS.DASHBOARD]: "Dashboard de Contabilidad",
    [VISTAS.EMPLEADOS]: "Archivador General de Empleados",
    [VISTAS.PROVEEDORES]: "Historial General de Proveedores",
    [VISTAS.CLIENTES]: "Historial General de Clientes",
};

// --- Componente Principal del Panel ---
const SuperAdminContabilidad = () => {
    const [vista, setVista] = useState(VISTAS.DASHBOARD);
    
    // --- NUEVO: Estado del Modal ---
    const [modalOpen, setModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const openPreview = (url) => { setPreviewUrl(url); setModalOpen(true); };
    const closePreview = () => { setModalOpen(false); setPreviewUrl(""); };
    // --- Fin nuevo estado ---

    const renderVista = () => {
        // Pasamos 'openPreview' a todos los componentes de historial
        switch (vista) {
            case VISTAS.DASHBOARD:
                return <DashboardView />;
            case VISTAS.EMPLEADOS:
                return <HistorialEmpleadosAdminView onPreview={openPreview} />;
            case VISTAS.PROVEEDORES:
                return <HistorialProveedoresAdminView onPreview={openPreview} />;
            case VISTAS.CLIENTES:
                return <HistorialClientesAdminView onPreview={openPreview} />;
            default:
                return <DashboardView />;
        }
    };

    return (
        <div className="admin-cont-main-container">
            <ToastContainer position="top-center" autoClose={4000} />
            {/* El modal vive aquí, en el nivel superior del panel */}
            <FilePreviewModal isOpen={modalOpen} onClose={closePreview} fileUrl={previewUrl} />

            {/* --- Sidebar (Menú Izquierdo) --- */}
            <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 20 }}
                className="admin-cont-sidebar"
            >
                <div className="admin-cont-sidebar-header">
                    <Link to="/acceso" className="admin-cont-back-button" title="Volver al acceso">
                        <FaArrowLeft />
                    </Link>
                    <img src="/logoMK.webp" alt="Logo" className="admin-cont-logo" />
                    <h2 className="admin-cont-sidebar-title">Admin Contabilidad</h2>
                </div>

                <nav className="admin-cont-sidebar-nav">
                    <BotonSidebar vista={VISTAS.DASHBOARD} vistaActual={vista} setVista={setVista} icono={<FaChartBar />} label="Dashboard" />
                    <BotonSidebar vista={VISTAS.EMPLEADOS} vistaActual={vista} setVista={setVista} icono={<FaUsers />} label="Archivador Empleados" />
                    <BotonSidebar vista={VISTAS.PROVEEDORES} vistaActual={vista} setVista={setVista} icono={<FaHardHat />} label="Historial Proveedores" />
                    <BotonSidebar vista={VISTAS.CLIENTES} vistaActual={vista} setVista={setVista} icono={<FaUserTie />} label="Historial Clientes" />
                </nav>
            </motion.div>

            {/* --- Área de Contenido Principal (Derecha) --- */}
            <div className="admin-cont-content">
                <motion.h1
                    key={TITULOS_VISTA[vista]}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="admin-cont-main-title"
                >
                    {TITULOS_VISTA[vista]}
                </motion.h1>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={vista}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderVista()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

// --- Componente Botón del Sidebar (Sin cambios) ---
const BotonSidebar = ({ vista, vistaActual, setVista, icono, label }) => (
    <button
        onClick={() => setVista(vista)}
        className={`admin-cont-sidebar-button ${
            vistaActual === vista ? "admin-cont-sidebar-button-active" : ""
        }`}
    >
        {icono}
        {label}
    </button>
);

// --- Componente Vista: Dashboard (Sin cambios) ---
const DashboardView = () => {
    // ... (Tu código de DashboardView va aquí, sin cambios) ...
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/trazabilidad/admin/dashboard-stats');
                setStats(data);
            } catch (error) {
                console.error("Error fetching stats:", error);
                toast.error("No se pudieron cargar las estadísticas.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <Loader />;

    return (
        <div className="admin-cont-dashboard-grid">
            <StatCard icon={<FaUsers />} label="Empleados Creados" value={stats?.totalEmpleados || 0} />
            <StatCard icon={<FaHardHat />} label="Proveedores Creados" value={stats?.totalProveedores || 0} />
            <StatCard icon={<FaUserTie />} label="Clientes Creados" value={stats?.totalClientes || 0} />
        </div>
    );
};

// --- Componente Tarjeta de Estadística (Sin cambios) ---
const StatCard = ({ icon, label, value }) => (
    <div className="admin-cont-stat-card">
        <div className="stat-card-icon">{icon}</div>
        <div className="stat-card-info">
            <span className="stat-card-value">{value}</span>
            <span className="stat-card-label">{label}</span>
        </div>
    </div>
);

// --- Componente Vista: Historial Empleados (ACTUALIZADO) ---
const HistorialEmpleadosAdminView = ({ onPreview }) => { // <-- Recibe onPreview
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/trazabilidad/admin/historial-empleados');
                setHistorial(data || []);
            } catch (error) {
                toast.error("Error al cargar el historial de empleados.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <Loader />;
    if (historial.length === 0) return <MensajeVacio mensaje="No se han creado empleados." />;

    return (
        <div className="admin-cont-historial-wrapper">
            <HistorialTabla>
                <thead>
                    <tr>
                        <th>Creado por</th>
                        <th>Nombre Empleado</th>
                        <th>Cédula</th>
                        <th>Fecha Creación</th>
                        <th>Contacto</th>
                        <th>Documentos</th>
                    </tr>
                </thead>
                <tbody>
                    {historial.map(emp => (
                        <tr key={emp.id}>
                            <td>
                                <div className="user-cell">
                                    <FaUserShield />
                                    {emp.profiles?.nombre || 'N/A'}
                                </div>
                            </td>
                            <td>{emp.nombre} {emp.apellidos}</td>
                            <td>{emp.cedula || 'N/A'}</td>
                            <td>{format(parseISO(emp.created_at), 'dd/MM/yy hh:mm a')}</td>
                            <td>{emp.contacto || 'N/A'}</td>
                            <td className="historial-docs">
                                {/* Usar DocLink y pasar onPreview */}
                                <DocLink url={emp.url_hoja_de_vida} title="Hoja de Vida" onPreview={onPreview} />
                                <DocLink url={emp.url_cedula} title="Cédula" onPreview={onPreview} />
                                <DocLink url={emp.url_certificado_bancario} title="Cert. Bancario" onPreview={onPreview} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </HistorialTabla>
        </div>
    );
};

// --- Componente Vista: Historial Proveedores (ACTUALIZADO) ---
const HistorialProveedoresAdminView = ({ onPreview }) => { // <-- Recibe onPreview
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/trazabilidad/admin/historial-proveedores');
                setHistorial(data || []);
            } catch (error) {
                toast.error("Error al cargar el historial de proveedores.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <Loader />;
    if (historial.length === 0) return <MensajeVacio mensaje="No se han creado proveedores." />;

    return (
        <div className="admin-cont-historial-wrapper">
            <HistorialTabla>
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
                                    <FaUserShield />
                                    {prov.profiles?.nombre || 'N/A'}
                                </div>
                            </td>
                            <td>{format(parseISO(prov.created_at), 'dd/MM/yy hh:mm a')}</td>
                            <td className="historial-docs"><DocLink url={prov.url_rut} title="RUT" onPreview={onPreview} /></td>
                            <td className="historial-docs"><DocLink url={prov.url_camara_comercio} title="C. Comercio" onPreview={onPreview} /></td>
                            <td className="historial-docs"><DocLink url={prov.url_certificacion_bancaria} title="Cert. Banc." onPreview={onPreview} /></td>
                            <td className="historial-docs"><DocLink url={prov.url_formato_vinculacion} title="Vinculación" onPreview={onPreview} /></td>
                            <td className="historial-docs"><DocLink url={prov.url_composicion_accionaria} title="Comp. Acc." onPreview={onPreview} /></td>
                        </tr>
                    ))}
                </tbody>
            </HistorialTabla>
        </div>
    );
};

// --- Componente Vista: Historial Clientes (ACTUALIZADO) ---
const HistorialClientesAdminView = ({ onPreview }) => { // <-- Recibe onPreview
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/trazabilidad/admin/historial-clientes');
                setHistorial(data || []);
            } catch (error) {
                toast.error("Error al cargar el historial de clientes.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <Loader />;
    if (historial.length === 0) return <MensajeVacio mensaje="No se han creado clientes." />;

    return (
        <div className="admin-cont-historial-wrapper">
            <HistorialTabla>
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
                                    <FaUserShield />
                                    {cli.profiles?.nombre || 'N/A'}
                                </div>
                            </td>
                            <td>{format(parseISO(cli.created_at), 'dd/MM/yy hh:mm a')}</td>
                            <td className="historial-docs"><DocLink url={cli.url_rut} title="RUT" onPreview={onPreview} /></td>
                        </tr>
                    ))}
                </tbody>
            </HistorialTabla>
        </div>
    );
};


// --- Componentes Auxiliares de UI (DocLink Actualizado) ---

const Loader = () => (
    <div className="admin-cont-loader">
        <FaSpinner className="spinner" />
        <span>Cargando...</span>
    </div>
);

const MensajeVacio = ({ mensaje }) => (
    <div className="admin-cont-empty-message">
        <FaInfoCircle />
        <span>{mensaje}</span>
    </div>
);

const HistorialTabla = ({ children }) => (
    <div className="admin-cont-table-wrapper">
        <table>{children}</table>
    </div>
);

// --- DocLink ACTUALIZADO ---
// Ahora es un botón que abre el modal e identifica el tipo de archivo
const DocLink = ({ url, title, onPreview }) => {
    if (!url) return <span className="doc-link-empty">N/A</span>;

    const isPdf = url.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const icon = isPdf ? <FaFilePdf /> : isImage ? <FaFileImage /> : <FaFileAlt />;

    return (
        <button type="button" className="doc-link-button" onClick={() => onPreview(url)} title={`Ver ${title}`}>
            {icon}
            {/* Opcional: mostrar el título si hay espacio */}
            {/* <span>{title}</span> */} 
        </button>
    );
};

export default SuperAdminContabilidad;