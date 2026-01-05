-- =====================================================
-- GENERAR JSON - VERSIÓN FINAL CORREGIDA
-- Soluciona el error ORA-01722
-- =====================================================

SET LINESIZE 32767;
SET LONG 1000000;
SET LONGCHUNKSIZE 1000000;
SET PAGESIZE 0;
SET FEEDBACK OFF;
SET VERIFY OFF;
SET TRIMSPOOL ON;
SET TRIM ON;
SET HEADING OFF;

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
        ) ORDER BY prueba
    )
) AS json_resultado
FROM (
    WITH datos_pruebas AS (
        SELECT
            e.ID_ATENCION,
            r.NOMBRE_PRUEBA_LIS AS prueba,
            r.UNIDAD_MEDIDA AS unidad,
            -- Conversión segura: solo convierte si es válido
            CASE
                WHEN REGEXP_LIKE(TRIM(r.VALOR_RESULTADO), '^[0-9]+([.,][0-9]+)?$')
                    AND NOT REGEXP_LIKE(TRIM(r.VALOR_RESULTADO), '[A-Za-z<>]')
                THEN TO_NUMBER(REPLACE(TRIM(r.VALOR_RESULTADO), ',', '.'))
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
        FROM TAB_EXAMENES e
        INNER JOIN TAB_RESULTADOS r
            ON e.ID_ATENCION = r.ID_ATENCION
            AND e.CODIGO_EXAMEN = r.COD_PRESTACION
        WHERE r.VALOR_RESULTADO IS NOT NULL
            AND TRIM(r.VALOR_RESULTADO) != '-'
            AND r.IND_RANGO_RESULTADO IS NOT NULL
            -- Filtros opcionales:
            -- AND e.ID_ATENCION = 1416169
    ),
    datos_validos AS (
        SELECT *
        FROM datos_pruebas
        WHERE valor_numerico IS NOT NULL
    ),
    primeros AS (
        SELECT
            ID_ATENCION, prueba, unidad,
            valor_numerico AS valor_ingreso,
            FECHA_INTEGRACION AS fecha_ingreso,
            estado AS estado_ingreso
        FROM datos_validos
        WHERE rn_primero = 1
    ),
    ultimos AS (
        SELECT
            ID_ATENCION, prueba,
            valor_numerico AS valor_ultimo,
            FECHA_INTEGRACION AS fecha_ultimo,
            estado AS estado_ultimo
        FROM datos_validos
        WHERE rn_ultimo = 1
    )
    SELECT
        p.prueba,
        p.unidad,
        p.valor_ingreso,
        p.fecha_ingreso,
        p.estado_ingreso,
        CASE
            WHEN u.valor_ultimo IS NOT NULL
                AND ABS(u.valor_ultimo - p.valor_ingreso) > 0.001
            THEN 'SI'
            ELSE 'NO'
        END AS tiene_ultimo,
        u.valor_ultimo,
        u.fecha_ultimo,
        u.estado_ultimo
    FROM primeros p
    LEFT JOIN ultimos u
        ON p.ID_ATENCION = u.ID_ATENCION
        AND p.prueba = u.prueba
);
