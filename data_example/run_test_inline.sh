#!/bin/bash

# =====================================================
# Script que ejecuta la validación SIN archivos externos
# Todo el SQL está embebido en el script
# =====================================================

CONTAINER_NAME="oracle19c"

echo "=========================================="
echo "Validación JSON - Oracle 19c (Inline)"
echo "=========================================="
echo ""

# Verificar contenedor
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "ERROR: Contenedor no está corriendo"
    exit 1
fi
echo "✓ Contenedor activo"
echo ""

# Ejecutar SQL directamente desde el script
docker exec -i $CONTAINER_NAME bash << 'BASH_SCRIPT'
export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH

$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << 'SQL_SCRIPT'

SET SERVEROUTPUT ON SIZE UNLIMITED;
SET LINESIZE 32767;
SET PAGESIZE 0;
SET LONG 1000000;
SET LONGCHUNKSIZE 1000000;
SET TRIMSPOOL ON;
SET TRIM ON;
SET FEEDBACK OFF;
SET VERIFY OFF;

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

PROMPT
PROMPT ==========================================
PROMPT PASO 3: Verificando funciones JSON...
PROMPT ==========================================

SELECT
    JSON_OBJECT('test' VALUE 'ok', 'version' VALUE 'Oracle 19c') AS test_json_object
FROM DUAL;

SELECT
    JSON_ARRAYAGG(level ORDER BY level) AS test_json_arrayagg
FROM DUAL
CONNECT BY level <= 3;

PROMPT
PROMPT ==========================================
PROMPT PASO 4: Ejecutando VERSIÓN 1 (muestra limitada)...
PROMPT ==========================================
PROMPT (Mostrando primera prueba como ejemplo)
PROMPT

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
            AND ROWNUM <= 100
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
    WHERE ROWNUM <= 1
);

PROMPT
PROMPT ==========================================
PROMPT PASO 5: Contando registros que se procesarían...
PROMPT ==========================================

WITH datos_pruebas AS (
    SELECT
        e.ID_ATENCION,
        r.NOMBRE_PRUEBA_LIS AS prueba,
        ROW_NUMBER() OVER (
            PARTITION BY e.ID_ATENCION, r.NOMBRE_PRUEBA_LIS
            ORDER BY r.FECHA_INTEGRACION ASC
        ) AS rn_primero
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
)
SELECT
    'Total de pruebas únicas que se procesarían: ' || COUNT(*) AS resumen
FROM datos_pruebas
WHERE rn_primero = 1;

PROMPT
PROMPT ==========================================
PROMPT VALIDACIÓN COMPLETADA
PROMPT ==========================================
PROMPT
PROMPT ✓ Si viste JSON generado arriba, la consulta funciona correctamente
PROMPT
PROMPT Para ejecutar la consulta completa sin límites:
PROMPT   - Edita test_version1_json.sql
PROMPT   - O usa SQL Developer/DBeaver
PROMPT

EXIT;
SQL_SCRIPT

BASH_SCRIPT

echo ""
echo "=========================================="
echo "Ejecución completada"
echo "=========================================="
