import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { FaTimes, FaEraser, FaSave, FaArrowDown } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import "./HabeasDataModal.css";

const HabeasDataModal = ({ isOpen, onClose, onSave }) => {
  const sigCanvas = useRef({});
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const [error, setError] = useState("");
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 180 });
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Reset scroll position
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
        setShowScrollIndicator(true);
      }

      const updateSize = () => {
        if (containerRef.current) {
          setCanvasSize({
            width: containerRef.current.offsetWidth,
            height: 180,
          });
        }
      };

      // Initial calculation with delay
      setTimeout(updateSize, 100);

      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
  }, [isOpen]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Show indicator if user is not near the bottom (where signature is)
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setShowScrollIndicator(false);
    } else {
      setShowScrollIndicator(true);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const clear = () => {
    sigCanvas.current.clear();
    setError("");
  };

  const save = () => {
    if (sigCanvas.current.isEmpty()) {
      setError("Por favor, firme el documento antes de guardar.");
      return;
    }
    // Obtener la firma como imagen PNG en base64
    // Usamos getCanvas() en lugar de getTrimmedCanvas() para evitar problemas de compatibilidad
    const dataURL = sigCanvas.current.getCanvas().toDataURL("image/png");
    onSave(dataURL);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="tc-modal-overlay">
          <motion.div
            className="tc-modal-content habeas-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <button className="tc-modal-close" onClick={onClose}>
              <FaTimes />
            </button>

            <div className="habeas-content">
              <h2 className="habeas-title">
                AVISO DE PRIVACIDAD Y AUTORIZACION EXPRESA
              </h2>

              <div
                className="habeas-text-scroll"
                ref={scrollRef}
                onScroll={handleScroll}
              >
                <p>
                  <strong>Supermercados Merkahorro SAS</strong> identificada con
                  el Nit. 901150440-9, en cumplimiento de lo definido en la Ley
                  1581 del 2012 de Protección de Datos Personales y nuestra
                  política de Protección de Datos Personales, se compromete con
                  sus trabajadores para el desarrollo de las funciones en los
                  procesos que usted aplica al interior de la empresa.
                </p>
                <p>
                  En este formato se encontrará con la Autorización del uso de
                  su información Personal, la cual es necesario que conozca y si
                  está de acuerdo sea diligenciada y entregada al personal
                  designado por Supermercados Merkahorro SAS
                </p>

                <h3>AUTORIZACION DE USO DE INFORMACION PERSONAL</h3>
                <p>
                  Autorizo a Supermercados Merkahorro SAS realizar tratamiento
                  de mis datos personales, actividad que incluye, recolección,
                  almacenamiento, actualización, uso, circulación, transferencia
                  y supresión para los siguientes fines:
                </p>
                <ul>
                  <li>
                    Suministrar datos a las entidades de afiliación para el
                    cumplimiento de la Ley tales como: Fondo de Pensiones, Fondo
                    de Cesantías, Empresas Promotoras de Salud, Aseguradora de
                    Riesgos Laborales y Cajas de Compensación.
                  </li>
                  <li>
                    Fines administrativos, operativos, industriales,
                    comerciales, sociales, promocionales, informativos, de
                    mercadeo, ventas, para el mejoramiento continuo y
                    cumplimiento en el desarrollo de sus actividades.
                  </li>
                  <li>En el caso de requerimientos judiciales y legales</li>
                  <li>Contabilización y pago de nomina</li>
                  <li>Reclutar y seleccionar personal que ocupen vacantes</li>
                  <li>
                    Procesar, confirmar y cumplir con las obligaciones legales y
                    extralegales derivadas del contrato laboral
                  </li>
                  <li>Realizar transacciones</li>
                  <li>Pago de beneficios extralegales</li>
                  <li>Auditorias</li>
                  <li>Análisis estadísticos</li>
                  <li>Capacitación y formación</li>
                  <li>
                    Compartir los datos personales con entidades bancarias,
                    empresas que ofrezcan beneficios a nuestros trabajadores
                    activos, entre otros.
                  </li>
                  <li>
                    Compartir datos personales con entidades nacionales o
                    extranjeras cuando se basen en solicitudes legales
                  </li>
                  <li>Suministrar referencias laborales</li>
                  <li>
                    Las demás finalidades que determinen los Responsables en
                    procesos de obtención de Datos Personales para su
                    Tratamiento, con el fin de dar cumplimiento a las
                    obligaciones legales y regulatorias.
                  </li>
                </ul>

                <p>
                  Supermercados Merkahorro SAS en cumplimiento de lo definido en
                  la Ley 1581 de 2012, el Decreto reglamentario 1377 de 2013 y
                  nuestra Política de protección de datos personales, le informa
                  que los datos personales que usted suministre en virtud de las
                  operaciones que solicite o celebre con Supermercados
                  Merkahorro SAS serán tratados mediante el uso y mantenimiento
                  de medidas de seguridad técnicas, físicas y administrativas a
                  fin de impedir que terceros no autorizados accedan a los
                  mismos, lo anterior de conformidad a lo definido por la Ley.
                </p>

                <h3>AUTORIZACIÓN DE CONSULTAS</h3>
                <p>
                  En mi calidad de titular de información, actuando libre y
                  voluntariamente, autorizo de manera expresa, informada,
                  explícita, inequívoca e irrevocable a Supermercados Merkahorro
                  SAS, a quien represente sus derechos, a consultar, solicitar,
                  reportar y procesar toda la información que se refiera a mi
                  comportamiento, judicial, penal, crediticio, financiero y
                  comercial, de acuerdo a lo anterior, la empresa podrá realizar
                  la consultas inherentes en las diferentes paginas judiciales,
                  de control, de riesgo y crediticias, con los mismos fines.
                </p>

                <h3>DECLARACION DEL TITULAR</h3>
                <p>
                  Toda información suministrada por mí a Supermercados
                  Merkahorro SAS, es verdadera.
                </p>
                <p>
                  Conozco los derechos y condiciones para el tratamiento de
                  datos presentado en el Manual de Políticas y Tratamiento de la
                  Información de Supermercados Merkahorro SAS
                </p>
                <p>
                  Las políticas que me serán aplicables desde el inicio hasta la
                  terminación del contrato laboral.
                </p>
                <p>
                  Supermercados Merkahorro SAS, se reserva el derecho de aceptar
                  o rechazar el inicio de una relación contractual, sin estar
                  obligado a suministrar las razones que motivaron tal decisión.
                  El diligenciamiento de este documento no constituye promesa de
                  celebrar contrato y/o vinculación a Supermercados Merkahorro
                  SAS.
                </p>

                <div className="signature-section">
                  <p className="signature-label">Firma Digital del Titular:</p>
                  <div className="signature-pad-container" ref={containerRef}>
                    <SignatureCanvas
                      ref={sigCanvas}
                      penColor="black"
                      canvasProps={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        className: "signature-canvas",
                      }}
                      backgroundColor="rgba(255, 255, 255, 1)"
                    />
                  </div>
                  {error && <p className="signature-error">{error}</p>}

                  <div className="signature-actions">
                    <button
                      type="button"
                      className="tc-btn-secondary"
                      onClick={clear}
                    >
                      <FaEraser /> Limpiar Firma
                    </button>
                    <button
                      type="button"
                      className="tc-btn-primary"
                      onClick={save}
                    >
                      <FaSave /> Aceptar y Firmar
                    </button>
                  </div>
                </div>
              </div>

              {showScrollIndicator && (
                <div className="scroll-indicator-container">
                  <button
                    className="scroll-indicator-btn"
                    onClick={scrollToBottom}
                  >
                    <FaArrowDown /> Bajar para firmar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default HabeasDataModal;
