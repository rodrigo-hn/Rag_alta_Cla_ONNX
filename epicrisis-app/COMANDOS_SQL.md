# 🗄️ Comandos SQL para tu Configuración

Comandos específicos basados en tu archivo `.env`:

```env
DB_USER=system
DB_PASSWORD=Oracle123
DB_CONNECT_STRING=localhost:1521/ORCLPDB1
```

---

## 🚀 Método 1: Script Automático (MÁS FÁCIL)

```bash
cd sql
./setup_database.sh
```

El script:
- ✅ Lee tus credenciales automáticamente desde `backend/.env`
- ✅ Verifica la conexión
- ✅ Te pregunta qué instalar
- ✅ Ejecuta todo en orden

**Recomendado:** Opción 1 (Instalación COMPLETA)

---

## 🔧 Método 2: Comandos Manuales

### Paso 1: Verificar Conexión

```bash
# Con Docker (recomendado)
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1 <<'EOF'
SELECT 'Conexión exitosa!' FROM DUAL;
EXIT;
EOF"

# O si tienes SQL*Plus instalado localmente
sqlplus system/Oracle123@localhost:1521/ORCLPDB1
```

### Paso 2: Instalación Completa (Copiar y Pegar)

```bash
cd /Users/rodrigoherrera/code/RAG/rag_alta_Cla/epicrisis-app/sql

# 1. Crear tablas base
echo "📊 Creando tablas base..."
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @tables/01_create_base_tables.sql

# 2. Insertar datos de ejemplo (para pruebas)
echo "📝 Insertando datos de ejemplo..."
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @tables/02_insert_sample_data.sql

# 3. Crear índices (OBLIGATORIO)
echo "🚀 Creando índices..."
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @indexes/create_indexes.sql

# 4. Crear función principal (OBLIGATORIO)
echo "⚙️ Creando función get_discharge_summary_json..."
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @functions/get_discharge_summary_json.sql

# 5. Vistas materializadas (OPCIONAL - recomendado para producción)
# echo "💾 Creando vistas materializadas..."
# sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @materialized_views/create_mv_episodios.sql

echo "✅ ¡Instalación completada!"
```

### Paso 3: Verificar Instalación

#### Verificación Completa (Recomendada)

```bash
# Desde el directorio epicrisis-app
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1" < sql/verify_installation.sql
```

#### Verificación Rápida

```bash
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1 <<'EOF'
SET PAGESIZE 50
SET LINESIZE 150

SELECT 'TABLAS: ' || COUNT(*) || ' de 11' as resultado
FROM user_tables
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
);

SELECT 'FUNCION: ' || object_name || ' - ' || status as resultado
FROM user_objects
WHERE object_name = 'GET_DISCHARGE_SUMMARY_JSON';

SELECT 'TRIGGERS: ' || COUNT(*) || ' de 3' as resultado
FROM user_triggers
WHERE table_name IN ('PACIENTES', 'ATENCIONES');

SELECT 'PACIENTES: ' || COUNT(*) as resultado FROM pacientes;
SELECT 'ATENCIONES: ' || COUNT(*) as resultado FROM atenciones;

SELECT 'TEST FUNCION: ' || LENGTH(get_discharge_summary_json(1)) || ' caracteres' as resultado
FROM dual WHERE EXISTS (SELECT 1 FROM atenciones WHERE id_episodio = 1);

EXIT
EOF"
```

**Resultado esperado:**
```
TABLAS: 11 de 11
FUNCION: GET_DISCHARGE_SUMMARY_JSON - VALID
TRIGGERS: 3 de 3
PACIENTES: 3
ATENCIONES: 3
TEST FUNCION: 1758 caracteres
```

---

## 🧪 Probar el Sistema

### Opción A: Dentro de SQL*Plus

```bash
# Con Docker
docker exec -it oracle19c bash -c "sqlplus system/Oracle123@ORCLPDB1"
```

```sql
-- Obtener un ID de episodio
SELECT id_episodio FROM atenciones WHERE ROWNUM = 1;

-- Probar la función (reemplaza 1 con el ID obtenido)
SELECT get_discharge_summary_json(1) FROM DUAL;

-- Ver el JSON formateado
SET LONG 10000
SET LONGCHUNKSIZE 10000
SELECT get_discharge_summary_json(1) FROM DUAL;

EXIT;
```

### Opción B: Ver Pacientes de Ejemplo

```bash
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1 <<'EOF'
SET LINESIZE 150
SET PAGESIZE 50

SELECT
  a.id_episodio,
  p.rut,
  p.nombre || ' ' || p.apellido_paterno as paciente,
  SUBSTR(a.motivo_ingreso, 1, 50) || '...' as motivo
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
ORDER BY a.id_episodio;

EXIT;
EOF"
```

Resultado esperado:
```
ID  RUT          Paciente        Motivo
--- ------------ --------------- --------------------------------------------------
1   12345678-9   Juan Pérez      Cuadro de 5 días de evolución caracterizado...
2   98765432-1   María Silva     Dolor abdominal en fosa ilíaca derecha...
3   11222333-4   Pedro Ramírez   Trauma craneoencefálico moderado...
```

---

## 📋 Componentes Instalados

Después de la instalación completa tendrás:

