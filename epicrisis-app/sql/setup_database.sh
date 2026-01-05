#!/bin/bash

###############################################################################
# Script maestro para configurar la base de datos Oracle
# Sistema Epicrisis Automática
###############################################################################

set -e  # Salir si hay error

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  CONFIGURACIÓN DE BASE DE DATOS ORACLE${NC}"
echo -e "${BLUE}  Sistema Epicrisis Automática${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Leer credenciales desde .env si existe
if [ -f "../backend/.env" ]; then
    echo -e "${GREEN}✓ Leyendo credenciales desde backend/.env${NC}"
    DB_USER=$(grep DB_USER ../backend/.env | cut -d '=' -f2)
    DB_PASSWORD=$(grep DB_PASSWORD ../backend/.env | cut -d '=' -f2)
    DB_CONNECT_STRING=$(grep DB_CONNECT_STRING ../backend/.env | cut -d '=' -f2)
else
    echo -e "${YELLOW}⚠ No se encontró backend/.env${NC}"
    echo ""
    read -p "Usuario Oracle: " DB_USER
    read -sp "Password Oracle: " DB_PASSWORD
    echo ""
    read -p "Connect String (ej: localhost:1521/ORCLPDB1): " DB_CONNECT_STRING
fi

# Construir string de conexión
CONN_STRING="${DB_USER}/${DB_PASSWORD}@${DB_CONNECT_STRING}"

echo ""
echo -e "${BLUE}Conectando a: ${DB_CONNECT_STRING}${NC}"
echo ""

# Verificar conexión
echo -e "${YELLOW}Verificando conexión a Oracle...${NC}"
if ! sqlplus -S "${CONN_STRING}" <<EOF > /dev/null 2>&1
SELECT 1 FROM DUAL;
EXIT;
EOF
then
    echo -e "${RED}✗ Error: No se pudo conectar a Oracle${NC}"
    echo -e "${YELLOW}Verifica las credenciales y que el servicio Oracle esté corriendo${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Conexión exitosa${NC}"
echo ""

# Menú de opciones
echo "Selecciona qué instalar:"
echo ""
echo "  1. Instalación COMPLETA (tablas + datos + índices + función)"
echo "  2. Solo TABLAS BASE (sin datos de ejemplo)"
echo "  3. Solo DATOS DE EJEMPLO (requiere tablas creadas)"
echo "  4. Solo ÍNDICES"
echo "  5. Solo FUNCIÓN get_discharge_summary_json"
echo "  6. Solo VISTAS MATERIALIZADAS (opcional)"
echo "  7. Solo PARTICIONAMIENTO (opcional, BD grande)"
echo "  8. PERSONALIZADO (elegir componentes)"
echo ""
read -p "Opción: " OPCION

