-- =====================================================
-- VALIDACIÓN DE VERSIÓN 1: JSON_OBJECT y JSON_ARRAYAGG
-- Oracle 19c - Validación Local
-- =====================================================

-- Habilitar salida de DBMS_OUTPUT
SET SERVEROUTPUT ON SIZE UNLIMITED;

-- Configurar formato de salida
SET LINESIZE 32767;
SET PAGESIZE 0;
SET LONG 1000000;
SET LONGCHUNKSIZE 1000000;
SET TRIMSPOOL ON;
SET TRIM ON;
SET FEEDBACK OFF;
SET VERIFY OFF;

-- =====================================================
-- PASO 1: Verificar que existen las tablas necesarias
-- =====================================================
PROMPT ==========================================
PROMPT PASO 1: Verificando tablas necesarias...
PROMPT ==========================================

SELECT
    CASE
        WHEN COUNT(*) = 2 THEN 'OK - Ambas tablas existen'
        ELSE 'ERROR - Faltan tablas. Encontradas: ' || COUNT(*)
    END AS estado_tablas
FROM all_tables
WHERE table_name IN ('TAB_EXAMENES', 'TAB_RESULTADOS')
    AND owner = USER;

-- =====================================================
-- PASO 2: Verificar datos de prueba
-- =====================================================
PROMPT
PROMPT ==========================================
PROMPT PASO 2: Verificando datos disponibles...
PROMPT ==========================================

SELECT
    'TAB_EXAMENES: ' || COUNT(*) || ' registros' AS info
FROM TAB_EXAMENES
UNION ALL
SELECT
    'TAB_RESULTADOS: ' || COUNT(*) || ' registros' AS info
FROM TAB_RESULTADOS;

-- =====================================================
-- PASO 3: Verificar compatibilidad de funciones JSON
-- =====================================================
PROMPT
PROMPT ==========================================
PROMPT PASO 3: Verificando funciones JSON...
PROMPT ==========================================

-- Test simple de JSON_OBJECT
SELECT
    JSON_OBJECT('test' VALUE 'ok', 'version' VALUE 'Oracle 19c') AS test_json_object
FROM DUAL;

-- Test simple de JSON_ARRAYAGG
SELECT
    JSON_ARRAYAGG(level ORDER BY level) AS test_json_arrayagg
FROM DUAL
CONNECT BY level <= 3;

-- =====================================================
-- PASO 4: Ejecutar la consulta VERSIÓN 1 completa
-- =====================================================
PROMPT
PROMPT ==========================================
PROMPT PASO 4: Ejecutando VERSIÓN 1 (JSON_OBJECT + JSON_ARRAYAGG)...
PROMPT ==========================================

-- NOTA: Descomentar el filtro de ID_ATENCION según tus datos
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
            TO_NUMBER(REPLACE(r.VALOR_RESULTADO, ',', '.')) AS valor_numerico,
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
            AND r.VALOR_RESULTADO != '-'
            AND r.IND_RANGO_RESULTADO IS NOT NULL
            AND REGEXP_LIKE(r.VALOR_RESULTADO, '^[0-9]+([.,][0-9]+)?$')
            -- Descomentar y ajustar según tus datos:
            -- AND e.ID_ATENCION = 1416169
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
    )
    SELECT
        p.prueba,
        p.unidad,
        p.valor_ingreso,
        p.fecha_ingreso,
        p.estado_ingreso,
        CASE WHEN u.valor_ultimo != p.valor_ingreso THEN 'SI' ELSE 'NO' END AS tiene_ultimo,
        u.valor_ultimo,
        u.fecha_ultimo,
        u.estado_ultimo
    FROM primeros p
    LEFT JOIN ultimos u ON p.ID_ATENCION = u.ID_ATENCION
                        AND p.prueba = u.prueba
);

-- =====================================================
-- PASO 5: Validar estructura del JSON generado
-- =====================================================
PROMPT
PROMPT ==========================================
PROMPT PASO 5: Validando estructura JSON...
PROMPT ==========================================

-- Validar que el JSON es válido usando JSON_TABLE
WITH json_data AS (
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
    ) AS json_result
    FROM (
        WITH datos_pruebas AS (
            SELECT
                e.ID_ATENCION,
                r.NOMBRE_PRUEBA_LIS AS prueba,
                r.UNIDAD_MEDIDA AS unidad,
                TO_NUMBER(REPLACE(r.VALOR_RESULTADO, ',', '.')) AS valor_numerico,
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
                AND r.VALOR_RESULTADO != '-'
                AND r.IND_RANGO_RESULTADO IS NOT NULL
                AND REGEXP_LIKE(r.VALOR_RESULTADO, '^[0-9]+([.,][0-9]+)?$')
                -- Descomentar según tus datos:
                -- AND e.ID_ATENCION = 1416169
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
        )
        SELECT
            p.prueba,
            p.unidad,
            p.valor_ingreso,
            p.fecha_ingreso,
            p.estado_ingreso,
            CASE WHEN u.valor_ultimo != p.valor_ingreso THEN 'SI' ELSE 'NO' END AS tiene_ultimo,
            u.valor_ultimo,
            u.fecha_ultimo,
            u.estado_ultimo
        FROM primeros p
        LEFT JOIN ultimos u ON p.ID_ATENCION = u.ID_ATENCION
                            AND p.prueba = u.prueba
    )
)
SELECT
    'Total de pruebas en JSON: ' || COUNT(*) AS validacion
FROM json_data,
     JSON_TABLE(json_result, '$.laboratorios_resumen[*]'
        COLUMNS (
            prueba VARCHAR2(200) PATH '$.prueba',
            unidad VARCHAR2(50) PATH '$.unidad',
            valor_ingreso NUMBER PATH '$.ingreso.valor',
            fecha_ingreso VARCHAR2(50) PATH '$.ingreso.fecha',
            estado_ingreso VARCHAR2(50) PATH '$.ingreso.estado'
        )
     );

PROMPT
PROMPT ==========================================
PROMPT VALIDACIÓN COMPLETADA
PROMPT ==========================================
PROMPT
PROMPT Si todos los pasos fueron exitosos, la consulta está lista para usar.
PROMPT Para filtrar por un ID_ATENCION específico, descomenta la línea:
PROMPT -- AND e.ID_ATENCION = 1416169
PROMPT
