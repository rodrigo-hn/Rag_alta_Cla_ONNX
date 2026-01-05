#!/bin/bash

# =====================================================
# Script para ejecutar validación de consulta JSON
# en Oracle 19c Docker
# =====================================================

# Configuración
CONTAINER_NAME="oracle19c"
ORACLE_USER="SYSTEM"
ORACLE_PWD="Oracle123"
ORACLE_SID="ORCLPDB1"

echo "=========================================="
echo "Validación de Consulta JSON - Oracle 19c"
echo "=========================================="
echo ""

# Verificar que el contenedor está corriendo
echo "Verificando contenedor Docker..."
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "ERROR: El contenedor $CONTAINER_NAME no está corriendo."
    echo "Inicia el contenedor con:"
    echo "docker start $CONTAINER_NAME"
    exit 1
fi
echo "✓ Contenedor $CONTAINER_NAME está activo"
echo ""

# Copiar el archivo SQL al contenedor
echo "Copiando script de validación al contenedor..."
docker cp test_version1_json.sql $CONTAINER_NAME:/tmp/test_version1_json.sql
if [ $? -eq 0 ]; then
    echo "✓ Script copiado exitosamente"
else
    echo "ERROR: No se pudo copiar el script"
    exit 1
fi
echo ""

# Verificar que el archivo existe en el contenedor
echo "Verificando archivo en contenedor..."
docker exec $CONTAINER_NAME ls -lh /tmp/test_version1_json.sql
if [ $? -ne 0 ]; then
    echo "ERROR: El archivo no existe en el contenedor"
    exit 1
fi
echo "✓ Archivo encontrado"
echo ""

# Ejecutar el script SQL
echo "Ejecutando validación..."
echo "=========================================="
docker exec -i $CONTAINER_NAME bash -c "
    cd /tmp
    sqlplus -S $ORACLE_USER/$ORACLE_PWD@$ORACLE_SID <<EOF
@test_version1_json.sql
exit;
EOF
"

echo ""
echo "=========================================="
echo "Validación completada"
echo "=========================================="
