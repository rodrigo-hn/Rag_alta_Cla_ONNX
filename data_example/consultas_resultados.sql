-- =====================================================
-- CONSULTAS PARA RELACIONAR TAB_EXAMENES Y TAB_RESULTADOS
-- =====================================================

-- ============================================
-- CONSULTA 1: JOIN BÁSICO - Todos los resultados con información del examen
-- ============================================
SELECT 
    e.ID_ATENCION,
    e.FECHA_EXAMEN,
    e.NOMBRE_EXAMEN,
    e.CODIGO_EXAMEN,
    e.TIPO_PACIENTE,
    e.TIPO_CONSULTA,
    r.NRO_PETICION_LIS,
    r.NOMBRE_PRUEBA_LIS,
    r.VALOR_RESULTADO,
    r.UNIDAD_MEDIDA,
    r.RANGO_INFERIOR,
    r.RANGO_SUPERIOR,
    r.IND_RANGO_RESULTADO,
    CASE 
        WHEN r.IND_RANGO_RESULTADO = 'N' THEN 'Normal'
        WHEN r.IND_RANGO_RESULTADO = 'H' THEN 'Alto'
        WHEN r.IND_RANGO_RESULTADO = 'L' THEN 'Bajo'
        ELSE 'Sin clasificar'
    END AS ESTADO_RESULTADO,
    r.FECHA_INTEGRACION,
    r.NOMBRE_TECNOLOGO
FROM 
    TAB_EXAMENES e
INNER JOIN 
    TAB_RESULTADOS r ON e.ID_ATENCION = r.ID_ATENCION 
                     AND e.CODIGO_EXAMEN = r.COD_PRESTACION
ORDER BY 
    e.FECHA_EXAMEN DESC,
    e.ID_ATENCION,
    r.CORR_PRUEBA_LIS;


-- ============================================
-- CONSULTA 2: Resultados SOLO con valores numéricos (excluyendo títulos y separadores)
-- ============================================
SELECT 
    e.ID_ATENCION,
    e.FECHA_EXAMEN,
    e.NOMBRE_EXAMEN,
    e.CODIGO_EXAMEN,
    r.NOMBRE_PRUEBA_LIS,
    r.VALOR_RESULTADO,
    r.UNIDAD_MEDIDA,
    r.RANGO_INFERIOR || ' - ' || r.RANGO_SUPERIOR AS RANGO_REFERENCIA,
    r.IND_RANGO_RESULTADO,
    CASE 
        WHEN r.IND_RANGO_RESULTADO = 'N' THEN '✓ Normal'
        WHEN r.IND_RANGO_RESULTADO = 'H' THEN '↑ Alto'
        WHEN r.IND_RANGO_RESULTADO = 'L' THEN '↓ Bajo'
        ELSE '-'
    END AS ESTADO
FROM 
    TAB_EXAMENES e
INNER JOIN 
    TAB_RESULTADOS r ON e.ID_ATENCION = r.ID_ATENCION 
                     AND e.CODIGO_EXAMEN = r.COD_PRESTACION
WHERE 
    r.VALOR_RESULTADO IS NOT NULL
    AND r.VALOR_RESULTADO != '-'
    AND r.IND_RANGO_RESULTADO IS NOT NULL
ORDER BY 
    e.FECHA_EXAMEN DESC,
    e.ID_ATENCION,
    r.CORR_PRUEBA_LIS;


-- ============================================
-- CONSULTA 3: Resumen de exámenes por ID_ATENCION
-- ============================================
SELECT 
    e.ID_ATENCION,
    e.FECHA_EXAMEN,
    e.NOMBRE_EXAMEN,
    e.CODIGO_EXAMEN,
    COUNT(r.CORR_PRUEBA_LIS) AS TOTAL_PRUEBAS,
    SUM(CASE WHEN r.IND_RANGO_RESULTADO = 'N' THEN 1 ELSE 0 END) AS NORMALES,
    SUM(CASE WHEN r.IND_RANGO_RESULTADO = 'H' THEN 1 ELSE 0 END) AS ALTOS,
    SUM(CASE WHEN r.IND_RANGO_RESULTADO = 'L' THEN 1 ELSE 0 END) AS BAJOS,
    MAX(r.FECHA_INTEGRACION) AS ULTIMA_INTEGRACION
FROM 
    TAB_EXAMENES e
INNER JOIN 
    TAB_RESULTADOS r ON e.ID_ATENCION = r.ID_ATENCION 
                     AND e.CODIGO_EXAMEN = r.COD_PRESTACION
