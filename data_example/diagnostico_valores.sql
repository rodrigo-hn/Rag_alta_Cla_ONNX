-- =====================================================
-- DIAGNÓSTICO DE VALORES PROBLEMÁTICOS
-- Identifica valores que causan ORA-01722
-- =====================================================

SET LINESIZE 200;
SET PAGESIZE 100;

PROMPT ==========================================
PROMPT DIAGNÓSTICO DE VALORES EN VALOR_RESULTADO
PROMPT ==========================================
PROMPT

-- 1. Ver todos los valores únicos y su frecuencia
PROMPT 1. VALORES ÚNICOS Y FRECUENCIA:
PROMPT ------------------------------------------
SELECT
    VALOR_RESULTADO,
    LENGTH(VALOR_RESULTADO) AS longitud,
    COUNT(*) AS cantidad,
    CASE
        WHEN REGEXP_LIKE(TRIM(VALOR_RESULTADO), '^[0-9]+([.,][0-9]+)?$') THEN 'VALIDO'
        ELSE 'INVALIDO'
    END AS validez
FROM TAB_RESULTADOS
WHERE VALOR_RESULTADO IS NOT NULL
GROUP BY VALOR_RESULTADO
ORDER BY validez DESC, cantidad DESC;

PROMPT
PROMPT ==========================================
PROMPT 2. VALORES INVÁLIDOS DETECTADOS:
PROMPT ------------------------------------------
SELECT
    ID_ATENCION,
    NOMBRE_PRUEBA_LIS,
    VALOR_RESULTADO,
    '"' || VALOR_RESULTADO || '"' AS valor_con_comillas,
    LENGTH(VALOR_RESULTADO) AS longitud,
    DUMP(VALOR_RESULTADO) AS contenido_binario
FROM TAB_RESULTADOS
WHERE VALOR_RESULTADO IS NOT NULL
    AND VALOR_RESULTADO != '-'
    AND NOT REGEXP_LIKE(TRIM(VALOR_RESULTADO), '^[0-9]+([.,][0-9]+)?$')
ORDER BY NOMBRE_PRUEBA_LIS, VALOR_RESULTADO;

PROMPT
PROMPT ==========================================
PROMPT 3. VALORES CON ESPACIOS O CARACTERES RAROS:
PROMPT ------------------------------------------
SELECT
    VALOR_RESULTADO,
    LENGTH(VALOR_RESULTADO) AS longitud,
    LENGTH(TRIM(VALOR_RESULTADO)) AS longitud_sin_espacios,
    ASCII(SUBSTR(VALOR_RESULTADO, 1, 1)) AS ascii_primer_char,
    ASCII(SUBSTR(VALOR_RESULTADO, -1, 1)) AS ascii_ultimo_char,
    COUNT(*) AS cantidad
FROM TAB_RESULTADOS
WHERE VALOR_RESULTADO IS NOT NULL
    AND LENGTH(VALOR_RESULTADO) != LENGTH(TRIM(VALOR_RESULTADO))
GROUP BY
    VALOR_RESULTADO,
    LENGTH(VALOR_RESULTADO),
    LENGTH(TRIM(VALOR_RESULTADO)),
    ASCII(SUBSTR(VALOR_RESULTADO, 1, 1)),
    ASCII(SUBSTR(VALOR_RESULTADO, -1, 1))
ORDER BY cantidad DESC;

PROMPT
PROMPT ==========================================
PROMPT 4. VALORES QUE PASAN REGEXP PERO FALLAN TO_NUMBER:
PROMPT ------------------------------------------
SELECT
    VALOR_RESULTADO,
    REPLACE(VALOR_RESULTADO, ',', '.') AS valor_reemplazado,
    CASE
        WHEN REGEXP_LIKE(VALOR_RESULTADO, '^[0-9]+([.,][0-9]+)?$') THEN 'Pasa REGEXP'
        ELSE 'No pasa REGEXP'
    END AS estado_regexp,
    COUNT(*) AS cantidad
