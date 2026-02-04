import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";

const MAX_VISIBLE_OPTIONS = 20;

const SearchableSelect = ({
  id,
  value,
  onChange,
  options,
  placeholder = "Seleccione...",
  disabled = false,
  noOptionsText = "Sin coincidencias",
  isInvalid = false,
}) => {
  const containerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption ? selectedOption.label : "");
    }
  }, [selectedOption, isOpen]);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return options.slice(0, MAX_VISIBLE_OPTIONS);
    }
    return options
      .filter((option) => option.label.toLowerCase().includes(term))
      .slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery(selectedOption ? selectedOption.label : "");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, selectedOption]);

  const handleOptionSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setQuery(option.label);
  };

  const handleInputFocus = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  const handleInputChange = (event) => {
    if (disabled) return;
    const nextValue = event.target.value;
    setQuery(nextValue);
    setIsOpen(true);
    if (!nextValue.trim()) {
      onChange(null);
    }
  };

  const handleKeyDown = (event) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      event.preventDefault();
    }
    if (event.key === "Escape") {
      setIsOpen(false);
      setQuery(selectedOption ? selectedOption.label : "");
    }
    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      if (filteredOptions.length > 0) {
        handleOptionSelect(filteredOptions[0]);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`tc-searchable-select ${disabled ? "is-disabled" : ""}`}
    >
      <div className="tc-searchable-input-wrapper">
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`tc-form-input tc-searchable-input ${
            isInvalid ? "is-invalid" : ""
          }`}
        />
        <button
          type="button"
          className="tc-searchable-trigger"
          onClick={() => {
            if (disabled) return;
            setIsOpen((prev) => !prev);
          }}
          aria-label="Mostrar opciones"
        >
          <FaChevronDown />
        </button>
      </div>
      {isOpen && (
        <div className="tc-searchable-options" role="listbox">
          {filteredOptions.length === 0 ? (
            <div className="tc-searchable-option empty" role="option">
              {noOptionsText}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`tc-searchable-option ${
                  selectedOption && selectedOption.value === option.value
                    ? "selected"
                    : ""
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleOptionSelect(option)}
                role="option"
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