GROUP BY 
    e.ID_ATENCION,
    e.FECHA_EXAMEN,
    e.NOMBRE_EXAMEN,
    e.CODIGO_EXAMEN
ORDER BY 
    e.FECHA_EXAMEN DESC;


-- ============================================
-- CONSULTA 4: Resultados ANORMALES (solo Altos y Bajos)
-- ============================================
SELECT 
    e.ID_ATENCION,
    e.FECHA_EXAMEN,
    e.NOMBRE_EXAMEN AS EXAMEN_SOLICITADO,
    r.NOMBRE_PRUEBA_LIS AS PRUEBA_ESPECIFICA,
    r.VALOR_RESULTADO,
    r.UNIDAD_MEDIDA,
    r.RANGO_INFERIOR,
    r.RANGO_SUPERIOR,
    CASE 
        WHEN r.IND_RANGO_RESULTADO = 'H' THEN '⚠ ALTO'
        WHEN r.IND_RANGO_RESULTADO = 'L' THEN '⚠ BAJO'
    END AS ALERTA,
    r.OBSERVACION
FROM 
    TAB_EXAMENES e
INNER JOIN 
    TAB_RESULTADOS r ON e.ID_ATENCION = r.ID_ATENCION 
                     AND e.CODIGO_EXAMEN = r.COD_PRESTACION
WHERE 
    r.IND_RANGO_RESULTADO IN ('H', 'L')
ORDER BY 
    e.FECHA_EXAMEN DESC,
    r.IND_RANGO_RESULTADO DESC;


-- ============================================
-- CONSULTA 5: Detalle completo de UN examen específico (ejemplo: Hemograma)
-- ============================================
SELECT 
    e.ID_ATENCION,
    e.FECHA_EXAMEN,
    TO_CHAR(e.FECHA_EXAMEN, 'DD/MM/YYYY') AS FECHA_FORMATO,
    e.NOMBRE_EXAMEN,
    e.CODIGO_EXAMEN,
    e.TIPO_PACIENTE,
    r.CORR_PRUEBA_LIS AS ORDEN,
    r.NOMBRE_PRUEBA_LIS,
    r.VALOR_RESULTADO,
    r.UNIDAD_MEDIDA,
    r.RANGO_INFERIOR,
    r.RANGO_SUPERIOR,
    r.IND_RANGO_RESULTADO,
    r.OBSERVACION,
    r.NOMBRE_TECNOLOGO,
    TO_CHAR(r.FECHA_INTEGRACION, 'DD/MM/YYYY HH24:MI:SS') AS FECHA_RESULTADO
FROM 
    TAB_EXAMENES e
INNER JOIN 
    TAB_RESULTADOS r ON e.ID_ATENCION = r.ID_ATENCION 
                     AND e.CODIGO_EXAMEN = r.COD_PRESTACION
WHERE 
    e.ID_ATENCION = 1416169  -- Cambiar por el ID que necesites
    AND e.CODIGO_EXAMEN = '03-01-045-00'  -- Ejemplo: Hemograma
ORDER BY 
    r.CORR_PRUEBA_LIS;


-- ============================================
-- CONSULTA 6: Búsqueda por nombre de prueba específica
-- ============================================
SELECT 
    e.ID_ATENCION,
    e.FECHA_EXAMEN,
    e.NOMBRE_EXAMEN,
    r.NOMBRE_PRUEBA_LIS,
    r.VALOR_RESULTADO,
    r.UNIDAD_MEDIDA,
    r.RANGO_INFERIOR || ' - ' || r.RANGO_SUPERIOR AS RANGO_NORMAL,
    CASE 
        WHEN r.IND_RANGO_RESULTADO = 'N' THEN 'Normal'
        WHEN r.IND_RANGO_RESULTADO = 'H' THEN 'Alto'
        WHEN r.IND_RANGO_RESULTADO = 'L' THEN 'Bajo'
    END AS ESTADO
FROM 
    TAB_EXAMENES e
INNER JOIN 
    TAB_RESULTADOS r ON e.ID_ATENCION = r.ID_ATENCION 
                     AND e.CODIGO_EXAMEN = r.COD_PRESTACION
WHERE 
    UPPER(r.NOMBRE_PRUEBA_LIS) LIKE '%HEMOGLOBINA%'  -- Cambiar por la prueba que busques
ORDER BY 
    e.FECHA_EXAMEN DESC;