FROM TAB_RESULTADOS
WHERE VALOR_RESULTADO IS NOT NULL
    AND VALOR_RESULTADO != '-'
    AND IND_RANGO_RESULTADO IS NOT NULL
GROUP BY
    VALOR_RESULTADO,
    REPLACE(VALOR_RESULTADO, ',', '.'),
    CASE
        WHEN REGEXP_LIKE(VALOR_RESULTADO, '^[0-9]+([.,][0-9]+)?$') THEN 'Pasa REGEXP'
        ELSE 'No pasa REGEXP'
    END
ORDER BY estado_regexp, cantidad DESC;

PROMPT
PROMPT ==========================================
PROMPT 5. PRUEBA DE CONVERSIÓN SEGURA:
PROMPT ------------------------------------------
SELECT
    NOMBRE_PRUEBA_LIS,
    VALOR_RESULTADO,
    CASE
        WHEN REGEXP_LIKE(TRIM(VALOR_RESULTADO), '^[0-9]+([.,][0-9]+)?$')
        THEN TO_NUMBER(REPLACE(TRIM(VALOR_RESULTADO), ',', '.'))
        ELSE NULL
    END AS valor_convertido,
    IND_RANGO_RESULTADO,
    FECHA_INTEGRACION
FROM TAB_RESULTADOS
WHERE VALOR_RESULTADO IS NOT NULL
    AND VALOR_RESULTADO != '-'
    AND IND_RANGO_RESULTADO IS NOT NULL
    AND ROWNUM <= 20
ORDER BY FECHA_INTEGRACION DESC;

PROMPT
PROMPT ==========================================
PROMPT 6. RESUMEN DE VALIDEZ:
PROMPT ------------------------------------------
SELECT
    CASE
        WHEN REGEXP_LIKE(TRIM(VALOR_RESULTADO), '^[0-9]+([.,][0-9]+)?$')
            AND NOT REGEXP_LIKE(TRIM(VALOR_RESULTADO), '[A-Za-z]')
        THEN 'VALORES_VALIDOS'
        ELSE 'VALORES_INVALIDOS'
    END AS categoria,
    COUNT(*) AS cantidad,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM TAB_RESULTADOS
WHERE VALOR_RESULTADO IS NOT NULL
    AND VALOR_RESULTADO != '-'
GROUP BY
    CASE
        WHEN REGEXP_LIKE(TRIM(VALOR_RESULTADO), '^[0-9]+([.,][0-9]+)?$')
            AND NOT REGEXP_LIKE(TRIM(VALOR_RESULTADO), '[A-Za-z]')
        THEN 'VALORES_VALIDOS'
        ELSE 'VALORES_INVALIDOS'
    END;

PROMPT
PROMPT ==========================================
PROMPT 7. EJEMPLOS DE CADA IND_RANGO_RESULTADO:
PROMPT ------------------------------------------
SELECT
    IND_RANGO_RESULTADO,
    NOMBRE_PRUEBA_LIS,
    VALOR_RESULTADO,
    ROWNUM AS ejemplo_num
FROM (
    SELECT DISTINCT
        IND_RANGO_RESULTADO,
        NOMBRE_PRUEBA_LIS,
        VALOR_RESULTADO
    FROM TAB_RESULTADOS
    WHERE VALOR_RESULTADO IS NOT NULL
        AND VALOR_RESULTADO != '-'
    ORDER BY IND_RANGO_RESULTADO, NOMBRE_PRUEBA_LIS
)
WHERE ROWNUM <= 30;

PROMPT
PROMPT ==========================================
PROMPT DIAGNÓSTICO COMPLETADO
PROMPT ==========================================
PROMPT
PROMPT Revisa los valores INVALIDOS arriba para identificar el problema.
PROMPT Los valores con caracteres no numéricos deben ser excluidos o limpiados.
PROMPT
