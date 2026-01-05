-- =====================================================
-- GENERAR JSON LABORATORIOS RESUMEN v2
-- Formato con id_atencion, rangos y periodo (min/max)
-- =====================================================

SET LINESIZE 32767;
SET LONG 2000000;
SET LONGCHUNKSIZE 2000000;
SET PAGESIZE 0;
SET FEEDBACK OFF;
SET VERIFY OFF;
SET TRIMSPOOL ON;
SET TRIM ON;
SET HEADING OFF;
SET NEWPAGE NONE;

SELECT JSON_OBJECT(
    'id_atencion' VALUE id_atencion,
    'laboratorios_resumen' VALUE
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'prueba' VALUE prueba,
            'unidad' VALUE unidad,
            'ingreso' VALUE JSON_OBJECT(
                'valor' VALUE valor_ingreso,
                'fecha' VALUE TO_CHAR(fecha_ingreso, 'YYYY-MM-DD"T"HH24:MI:SS'),
                'rango_inferior' VALUE rango_inferior_ingreso,
                'rango_superior' VALUE rango_superior_ingreso,
                'estado' VALUE estado_ingreso
                RETURNING CLOB
            ),
            'ultimo' VALUE CASE
                WHEN tiene_ultimo = 'SI' THEN JSON_OBJECT(
                    'valor' VALUE valor_ultimo,
                    'fecha' VALUE TO_CHAR(fecha_ultimo, 'YYYY-MM-DD"T"HH24:MI:SS'),
                    'rango_inferior' VALUE rango_inferior_ultimo,
                    'rango_superior' VALUE rango_superior_ultimo,
                    'estado' VALUE estado_ultimo
                    RETURNING CLOB
                )
                ELSE NULL
            END,
            'periodo' VALUE JSON_OBJECT(
                'min' VALUE valor_min,
                'max' VALUE valor_max
                RETURNING CLOB
            )
            ABSENT ON NULL
            RETURNING CLOB
        ) ORDER BY prueba
        RETURNING CLOB
    )
    RETURNING CLOB
) AS json_resultado
FROM (
    WITH datos_pruebas AS (
        SELECT
            e.ID_ATENCION,
            r.NOMBRE_PRUEBA_LIS AS prueba,
            r.UNIDAD_MEDIDA AS unidad,
            -- Conversion segura de valores
            TO_NUMBER(
                REPLACE(TRIM(r.VALOR_RESULTADO), ',', '.')
                DEFAULT NULL ON CONVERSION ERROR
            ) AS valor_numerico,
            -- Conversion segura de rangos
            TO_NUMBER(
                REPLACE(TRIM(r.RANGO_INFERIOR), ',', '.')
                DEFAULT NULL ON CONVERSION ERROR
            ) AS rango_inferior,
            TO_NUMBER(
                REPLACE(TRIM(r.RANGO_SUPERIOR), ',', '.')
                DEFAULT NULL ON CONVERSION ERROR
            ) AS rango_superior,
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
    ),
    datos_validos AS (
        SELECT *
        FROM datos_pruebas
        WHERE valor_numerico IS NOT NULL
    ),
    -- Primer resultado (ingreso)
    primeros AS (
        SELECT
            ID_ATENCION, prueba, unidad,
            valor_numerico AS valor_ingreso,
            FECHA_INTEGRACION AS fecha_ingreso,
            rango_inferior AS rango_inferior_ingreso,
            rango_superior AS rango_superior_ingreso,
            estado AS estado_ingreso
        FROM datos_validos
        WHERE rn_primero = 1
    ),
    -- Ultimo resultado
    ultimos AS (
        SELECT
            ID_ATENCION, prueba,
            valor_numerico AS valor_ultimo,
            FECHA_INTEGRACION AS fecha_ultimo,
            rango_inferior AS rango_inferior_ultimo,
            rango_superior AS rango_superior_ultimo,
            estado AS estado_ultimo
        FROM datos_validos
        WHERE rn_ultimo = 1
    ),
    -- Estadisticas del periodo (min/max)
    estadisticas AS (
        SELECT
            ID_ATENCION, prueba,
            MIN(valor_numerico) AS valor_min,
            MAX(valor_numerico) AS valor_max
        FROM datos_validos
        GROUP BY ID_ATENCION, prueba
    )
    SELECT
        p.ID_ATENCION AS id_atencion,
        p.prueba,
        p.unidad,
        p.valor_ingreso,
        p.fecha_ingreso,
        p.rango_inferior_ingreso,
        p.rango_superior_ingreso,
        p.estado_ingreso,
        CASE
            WHEN u.valor_ultimo IS NOT NULL
                AND ABS(u.valor_ultimo - p.valor_ingreso) > 0.001
            THEN 'SI'
            ELSE 'NO'
        END AS tiene_ultimo,
        u.valor_ultimo,
        u.fecha_ultimo,
        u.rango_inferior_ultimo,
        u.rango_superior_ultimo,
        u.estado_ultimo,
        e.valor_min,
        e.valor_max
    FROM primeros p
    LEFT JOIN ultimos u
        ON p.ID_ATENCION = u.ID_ATENCION
        AND p.prueba = u.prueba
    LEFT JOIN estadisticas e
        ON p.ID_ATENCION = e.ID_ATENCION
        AND p.prueba = e.prueba
)
GROUP BY id_atencion;
