-- =====================================================
-- GENERAR JSON - RESUMEN DE LABORATORIOS (CORREGIDO)
-- VERSIÓN 1: JSON_OBJECT + JSON_ARRAYAGG
-- Oracle 19c - Con manejo robusto de conversiones
-- =====================================================

-- Configuración para visualización óptima del JSON
SET LINESIZE 32767;
SET LONG 1000000;
SET LONGCHUNKSIZE 1000000;
SET PAGESIZE 0;
SET FEEDBACK OFF;
SET VERIFY OFF;
SET TRIMSPOOL ON;
SET TRIM ON;
SET HEADING OFF;

-- =====================================================
-- CONSULTA PARA GENERAR JSON
-- Resultado: JSON con primer y último resultado por prueba
-- =====================================================

SELECT JSON_OBJECT(
    'laboratorios_resumen' VALUE
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'prueba' VALUE prueba,
            'unidad' VALUE unidad,
            'ingreso' VALUE JSON_OBJECT(
                'valor' VALUE valor_ingreso,
                'fecha' VALUE TO_CHAR(fecha_ingreso, 'YYYY-MM-DD"T"HH24:MI:SS'),
                'estado' VALUE estado_ingreso
            ),
            'ultimo' VALUE CASE
                WHEN tiene_ultimo = 'SI' THEN JSON_OBJECT(
                    'valor' VALUE valor_ultimo,
                    'fecha' VALUE TO_CHAR(fecha_ultimo, 'YYYY-MM-DD"T"HH24:MI:SS'),
                    'estado' VALUE estado_ultimo
                )
                ELSE NULL
            END
            ABSENT ON NULL
        )
    )
) AS json_resultado
FROM (
    WITH datos_pruebas AS (
        SELECT
            e.ID_ATENCION,
            r.NOMBRE_PRUEBA_LIS AS prueba,
            r.UNIDAD_MEDIDA AS unidad,
            -- Conversión segura a número con validación múltiple
            CASE
                WHEN REGEXP_LIKE(TRIM(r.VALOR_RESULTADO), '^[0-9]+([.,][0-9]+)?$')
                THEN TO_NUMBER(REPLACE(REPLACE(TRIM(r.VALOR_RESULTADO), ',', '.'), ' ', ''))
                ELSE NULL
            END AS valor_numerico,
            r.FECHA_INTEGRACION,
            LOWER(
                CASE
                    WHEN r.IND_RANGO_RESULTADO = 'N' THEN 'normal'
                    WHEN r.IND_RANGO_RESULTADO = 'H' THEN 'alto'
                    WHEN r.IND_RANGO_RESULTADO = 'L' THEN 'bajo'
                    ELSE 'sin_clasificar'
                END
            ) AS estado,
            ROW_NUMBER() OVER (
                PARTITION BY e.ID_ATENCION, r.NOMBRE_PRUEBA_LIS
                ORDER BY r.FECHA_INTEGRACION ASC
            ) AS rn_primero,
            ROW_NUMBER() OVER (
                PARTITION BY e.ID_ATENCION, r.NOMBRE_PRUEBA_LIS
                ORDER BY r.FECHA_INTEGRACION DESC
            ) AS rn_ultimo
        FROM
            TAB_EXAMENES e
        INNER JOIN
            TAB_RESULTADOS r ON e.ID_ATENCION = r.ID_ATENCION
                             AND e.CODIGO_EXAMEN = r.COD_PRESTACION
        WHERE
            r.VALOR_RESULTADO IS NOT NULL
            AND TRIM(r.VALOR_RESULTADO) != '-'
            AND TRIM(r.VALOR_RESULTADO) != ''
            AND r.IND_RANGO_RESULTADO IS NOT NULL
            AND r.IND_RANGO_RESULTADO IN ('N', 'H', 'L')
            -- Validación estricta: solo números, punto o coma decimal
            AND REGEXP_LIKE(TRIM(r.VALOR_RESULTADO), '^[0-9]+([.,][0-9]+)?$')
            -- Validación adicional: no contiene letras
            AND NOT REGEXP_LIKE(TRIM(r.VALOR_RESULTADO), '[A-Za-z]')
            -- =====================================================
            -- FILTROS OPCIONALES - Descomentar según necesidad
            -- =====================================================
            -- Filtrar por ID_ATENCION específico:
            -- AND e.ID_ATENCION = 1416169

            -- Filtrar por rango de fechas:
            -- AND r.FECHA_INTEGRACION >= TO_DATE('2025-01-01', 'YYYY-MM-DD')
            -- AND r.FECHA_INTEGRACION <= TO_DATE('2025-12-31', 'YYYY-MM-DD')

            -- Filtrar por pruebas específicas:
            -- AND r.NOMBRE_PRUEBA_LIS IN ('Glucosa', 'Hemoglobina', 'Creatinina')
    ),
    primeros AS (
        SELECT
            ID_ATENCION,
            prueba,
            unidad,
            valor_numerico AS valor_ingreso,
            FECHA_INTEGRACION AS fecha_ingreso,
            estado AS estado_ingreso
        FROM datos_pruebas
        WHERE rn_primero = 1
            AND valor_numerico IS NOT NULL  -- Asegurar que hay valor numérico válido
    ),
    ultimos AS (
        SELECT
            ID_ATENCION,
            prueba,
            valor_numerico AS valor_ultimo,
            FECHA_INTEGRACION AS fecha_ultimo,
            estado AS estado_ultimo
        FROM datos_pruebas
        WHERE rn_ultimo = 1
            AND valor_numerico IS NOT NULL  -- Asegurar que hay valor numérico válido
    )
    SELECT
        p.prueba,
        p.unidad,
        p.valor_ingreso,
        p.fecha_ingreso,
        p.estado_ingreso,
        CASE
            WHEN u.valor_ultimo IS NOT NULL AND u.valor_ultimo != p.valor_ingreso
            THEN 'SI'
            ELSE 'NO'
        END AS tiene_ultimo,
        u.valor_ultimo,
        u.fecha_ultimo,
        u.estado_ultimo
    FROM primeros p
    LEFT JOIN ultimos u ON p.ID_ATENCION = u.ID_ATENCION
                        AND p.prueba = u.prueba
    ORDER BY p.prueba
);

-- =====================================================
-- NOTAS SOBRE LAS CORRECCIONES:
-- =====================================================
--
-- 1. Conversión segura con CASE:
--    - Valida antes de convertir
--    - Retorna NULL si no es válido
--    - Evita el error ORA-01722
--
-- 2. TRIM() aplicado:
--    - Elimina espacios en blanco
--    - Previene problemas con espacios ocultos
--
-- 3. Validaciones adicionales:
--    - IND_RANGO_RESULTADO IN ('N', 'H', 'L')
--    - NOT REGEXP_LIKE para excluir letras
--    - valor_numerico IS NOT NULL en CTEs
--
-- 4. Comparación mejorada:
--    - Verifica que valor_ultimo no sea NULL
--    - Evita comparaciones NULL que causan errores
--
-- =====================================================
