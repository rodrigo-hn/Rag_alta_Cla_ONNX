#!/bin/bash

# =====================================================
# Script simplificado para ejecutar validación
# =====================================================

CONTAINER_NAME="oracle19c"

echo "=========================================="
echo "Validación Simple - Oracle 19c"
echo "=========================================="

# Verificar contenedor
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "ERROR: El contenedor $CONTAINER_NAME no está corriendo."
    exit 1
fi

# Copiar archivo
echo "Copiando script..."
docker cp test_version1_json.sql $CONTAINER_NAME:/tmp/

# Ejecutar directamente con HERE-DOC
echo "Ejecutando validación..."
echo "=========================================="
docker exec -i $CONTAINER_NAME sqlplus -S SYSTEM/Oracle123@ORCLPDB1 < test_version1_json.sql

echo ""
echo "=========================================="
echo "Completado"
echo "=========================================="
