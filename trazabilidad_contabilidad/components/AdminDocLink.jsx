// src/pages/trazabilidad_contabilidad/components/AdminDocLink.jsx
import React from "react";
import { FaFilePdf, FaFileImage, FaFileAlt } from "react-icons/fa";

const AdminDocLink = ({ url, label, onPreview }) => {
    if (!url) return <span className="admin-cont-doc-empty">N/A</span>;

    const isPdf = url.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const icon = isPdf ? <FaFilePdf style={{ color: '#E53E3E' }} /> : isImage ? <FaFileImage style={{ color: '#38A169' }} /> : <FaFileAlt />;
    
    const fileNameMatch = url.match(/[^/]*$/);
    const fileName = fileNameMatch ? fileNameMatch[0].split('?')[0] : label;

    return (
        <div className="admin-cont-doc-item">
            <span className="admin-cont-doc-label" title={label}>{label}</span>
            <button 
                type="button" 
                className="admin-cont-doc-button" 
                onClick={() => onPreview(url)} 
                title={`Ver ${label} (${fileName})`}
            >
                {icon}
            </button>
        </div>
    );
};

export default AdminDocLink;