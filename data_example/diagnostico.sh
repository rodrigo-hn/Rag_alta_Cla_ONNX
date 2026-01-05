#!/bin/bash

# =====================================================
# Script de diagnóstico para Oracle 19c Docker
# =====================================================

CONTAINER_NAME="oracle19c"

echo "=========================================="
echo "DIAGNÓSTICO DE ORACLE 19C"
echo "=========================================="
echo ""

# 1. Verificar contenedor
echo "1. Verificando contenedor..."
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "   ✓ Contenedor está corriendo"
else
    echo "   ✗ Contenedor NO está corriendo"
    exit 1
fi
echo ""

# 2. Verificar puertos
echo "2. Verificando puertos..."
docker port $CONTAINER_NAME
echo ""

# 3. Verificar procesos Oracle
echo "3. Verificando procesos Oracle..."
PROC_COUNT=$(docker exec $CONTAINER_NAME ps aux | grep -c "ora_")
echo "   Procesos Oracle encontrados: $PROC_COUNT"
echo ""

# 4. Test de conexión básica
echo "4. Testeando conexión a Oracle..."
docker exec -i $CONTAINER_NAME bash << 'EOF'
export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH
$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << SQL
SET PAGESIZE 0
SET FEEDBACK OFF
SELECT 'CONEXIÓN OK' FROM DUAL;
EXIT;
SQL
EOF
echo ""

# 5. Verificar versión
echo "5. Verificando versión de Oracle..."
docker exec -i $CONTAINER_NAME bash << 'EOF'
export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH
$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << SQL
SET PAGESIZE 0
SET FEEDBACK OFF
SELECT banner FROM v\$version WHERE ROWNUM = 1;
EXIT;
SQL
EOF
echo ""

# 6. Verificar tablas
echo "6. Verificando tablas TAB_EXAMENES y TAB_RESULTADOS..."
docker exec -i $CONTAINER_NAME bash << 'EOF'
export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH
$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << SQL
SET PAGESIZE 0
SET FEEDBACK OFF
SET HEADING OFF
SELECT 'Tabla: ' || table_name || ' - Registros: ' || num_rows
FROM user_tables
WHERE table_name IN ('TAB_EXAMENES', 'TAB_RESULTADOS')
ORDER BY table_name;
EXIT;
SQL
EOF
echo ""

# 7. Test de funciones JSON
echo "7. Testeando funciones JSON..."
docker exec -i $CONTAINER_NAME bash << 'EOF'
export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH
$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << SQL
SET PAGESIZE 0
SET FEEDBACK OFF
SELECT JSON_OBJECT('test' VALUE 'ok', 'funciones_json' VALUE 'disponibles') FROM DUAL;
EXIT;
SQL
EOF
echo ""

# 8. Verificar ORACLE_HOME en contenedor
echo "8. Verificando ORACLE_HOME en contenedor..."
docker exec $CONTAINER_NAME ls -la /opt/oracle/product/19c/dbhome_1/bin/sqlplus 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✓ SQLPlus encontrado"
else
    echo "   ✗ SQLPlus NO encontrado en ruta esperada"
fi
echo ""

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="
echo ""
echo "Si todos los tests pasaron, ejecuta:"
echo "  ./run_test_oracle.sh"
echo ""
echo "O usa el método manual descrito en INSTRUCCIONES_EJECUCION.md"
