// src/pages/trazabilidad_contabilidad/components/StatCard.jsx
import React from 'react';

const StatCard = ({ icon, label, value }) => (
    <div className="admin-cont-stat-card">
        <div className="stat-card-icon">{icon}</div>
        <div className="stat-card-info">
            <span className="stat-card-value">{value}</span>
            <span className="stat-card-label">{label}</span>
        </div>
    </div>
);

export default StatCard;