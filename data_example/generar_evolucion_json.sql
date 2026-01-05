-- =====================================================
-- GENERAR JSON DE EVOLUCIONES
-- Formato: {"evolucion_resumen": [{"dia": 1, "texto": "..."}]}
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
    'evolucion_resumen' VALUE
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'dia' VALUE dia,
            'texto' VALUE texto
            RETURNING CLOB
        ) ORDER BY dia
        RETURNING CLOB
    )
    RETURNING CLOB
) AS json_resultado
FROM (
    WITH fecha_base AS (
        -- Obtener la fecha minima como dia 1
        SELECT TRUNC(MIN(FECHA)) AS fecha_inicio
        FROM TAB_EVOLUCION
    ),
    evoluciones_dia AS (
        SELECT
            -- Calcular el dia relativo (1, 2, 3, ...)
            TRUNC(e.FECHA) - fb.fecha_inicio + 1 AS dia,
            e.FECHA,
            e.DESCRIPCION,
            e.ID_USUARIO,
            -- Ordenar por fecha dentro de cada dia
            ROW_NUMBER() OVER (
                PARTITION BY TRUNC(e.FECHA) - fb.fecha_inicio + 1
                ORDER BY e.FECHA ASC
            ) AS orden_dia
        FROM TAB_EVOLUCION e
        CROSS JOIN fecha_base fb
    ),
    texto_por_dia AS (
        -- Concatenar todas las evoluciones del mismo dia usando XMLAGG para CLOB
        SELECT
            dia,
            RTRIM(
                XMLAGG(
                    XMLELEMENT(e,
                        -- Limpiar el texto
                        REGEXP_REPLACE(
                            REGEXP_REPLACE(
                                DESCRIPCION,
                                CHR(10) || '+', ' '           -- Reemplazar saltos de linea
                            ),
                            ' +', ' '                         -- Eliminar espacios multiples
                        ) || ' | '
                    ) ORDER BY FECHA
                ).GETCLOBVAL(),
                ' | '
            ) AS texto_concatenado
        FROM evoluciones_dia
        GROUP BY dia
    )
    SELECT
        dia,
        -- Eliminar tags XML residuales y limpiar separador final
        RTRIM(
            REGEXP_REPLACE(
                REGEXP_REPLACE(texto_concatenado, '<[^>]+>', ''),
                ' +', ' '
            ),
            ' |'
        ) AS texto
    FROM texto_por_dia
    ORDER BY dia
);
