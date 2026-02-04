// src/pages/trazabilidad_contabilidad/SuperAdminContabilidad.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaUsers, FaHardHat, FaUserTie } from "react-icons/fa";
import { Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { getAssetUrl } from "../../config/storage";

// Estilos
import "./SuperAdminContabilidad.css";

// Componentes compartidos
import FilePreviewModal from "./FilePreviewModal";
import BotonSidebar from "./components/BotonSidebar";

// Vistas (ahora importadas)
import HistorialEmpleadosAdminView from "./views/HistorialEmpleadosAdminView";
import HistorialProveedoresAdminView from "./views/HistorialProveedoresAdminView";
import HistorialClientesAdminView from "./views/HistorialClientesAdminView";
// Vistas de expedientes
import ExpedienteEmpleadoView from "./views/ExpedienteEmpleadoView.jsx";
import ExpedienteProveedorView from "./views/ExpedienteProveedorView.jsx";
import ExpedienteClienteView from "./views/ExpedienteClienteView.jsx";

const VISTAS = {
  EMPLEADOS: "empleados",
  PROVEEDORES: "proveedores",
  CLIENTES: "clientes",
  EXPEDIENTE_EMPLEADO: "expediente_empleado",
  EXPEDIENTE_PROVEEDOR: "expediente_proveedor",
  EXPEDIENTE_CLIENTE: "expediente_cliente",
};

const TITULOS_VISTA = {
  [VISTAS.EMPLEADOS]: "Archivador General de Empleados",
  [VISTAS.PROVEEDORES]: "Archivador General de Proveedores",
  [VISTAS.CLIENTES]: "Archivador General de Clientes",
  [VISTAS.EXPEDIENTE_EMPLEADO]: "Expediente Digital del Empleado",
  [VISTAS.EXPEDIENTE_PROVEEDOR]: "Expediente Digital del Proveedor",
  [VISTAS.EXPEDIENTE_CLIENTE]: "Expediente Digital del Cliente",
};

const SuperAdminContabilidad = () => {
  const [userRole] = useState(() => {
    try {
      const info = localStorage.getItem("empleado_info");
      return info ? JSON.parse(info).role : null;
    } catch (e) {
      return null;
    }
  });

  // ✅ Obtener permisos de ruta
  const [routePermission] = useState(() => {
    try {
      const info = localStorage.getItem("empleado_info");
      if (!info) return null;
      const parsed = JSON.parse(info);
      const routes = parsed.personal_routes || [];
      // Buscar permiso para esta ruta específica
      const currentRoute = routes.find((r) => r.path === "/trazabilidad/admin");
      return currentRoute ? currentRoute.permission : null;
    } catch (e) {
      return null;
    }
  });

  const getAllowedViews = (role) => {
    // Admin Tesorería: Solo Empleados y Proveedores (clientes oculto)
    if (role === "admin_tesoreria") {
      return [VISTAS.EMPLEADOS, VISTAS.PROVEEDORES];
    }
    // En este módulo (Gestión Documental / Archivadores), se deben mostrar todas las carpetas
    // independientemente del rol del usuario (admin_proveedor, admin_cliente, etc.)
    return [VISTAS.EMPLEADOS, VISTAS.PROVEEDORES, VISTAS.CLIENTES];
  };

  const allowedViews = getAllowedViews(userRole);

  const [vista, setVista] = useState(() => {
    if (allowedViews.length > 0) return allowedViews[0];
    return VISTAS.EMPLEADOS;
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState(null);
  const [selectedProveedorId, setSelectedProveedorId] = useState(null);
  const [selectedClienteId, setSelectedClienteId] = useState(null);

  const openPreview = (url) => {
    setPreviewUrl(url);
    setModalOpen(true);
  };
  const closePreview = () => {
    setModalOpen(false);
    setPreviewUrl("");
  };

  // Funciones de navegación para empleados
  const openExpedienteEmpleado = (empleadoId) => {
    setSelectedEmpleadoId(empleadoId);
    setVista(VISTAS.EXPEDIENTE_EMPLEADO);
  };

  const showEmpleadosList = () => {
    setSelectedEmpleadoId(null);
    setVista(VISTAS.EMPLEADOS);
  };

  // Funciones de navegación para proveedores
  const openExpedienteProveedor = (proveedorId) => {
    setSelectedProveedorId(proveedorId);
    setVista(VISTAS.EXPEDIENTE_PROVEEDOR);
  };

  const showProveedoresList = () => {
    setSelectedProveedorId(null);
    setVista(VISTAS.PROVEEDORES);
  };

  // Funciones de navegación para clientes
  const openExpedienteCliente = (clienteId) => {
    setSelectedClienteId(clienteId);
    setVista(VISTAS.EXPEDIENTE_CLIENTE);
  };

  const showClientesList = () => {
    setSelectedClienteId(null);
    setVista(VISTAS.CLIENTES);
  };

  // Este render es mucho más limpio
  const renderVista = () => {
    switch (vista) {
      case VISTAS.EMPLEADOS:
        return (
          <HistorialEmpleadosAdminView
            onPreview={openPreview}
            onOpenExpediente={openExpedienteEmpleado}
            userRole={userRole}
            routePermission={routePermission}
          />
        );
      case VISTAS.PROVEEDORES:
        return (
          <HistorialProveedoresAdminView
            onOpenExpediente={openExpedienteProveedor}
            userRole={userRole}
            routePermission={routePermission}
          />
        );
      case VISTAS.CLIENTES:
        return (
          <HistorialClientesAdminView
            onPreview={openPreview}
            onOpenExpediente={openExpedienteCliente}
            userRole={userRole}
            routePermission={routePermission}
          />
        );
      case VISTAS.EXPEDIENTE_EMPLEADO:
        return (
          <ExpedienteEmpleadoView
            empleadoId={selectedEmpleadoId}
            onBack={showEmpleadosList}
            onPreview={openPreview}
            userRole={userRole}
          />
        );
      case VISTAS.EXPEDIENTE_PROVEEDOR:
        return (
          <ExpedienteProveedorView
            proveedorId={selectedProveedorId}
            onBack={showProveedoresList}
            onPreview={openPreview}
            userRole={userRole}
          />
        );
      case VISTAS.EXPEDIENTE_CLIENTE:
        return (
          <ExpedienteClienteView
            clienteId={selectedClienteId}
            onBack={showClientesList}
            onPreview={openPreview}
          />
        );
      default:
        return (
          <HistorialEmpleadosAdminView
            onPreview={openPreview}
            onOpenExpediente={openExpedienteEmpleado}
            userRole={userRole}
            routePermission={routePermission}
          />
        );
    }
  };

  return (
    <div className="admin-cont-main-container">
      <ToastContainer position="top-center" autoClose={4000} />
      <FilePreviewModal
        isOpen={modalOpen}
        onClose={closePreview}
        fileUrl={previewUrl}
      />

      <motion.div
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{
          duration: 0.5,
          type: "spring",
          stiffness: 100,
          damping: 20,
        }}
        className="admin-cont-sidebar"
      >
        <div className="admin-cont-sidebar-header">
          <Link
            to="/acceso"
            className="admin-cont-back-button"
            title="Volver al acceso"
          >
            <FaArrowLeft />
          </Link>
          <img
            src={getAssetUrl("logoMK.webp")}
            alt="Logo"
            className="admin-cont-logo"
          />
          <h2 className="admin-cont-sidebar-title">Gestión Documental</h2>
        </div>

        <nav className="admin-cont-sidebar-nav">
          {allowedViews.includes(VISTAS.EMPLEADOS) && (
            <BotonSidebar
              vista={VISTAS.EMPLEADOS}
              vistaActual={vista}
              setVista={setVista}
              icono={<FaUsers />}
              label="Archivador Empleados"
            />
          )}
          {allowedViews.includes(VISTAS.PROVEEDORES) && (
            <BotonSidebar
              vista={VISTAS.PROVEEDORES}
              vistaActual={vista}
              setVista={setVista}
              icono={<FaHardHat />}
              label="Archivador Proveedores"
            />
          )}
          {allowedViews.includes(VISTAS.CLIENTES) && (
            <BotonSidebar
              vista={VISTAS.CLIENTES}
              vistaActual={vista}
              setVista={setVista}
              icono={<FaUserTie />}
              label="Archivador Clientes"
            />
          )}
        </nav>
      </motion.div>

      <div className="admin-cont-content">
        <motion.h1
          key={TITULOS_VISTA[vista]} // La key se asegura que el título se re-anime
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

export default SuperAdminContabilidad;
