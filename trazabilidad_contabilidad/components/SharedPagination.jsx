import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./SharedPagination.css";

const SharedPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="admin-cont-paginacion-container">
      <button
        className="admin-cont-btn-paginacion"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        title="Anterior"
      >
        <FaChevronLeft size={12} />
        Anterior
      </button>

      <div className="admin-cont-info-paginacion">
        Página <span>{currentPage}</span> de <span>{totalPages}</span>
      </div>

      <button
        className="admin-cont-btn-paginacion"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        title="Siguiente"
      >
        Siguiente
        <FaChevronRight size={12} />
      </button>
    </div>
  );
};

export default SharedPagination;
