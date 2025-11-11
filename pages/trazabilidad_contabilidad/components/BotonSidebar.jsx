// src/pages/trazabilidad_contabilidad/components/BotonSidebar.jsx
import React from 'react';

const BotonSidebar = ({ vista, vistaActual, setVista, icono, label }) => (
    <button 
        onClick={() => setVista(vista)} 
        className={`admin-cont-sidebar-button ${vistaActual === vista ? "admin-cont-sidebar-button-active" : ""}`}
    >
        {icono}
        {label}
    </button>
);

export default BotonSidebar;