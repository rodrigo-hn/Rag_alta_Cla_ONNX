-- =====================================================
-- VERIFICACIÓN RÁPIDA - Oracle 19c
-- =====================================================
SET SERVEROUTPUT ON;
SET LINESIZE 200;

PROMPT ==========================================
PROMPT VERIFICACIÓN DE VERSIÓN Y FUNCIONES
PROMPT ==========================================

-- Versión de Oracle
SELECT banner FROM v$version WHERE banner LIKE 'Oracle%';

PROMPT
PROMPT ==========================================
PROMPT TEST DE FUNCIONES JSON
PROMPT ==========================================

-- Test 1: JSON_OBJECT básico
SELECT 'Test JSON_OBJECT: ' || JSON_OBJECT('key' VALUE 'value') AS test1 FROM DUAL;

-- Test 2: JSON_ARRAYAGG
SELECT 'Test JSON_ARRAYAGG: ' || JSON_ARRAYAGG(level) AS test2
FROM DUAL CONNECT BY level <= 3;

-- Test 3: JSON_OBJECT con ABSENT ON NULL
SELECT 'Test ABSENT ON NULL: ' ||
    JSON_OBJECT(
        'campo1' VALUE 'valor1',
        'campo_null' VALUE NULL
        ABSENT ON NULL
    ) AS test3
FROM DUAL;

-- Test 4: Combinación completa
SELECT
    JSON_OBJECT(
        'array' VALUE JSON_ARRAYAGG(
            JSON_OBJECT(
                'id' VALUE level,
                'valor' VALUE level * 10
            )
        )
    ) AS test4
FROM DUAL
CONNECT BY level <= 2;

PROMPT
PROMPT ==========================================
PROMPT ✓ Si todos los tests anteriores funcionaron,
PROMPT   Oracle 19c soporta la VERSIÓN 1 correctamente
PROMPT ==========================================
