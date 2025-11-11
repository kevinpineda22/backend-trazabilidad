// src/pages/trazabilidad_contabilidad/components/MensajeVacio.jsx
import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const MensajeVacio = ({ mensaje }) => (
    <div className="admin-cont-empty-message">
        <FaInfoCircle />
        <span>{mensaje}</span>
    </div>
);

export default MensajeVacio;