case $OPCION in
  1)
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}INSTALACIÓN COMPLETA${NC}"
    echo -e "${BLUE}============================================================${NC}"

    echo -e "${YELLOW}1/4 Creando tablas base...${NC}"
    sqlplus -S "${CONN_STRING}" @tables/01_create_base_tables.sql

    echo -e "${YELLOW}2/4 Insertando datos de ejemplo...${NC}"
    sqlplus -S "${CONN_STRING}" @tables/02_insert_sample_data.sql

    echo -e "${YELLOW}3/4 Creando índices...${NC}"
    sqlplus -S "${CONN_STRING}" @indexes/create_indexes.sql

    echo -e "${YELLOW}4/4 Creando función get_discharge_summary_json...${NC}"
    sqlplus -S "${CONN_STRING}" @functions/get_discharge_summary_json.sql

    echo ""
    echo -e "${GREEN}✓ Instalación completa finalizada${NC}"
    ;;

  2)
    echo -e "${YELLOW}Creando tablas base...${NC}"
    sqlplus -S "${CONN_STRING}" @tables/01_create_base_tables.sql
    echo -e "${GREEN}✓ Tablas creadas${NC}"
    ;;

  3)
    echo -e "${YELLOW}Insertando datos de ejemplo...${NC}"
    sqlplus -S "${CONN_STRING}" @tables/02_insert_sample_data.sql
    echo -e "${GREEN}✓ Datos insertados${NC}"
    ;;

  4)
    echo -e "${YELLOW}Creando índices...${NC}"
    sqlplus -S "${CONN_STRING}" @indexes/create_indexes.sql
    echo -e "${GREEN}✓ Índices creados${NC}"
    ;;

  5)
    echo -e "${YELLOW}Creando función get_discharge_summary_json...${NC}"
    sqlplus -S "${CONN_STRING}" @functions/get_discharge_summary_json.sql
    echo -e "${GREEN}✓ Función creada${NC}"
    ;;

  6)
    echo -e "${YELLOW}Creando vistas materializadas...${NC}"
    sqlplus -S "${CONN_STRING}" @materialized_views/create_mv_episodios.sql
    echo -e "${GREEN}✓ Vistas materializadas creadas${NC}"
    ;;

  7)
    echo -e "${RED}⚠ ADVERTENCIA: El particionamiento recrea tablas${NC}"
    echo -e "${YELLOW}Solo usar en BD nueva o con backup${NC}"
    read -p "¿Continuar? (s/n): " CONFIRMAR

    if [ "$CONFIRMAR" = "s" ] || [ "$CONFIRMAR" = "S" ]; then
        echo -e "${YELLOW}Aplicando particionamiento...${NC}"
        sqlplus -S "${CONN_STRING}" @partitions/create_partitions.sql
        echo -e "${GREEN}✓ Particionamiento aplicado${NC}"
    else
        echo -e "${YELLOW}Particionamiento cancelado${NC}"
    fi
    ;;

  8)
    echo ""
    echo "Selecciona componentes a instalar:"
    echo ""
    read -p "¿Crear tablas base? (s/n): " CREATE_TABLES
    read -p "¿Insertar datos de ejemplo? (s/n): " INSERT_DATA
    read -p "¿Crear índices? (s/n): " CREATE_INDEXES
    read -p "¿Crear función? (s/n): " CREATE_FUNCTION
    read -p "¿Crear vistas materializadas? (s/n): " CREATE_MVIEWS

    [ "$CREATE_TABLES" = "s" ] && sqlplus -S "${CONN_STRING}" @tables/01_create_base_tables.sql
    [ "$INSERT_DATA" = "s" ] && sqlplus -S "${CONN_STRING}" @tables/02_insert_sample_data.sql
    [ "$CREATE_INDEXES" = "s" ] && sqlplus -S "${CONN_STRING}" @indexes/create_indexes.sql
    [ "$CREATE_FUNCTION" = "s" ] && sqlplus -S "${CONN_STRING}" @functions/get_discharge_summary_json.sql
    [ "$CREATE_MVIEWS" = "s" ] && sqlplus -S "${CONN_STRING}" @materialized_views/create_mv_episodios.sql

    echo -e "${GREEN}✓ Instalación personalizada completada${NC}"
    ;;

  *)
    echo -e "${RED}Opción inválida${NC}"
    exit 1
    ;;
esac

# Verificación final
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}VERIFICACIÓN${NC}"
echo -e "${BLUE}============================================================${NC}"

echo ""
echo "Tablas creadas:"
sqlplus -S "${CONN_STRING}" <<EOF
SET PAGESIZE 50
SET LINESIZE 100
SELECT table_name, num_rows
FROM user_tables
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS'
)
ORDER BY table_name;
EXIT;
EOF

echo ""
echo "Funciones creadas:"
sqlplus -S "${CONN_STRING}" <<EOF
SET PAGESIZE 50
SELECT object_name, status
FROM user_objects
WHERE object_type = 'FUNCTION'
  AND object_name = 'GET_DISCHARGE_SUMMARY_JSON';
EXIT;
EOF

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}✓ CONFIGURACIÓN COMPLETADA${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "  1. cd ../backend"
echo "  2. npm install"
echo "  3. npm run dev"
echo ""
echo "  En otra terminal:"
echo "  4. cd ../frontend"
echo "  5. npm start"
echo ""
echo "  Abrir: http://localhost:4200"
echo ""
