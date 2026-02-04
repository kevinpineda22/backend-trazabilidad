// src/pages/trazabilidad_contabilidad/components/HistorialTabla.jsx
import React from 'react';

const HistorialTabla = ({ children }) => (
    <div className="admin-cont-table-wrapper">
        <table>{children}</table>
    </div>
);

export default HistorialTabla;