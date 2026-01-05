-- =====================================================
-- CONSULTA PARA GENERAR JSON DE RESUMEN DE LABORATORIOS
-- Muestra primer resultado (ingreso) y último resultado por prueba
-- =====================================================

-- VERSIÓN 1: Con JSON_OBJECT y JSON_ARRAYAGG (Oracle 12c+)
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
            -- Filtrar por ID_ATENCION específico si es necesario
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
-- VERSIÓN 2: Construcción manual de JSON (Compatible con Oracle 11g+)
-- =====================================================
SELECT 
    '{"laboratorios_resumen": [' || 
    LISTAGG(
        '{'||
        '"prueba": "' || prueba || '",' ||
        '"unidad": "' || unidad || '",' ||
        '"ingreso": {' ||
            '"valor": ' || valor_ingreso || ',' ||
            '"fecha": "' || TO_CHAR(fecha_ingreso, 'YYYY-MM-DD"T"HH24:MI:SS') || '",' ||
            '"estado": "' || estado_ingreso || '"' ||
        '}' ||
        CASE WHEN tiene_ultimo = 'SI' THEN
            ',"ultimo": {' ||
                '"valor": ' || valor_ultimo || ',' ||
                '"fecha": "' || TO_CHAR(fecha_ultimo, 'YYYY-MM-DD"T"HH24:MI:SS') || '",' ||
                '"estado": "' || estado_ultimo || '"' ||
            '}'
        ELSE '' END ||
        '}',
        ','
    ) WITHIN GROUP (ORDER BY prueba) ||
    ']}' AS json_resultado
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
            AND e.ID_ATENCION = 1416169  -- Cambiar por el ID necesario
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
-- VERSIÓN 3: Consulta SQL simple para ver los datos (sin JSON)
-- Útil para validar antes de generar el JSON
-- =====================================================
WITH datos_pruebas AS (
    SELECT 
        e.ID_ATENCION,
        r.NOMBRE_PRUEBA_LIS AS prueba,
        r.UNIDAD_MEDIDA AS unidad,
        TO_NUMBER(REPLACE(r.VALOR_RESULTADO, ',', '.')) AS valor_numerico,
        r.FECHA_INTEGRACION,
        CASE 
            WHEN r.IND_RANGO_RESULTADO = 'N' THEN 'normal'
            WHEN r.IND_RANGO_RESULTADO = 'H' THEN 'alto'
            WHEN r.IND_RANGO_RESULTADO = 'L' THEN 'bajo'
            ELSE 'sin_clasificar'
        END AS estado,
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
        AND e.ID_ATENCION = 1416169  -- Cambiar por el ID necesario
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
    TO_CHAR(p.fecha_ingreso, 'YYYY-MM-DD HH24:MI:SS') AS fecha_ingreso,
    p.estado_ingreso,
    u.valor_ultimo,
    TO_CHAR(u.fecha_ultimo, 'YYYY-MM-DD HH24:MI:SS') AS fecha_ultimo,
    u.estado_ultimo,
    CASE 
        WHEN u.valor_ultimo IS NULL THEN 'Solo un registro'
        WHEN u.valor_ultimo > p.valor_ingreso THEN '↑ Subió'
        WHEN u.valor_ultimo < p.valor_ingreso THEN '↓ Bajó'
        ELSE '= Igual'
    END AS tendencia
FROM primeros p
LEFT JOIN ultimos u ON p.ID_ATENCION = u.ID_ATENCION 
                    AND p.prueba = u.prueba
ORDER BY p.prueba;


-- =====================================================
-- VERSIÓN 4: PL/SQL para generar JSON con CLOB (Grandes volúmenes)
-- =====================================================
DECLARE
    v_json CLOB;
    v_first BOOLEAN := TRUE;
    
    CURSOR c_pruebas IS
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
                AND e.ID_ATENCION = 1416169
        ),
        primeros AS (
            SELECT * FROM datos_pruebas WHERE rn_primero = 1
        ),
        ultimos AS (
            SELECT * FROM datos_pruebas WHERE rn_ultimo = 1
        )
        SELECT 
            p.prueba,
            p.unidad,
            p.valor_numerico AS valor_ingreso,
            p.FECHA_INTEGRACION AS fecha_ingreso,
            p.estado AS estado_ingreso,
            u.valor_numerico AS valor_ultimo,
            u.FECHA_INTEGRACION AS fecha_ultimo,
            u.estado AS estado_ultimo
        FROM primeros p
        LEFT JOIN ultimos u ON p.ID_ATENCION = u.ID_ATENCION 
                            AND p.prueba = u.prueba;
BEGIN
    DBMS_LOB.CREATETEMPORARY(v_json, TRUE);
    DBMS_LOB.APPEND(v_json, '{"laboratorios_resumen": [');
    
    FOR rec IN c_pruebas LOOP
        IF NOT v_first THEN
            DBMS_LOB.APPEND(v_json, ',');
        END IF;
        
        DBMS_LOB.APPEND(v_json, '{');
        DBMS_LOB.APPEND(v_json, '"prueba": "' || rec.prueba || '",');
        DBMS_LOB.APPEND(v_json, '"unidad": "' || rec.unidad || '",');
        DBMS_LOB.APPEND(v_json, '"ingreso": {');
        DBMS_LOB.APPEND(v_json, '"valor": ' || rec.valor_ingreso || ',');
        DBMS_LOB.APPEND(v_json, '"fecha": "' || TO_CHAR(rec.fecha_ingreso, 'YYYY-MM-DD"T"HH24:MI:SS') || '",');
        DBMS_LOB.APPEND(v_json, '"estado": "' || rec.estado_ingreso || '"');
        DBMS_LOB.APPEND(v_json, '}');
        
        IF rec.valor_ultimo IS NOT NULL AND rec.valor_ultimo != rec.valor_ingreso THEN
            DBMS_LOB.APPEND(v_json, ',"ultimo": {');
            DBMS_LOB.APPEND(v_json, '"valor": ' || rec.valor_ultimo || ',');
            DBMS_LOB.APPEND(v_json, '"fecha": "' || TO_CHAR(rec.fecha_ultimo, 'YYYY-MM-DD"T"HH24:MI:SS') || '",');
            DBMS_LOB.APPEND(v_json, '"estado": "' || rec.estado_ultimo || '"');
            DBMS_LOB.APPEND(v_json, '}');
        END IF;
        
        DBMS_LOB.APPEND(v_json, '}');
        v_first := FALSE;
    END LOOP;
    
    DBMS_LOB.APPEND(v_json, ']}');
    
    DBMS_OUTPUT.PUT_LINE(v_json);
    
    DBMS_LOB.FREETEMPORARY(v_json);
END;
/