-- ============================================
-- CONSULTA 7: Historial de resultados de una prueba específica
-- ============================================
SELECT 
    e.FECHA_EXAMEN,
    TO_CHAR(e.FECHA_EXAMEN, 'DD/MM/YYYY') AS FECHA,
    e.ID_ATENCION,
    r.NOMBRE_PRUEBA_LIS,
    r.VALOR_RESULTADO,
    r.UNIDAD_MEDIDA,
    r.IND_RANGO_RESULTADO,
    CASE 
        WHEN r.IND_RANGO_RESULTADO = 'H' THEN '↑'
        WHEN r.IND_RANGO_RESULTADO = 'L' THEN '↓'
        WHEN r.IND_RANGO_RESULTADO = 'N' THEN '='
    END AS TENDENCIA
FROM 
    TAB_EXAMENES e
INNER JOIN 
    TAB_RESULTADOS r ON e.ID_ATENCION = r.ID_ATENCION 
                     AND e.CODIGO_EXAMEN = r.COD_PRESTACION
WHERE 
    r.NOMBRE_PRUEBA_LIS = 'Hemoglobina en sangre total'  -- Cambiar por la prueba
ORDER BY 
    e.FECHA_EXAMEN DESC;


-- ============================================
-- CONSULTA 8: Vista para crear un informe completo
-- ============================================
CREATE OR REPLACE VIEW V_RESULTADOS_EXAMENES AS
SELECT 
    e.ID_ATENCION,
    e.SUCURSAL,
    e.FECHA_EXAMEN,
    TO_CHAR(e.FECHA_EXAMEN, 'DD/MM/YYYY') AS FECHA_STR,
    e.NOMBRE_EXAMEN,
    e.CODIGO_EXAMEN,
    e.TIPO_PACIENTE,
    e.TIPO_CONSULTA,
    r.NRO_PETICION_LIS,
    r.ID_REGISTRO,
    r.CORR_PRUEBA_LIS,
    r.NOMBRE_PRUEBA_LIS,
    r.VALOR_RESULTADO,
    r.UNIDAD_MEDIDA,
    r.RANGO_INFERIOR,
    r.RANGO_SUPERIOR,
    r.IND_RANGO_RESULTADO,
    CASE 
        WHEN r.IND_RANGO_RESULTADO = 'N' THEN 'Normal'
        WHEN r.IND_RANGO_RESULTADO = 'H' THEN 'Alto'
        WHEN r.IND_RANGO_RESULTADO = 'L' THEN 'Bajo'
        ELSE 'Sin clasificar'
    END AS ESTADO_RESULTADO,
    r.OBSERVACION,
    r.RUT_TECNOLOGO,
    r.NOMBRE_TECNOLOGO,
    r.FECHA_FIRMA,
    r.FECHA_INTEGRACION,
    TO_CHAR(r.FECHA_INTEGRACION, 'DD/MM/YYYY HH24:MI:SS') AS FECHA_INTEGRACION_STR
FROM 
    TAB_EXAMENES e
INNER JOIN 
    TAB_RESULTADOS r ON e.ID_ATENCION = r.ID_ATENCION 
                     AND e.CODIGO_EXAMEN = r.COD_PRESTACION;

-- Ahora puedes usar la vista así:
-- SELECT * FROM V_RESULTADOS_EXAMENES WHERE ID_ATENCION = 1416169;

SELECT * FROM V_RESULTADOS_EXAMENES WHERE ID_ATENCION = 1416169;
-- ============================================
-- CONSULTA 9: Estadísticas generales
-- ============================================
SELECT 
    'Total de exámenes' AS METRICA,
    COUNT(DISTINCT e.ID_ATENCION || e.CODIGO_EXAMEN) AS VALOR
FROM TAB_EXAMENES e
UNION ALL
SELECT 
    'Total de resultados',
    COUNT(*) 
FROM TAB_RESULTADOS
UNION ALL
SELECT 
    'Resultados normales',
    COUNT(*)
FROM TAB_RESULTADOS
WHERE IND_RANGO_RESULTADO = 'N'
UNION ALL
SELECT 
    'Resultados altos',
    COUNT(*)
FROM TAB_RESULTADOS
WHERE IND_RANGO_RESULTADO = 'H'
UNION ALL
SELECT 
    'Resultados bajos',
    COUNT(*)
FROM TAB_RESULTADOS
WHERE IND_RANGO_RESULTADO = 'L';