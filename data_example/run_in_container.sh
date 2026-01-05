#!/bin/bash

# =====================================================
# Ejecuta la validación directamente dentro del contenedor
# =====================================================

CONTAINER_NAME="oracle19c"

echo "=========================================="
echo "Ejecutando dentro del contenedor..."
echo "=========================================="

# Verificar contenedor
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "ERROR: Contenedor no está corriendo"
    exit 1
fi

# Copiar el archivo
docker cp test_version1_json.sql $CONTAINER_NAME:/opt/oracle/

# Ejecutar dentro del contenedor con variables de entorno correctas
docker exec -i $CONTAINER_NAME bash << 'BASH_EOF'
#!/bin/bash

# Establecer variables de entorno de Oracle
export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH
export ORACLE_SID=ORCLCDB

echo "Conectando a Oracle..."

# Ejecutar SQL
cd /opt/oracle
$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 @test_version1_json.sql

BASH_EOF

echo ""
echo "=========================================="
echo "Completado"
echo "=========================================="
