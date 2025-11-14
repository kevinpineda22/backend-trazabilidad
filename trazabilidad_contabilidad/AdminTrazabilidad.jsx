// src/pages/trazabilidad_contabilidad/AdminTrazabilidad.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaKey, FaCheckCircle, FaChartBar } from "react-icons/fa";
import { Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Estilos
import "./AdminTrazabilidad.css";

// Componentes
import PanelAprobaciones from "./PanelAprobaciones";
import GestionTokens from "./GestionTokens";

const VISTAS = {
    DASHBOARD: "dashboard",
    TOKENS: "tokens",
    APROBACIONES: "aprobaciones",
};

const TITULOS_VISTA = {
    [VISTAS.DASHBOARD]: "Panel de Administración - Trazabilidad",
    [VISTAS.TOKENS]: "Gestión de Tokens",
    [VISTAS.APROBACIONES]: "Panel de Aprobaciones",
};

const AdminTrazabilidad = () => {
    const [vista, setVista] = useState(VISTAS.DASHBOARD);

    // Función para renderizar la vista según la selección
    const renderVista = () => {
        switch (vista) {
            case VISTAS.DASHBOARD:
                return <DashboardView onNavigate={setVista} />;
            case VISTAS.TOKENS:
                return <GestionTokens />;
            case VISTAS.APROBACIONES:
                return <PanelAprobaciones />;
            default:
                return <DashboardView onNavigate={setVista} />;
        }
    };

    return (
        <div className="admin-traz-main-container">
            <ToastContainer 
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            
            {/* Sidebar */}
            <aside className="admin-traz-sidebar">
                <div className="admin-traz-sidebar-header">
                    <Link to="/acceso" className="admin-traz-back-button">
                        <FaArrowLeft size={18} />
                    </Link>
                    <img 
                        src="/logo.webp" 
                        alt="Logo Merkahorro" 
                        className="admin-traz-logo"
                    />
                    <h2 className="admin-traz-sidebar-title">Trazabilidad</h2>
                </div>

                <nav className="admin-traz-sidebar-nav">
                    <BotonSidebar
                        icono={FaChartBar}
                        texto="Dashboard"
                        activo={vista === VISTAS.DASHBOARD}
                        onClick={() => setVista(VISTAS.DASHBOARD)}
                    />
                    <BotonSidebar
                        icono={FaKey}
                        texto="Gestión de Tokens"
                        activo={vista === VISTAS.TOKENS}
                        onClick={() => setVista(VISTAS.TOKENS)}
                    />
                    <BotonSidebar
                        icono={FaCheckCircle}
                        texto="Aprobaciones"
                        activo={vista === VISTAS.APROBACIONES}
                        onClick={() => setVista(VISTAS.APROBACIONES)}
                    />
                </nav>

                <div className="admin-traz-sidebar-footer">
                    <p>Sistema de Trazabilidad</p>
                    <p>Merkahorro © 2025</p>
                </div>
            </aside>

            {/* Área de Contenido Principal */}
            <main className="admin-traz-content">
                <header className="admin-traz-header">
                    <h1 className="admin-traz-title">{TITULOS_VISTA[vista]}</h1>
                </header>

                <div className="admin-traz-body">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={vista}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="admin-traz-view-container"
                        >
                            {renderVista()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

// Componente Botón Sidebar
const BotonSidebar = ({ icono: Icono, texto, activo, onClick }) => (
    <button
        className={`admin-traz-sidebar-button ${activo ? "activo" : ""}`}
        onClick={onClick}
    >
        <Icono size={20} className="admin-traz-sidebar-icon" />
        <span className="admin-traz-sidebar-text">{texto}</span>
    </button>
);

// Vista del Dashboard
const DashboardView = ({ onNavigate }) => {
    return (
        <div className="admin-traz-dashboard">
            <div className="admin-traz-welcome">
                <h2>Bienvenido al Panel de Administración</h2>
                <p>Gestiona tokens y aprobaciones del sistema de trazabilidad</p>
            </div>

            <div className="admin-traz-cards-grid">
                <DashboardCard
                    icono={FaKey}
                    titulo="Gestión de Tokens"
                    descripcion="Genera y administra tokens de acceso para empleados, clientes y proveedores"
                    onClick={() => onNavigate(VISTAS.TOKENS)}
                    color="blue"
                />
                <DashboardCard
                    icono={FaCheckCircle}
                    titulo="Panel de Aprobaciones"
                    descripcion="Revisa y aprueba o rechaza los registros pendientes de validación"
                    onClick={() => onNavigate(VISTAS.APROBACIONES)}
                    color="green"
                />
            </div>

            <div className="admin-traz-info-section">
                <div className="admin-traz-info-card">
                    <h3>Sistema de Trazabilidad</h3>
                    <p>
                        Este panel te permite gestionar de forma centralizada todos los aspectos
                        relacionados con la trazabilidad de empleados, clientes y proveedores.
                    </p>
                    <ul>
                        <li>✓ Generación de tokens únicos por tipo de registro</li>
                        <li>✓ Validación y aprobación de documentos</li>
                        <li>✓ Historial completo de aprobaciones y rechazos</li>
                        <li>✓ Gestión de accesos públicos controlados</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

// Componente Card del Dashboard
const DashboardCard = ({ icono: Icono, titulo, descripcion, onClick, color }) => (
    <motion.div
        className={`admin-traz-dashboard-card ${color}`}
        onClick={onClick}
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
    >
        <div className="admin-traz-card-icon">
            <Icono size={32} />
        </div>
        <h3 className="admin-traz-card-title">{titulo}</h3>
        <p className="admin-traz-card-description">{descripcion}</p>
        <div className="admin-traz-card-arrow">→</div>
    </motion.div>
);

export default AdminTrazabilidad;
