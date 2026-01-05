#!/bin/bash

# =====================================================
# Ejecuta la consulta completa y genera el JSON
# =====================================================

CONTAINER_NAME="oracle19c"
OUTPUT_FILE="laboratorios_resultado.json"

echo "=========================================="
echo "Generando JSON completo de laboratorios"
echo "=========================================="
echo ""

# Verificar contenedor
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "ERROR: Contenedor no está corriendo"
    exit 1
fi

# Ejecutar consulta y guardar resultado
echo "Ejecutando consulta..."
docker exec -i $CONTAINER_NAME bash << 'BASH_SCRIPT' > "$OUTPUT_FILE"
export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH

$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << 'SQL_SCRIPT'

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
    ORDER BY p.prueba
);

EXIT;
SQL_SCRIPT

BASH_SCRIPT

# Verificar que se generó el archivo
if [ -f "$OUTPUT_FILE" ]; then
    # Limpiar salida de Oracle (remover espacios y líneas vacías al inicio/fin)
    sed -i.bak '/^[[:space:]]*$/d' "$OUTPUT_FILE" 2>/dev/null || \
    sed -i '' '/^[[:space:]]*$/d' "$OUTPUT_FILE" 2>/dev/null

    FILE_SIZE=$(wc -c < "$OUTPUT_FILE" | tr -d ' ')
    echo "✓ JSON generado exitosamente"
    echo ""
    echo "Archivo: $OUTPUT_FILE"
    echo "Tamaño: $FILE_SIZE bytes"
    echo ""

    # Validar JSON con jq si está disponible
    if command -v jq &> /dev/null; then
        echo "Validando JSON con jq..."
        if jq empty "$OUTPUT_FILE" 2>/dev/null; then
            echo "✓ JSON válido"
            echo ""
            echo "Resumen del contenido:"
            jq '{
                total_pruebas: (.laboratorios_resumen | length),
                primera_prueba: .laboratorios_resumen[0].prueba,
                ultima_prueba: .laboratorios_resumen[-1].prueba
            }' "$OUTPUT_FILE"
        else
            echo "⚠ Advertencia: El JSON podría tener problemas de formato"
        fi
    else
        echo "Tip: Instala 'jq' para validar y formatear el JSON"
        echo "  brew install jq  (en macOS)"
    fi

    echo ""
    echo "Para ver el contenido formateado:"
    echo "  cat $OUTPUT_FILE | jq ."
    echo ""
    echo "Para ver solo los nombres de las pruebas:"
    echo "  cat $OUTPUT_FILE | jq '.laboratorios_resumen[].prueba'"
else
    echo "ERROR: No se pudo generar el archivo JSON"
    exit 1
fi

echo ""
echo "=========================================="
echo "Generación completada"
echo "=========================================="
