-- Consulta de Connekta: merkahorro_empleados_activos
-- La usa services/empleadosSiesaService.js (panel de fotos): lee nit,
-- nombre_empleado, fecha_ingreso, es_indefinido y fecha_fin_contrato_vigente.
--
-- Reescrita el 2026-10-03 sobre la base de la consulta de contratos porque el
-- SQL original se perdió: un contrato vigente por fila, mismas columnas que
-- devolvía la original. Copia de referencia; la consulta vive en Connekta.
-- Sin ORDER BY al final: Connekta la envuelve en una subconsulta.
SELECT
    x.c0550_rowid_tercero AS id_tercero,
    LTRIM(RTRIM(t.f200_id)) AS nit,
    LTRIM(RTRIM(t.f200_razon_social)) AS nombre_empleado,
    x.c0550_id_cia AS id_cia,
    x.c0550_rowid AS rowid_contrato,
    x.c0550_fecha_ingreso AS fecha_ingreso,
    x.c0550_fecha_retiro AS fecha_retiro,
    x.c0550_fecha_contrato_hasta AS fecha_fin_original,
    p.c0551_id AS ultima_prorroga_nro,
    p.c0551_fecha_final AS fecha_fin_ultima_prorroga,
    CASE
        WHEN p.c0551_rowid_contrato IS NOT NULL THEN p.c0551_ind_indefinido
        WHEN x.c0550_fecha_contrato_hasta IS NULL THEN 1
        ELSE 0
    END AS es_indefinido,
    CASE
        WHEN p.c0551_rowid_contrato IS NOT NULL THEN p.c0551_fecha_final
        ELSE x.c0550_fecha_contrato_hasta
    END AS fecha_fin_contrato_vigente
FROM dbo.w0550_contratos x
INNER JOIN dbo.t200_mm_terceros t
    ON t.f200_rowid = x.c0550_rowid_tercero
   AND t.f200_id_cia = x.c0550_id_cia
OUTER APPLY (
    SELECT TOP 1 pr.c0551_id, pr.c0551_fecha_final, pr.c0551_ind_indefinido, pr.c0551_rowid_contrato
    FROM dbo.w0551_contratos_prorrogas pr
    WHERE pr.c0551_rowid_contrato = x.c0550_rowid
    ORDER BY pr.c0551_id DESC
) p
WHERE x.c0550_fecha_retiro IS NULL
