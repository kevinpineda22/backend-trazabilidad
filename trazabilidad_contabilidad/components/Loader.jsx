// src/pages/trazabilidad_contabilidad/components/Loader.jsx
import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const Loader = () => (
    <div className="admin-cont-loader">
        <FaSpinner className="spinner" />
        <span>Cargando...</span>
    </div>
);

export default Loader;