### Tablas (11 total)
- ✅ `PACIENTES` - Datos demográficos
- ✅ `ATENCIONES` - Episodios de hospitalización
- ✅ `DIAGNOSTICOS` - Diagnósticos CIE-10
- ✅ `PROCEDIMIENTOS` - Procedimientos/cirugías
- ✅ `MEDICAMENTOS_HOSPITALARIOS` - Tratamientos intrahospitalarios
- ✅ `MEDICAMENTOS_ALTA` - Medicamentos al alta
- ✅ `EVOLUCIONES` - Notas de evolución
- ✅ `LABORATORIOS` - Exámenes de laboratorio
- ✅ `CONTROLES_ALTA` - Controles programados
- ✅ `RECOMENDACIONES_ALTA` - Indicaciones al alta
- ✅ `LOG_ERRORES` - Log de errores

### Función PL/SQL
- ✅ `get_discharge_summary_json(episodio_id)` - Genera JSON clínico

### Índices (15+)
- ✅ Optimizados para búsqueda rápida por episodio, paciente, código CIE-10, etc.

### Datos de Ejemplo (3 pacientes)
- ✅ Juan Pérez - Neumonía comunitaria (alta médica)
- ✅ María Silva - Apendicitis aguda (apendicectomía)
- ✅ Pedro Ramírez - TCE moderado (en proceso)

---

## 🎯 Solo Componentes Esenciales (Sin Datos de Ejemplo)

Si solo quieres lo mínimo para producción:

```bash
cd /Users/rodrigoherrera/code/RAG/rag_alta_Cla/epicrisis-app/sql

# 1. Tablas
sqlplus ORCLPDB1/Oracle123@localhost:1521/ORCLPDB1 @tables/01_create_base_tables.sql

# 2. Índices
sqlplus ORCLPDB1/Oracle123@localhost:1521/ORCLPDB1 @indexes/create_indexes.sql

# 3. Función
sqlplus ORCLPDB1/Oracle123@localhost:1521/ORCLPDB1 @functions/get_discharge_summary_json.sql

echo "✅ Instalación mínima completada - Lista para datos reales"
```

---

## 🔄 Comandos de Mantenimiento

### Regenerar Estadísticas

```sql
sqlplus ORCLPDB1/Oracle123@localhost:1521/ORCLPDB1 <<EOF
BEGIN
  DBMS_STATS.GATHER_SCHEMA_STATS(
    ownname => 'ORCLPDB1',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );
END;
/
EXIT;
EOF
```

### Ver Espacio Usado

```sql
sqlplus ORCLPDB1/Oracle123@localhost:1521/ORCLPDB1 <<EOF
SELECT
  segment_name,
  ROUND(bytes/1024/1024, 2) as size_mb
FROM user_segments
WHERE segment_type = 'TABLE'
ORDER BY bytes DESC;
EXIT;
EOF
```

### Borrar Datos de Ejemplo (SOLO EN DESARROLLO)

```sql
sqlplus ORCLPDB1/Oracle123@localhost:1521/ORCLPDB1 <<EOF
-- CUIDADO: Esto borra todos los datos
DELETE FROM recomendaciones_alta;
DELETE FROM controles_alta;
DELETE FROM laboratorios;
DELETE FROM evoluciones;
DELETE FROM medicamentos_alta;
DELETE FROM medicamentos_hospitalarios;
DELETE FROM procedimientos;
DELETE FROM diagnosticos;
DELETE FROM atenciones;
DELETE FROM pacientes;
COMMIT;
EXIT;
EOF
```

---

## 🚨 Troubleshooting

### Error: "ORA-12154: TNS:could not resolve the connect identifier"

**Solución:**
```bash
# Verificar que Oracle está corriendo
lsnrctl status

# Verificar la conexión
tnsping localhost:1521/ORCLPDB1
```

### Error: "ORA-01017: invalid username/password"

**Solución:**
```bash
# Verificar credenciales en backend/.env
cat ../backend/.env | grep DB_

# Probar conexión
sqlplus ORCLPDB1/Oracle123@localhost:1521/ORCLPDB1
```

### Error: "ORA-00942: table or view does not exist"

**Causa:** Las tablas no están creadas

**Solución:**
```bash
sqlplus ORCLPDB1/Oracle123@localhost:1521/ORCLPDB1 @tables/01_create_base_tables.sql
```

### Error: "ORA-01031: insufficient privileges"

**Solución:** Conectar como SYSDBA y dar permisos:
```sql
sqlplus sys/password@localhost:1521/ORCLPDB1 as sysdba

GRANT CREATE TABLE TO ORCLPDB1;
GRANT CREATE INDEX TO ORCLPDB1;
GRANT CREATE MATERIALIZED VIEW TO ORCLPDB1;
GRANT EXECUTE ON DBMS_STATS TO ORCLPDB1;
EXIT;
```

---

## ✅ Checklist de Instalación

- [ ] Oracle 19c instalado y corriendo
- [ ] Usuario `ORCLPDB1` creado con permisos
- [ ] Conexión verificada (`sqlplus ORCLPDB1/Oracle123@...`)
- [ ] Tablas creadas (`01_create_base_tables.sql`)
- [ ] Datos de ejemplo insertados (opcional)
- [ ] Índices creados (`create_indexes.sql`)
- [ ] Función creada (`get_discharge_summary_json.sql`)
- [ ] Función probada con un episodio
- [ ] Backend configurado (`backend/.env`)

---

## 🎉 Siguiente Paso

Una vez completada la instalación SQL:

```bash
# Terminal 1: Backend
cd ../backend
npm install
npm run dev

# Terminal 2: Frontend (en otra terminal)
cd ../frontend
npm start

# Abrir navegador
# http://localhost:4200
```

---

**¿Problemas?** Revisa `sql/README.md` o abre un issue.
