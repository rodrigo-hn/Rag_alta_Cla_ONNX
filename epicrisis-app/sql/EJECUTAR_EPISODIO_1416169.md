# Episodio 1416169 - Guía de Instalación

## ✅ Estado Actual

El episodio **21** (folio `ATN-2025-1416169`) ya está creado en la base de datos con:

- ✅ Paciente: Rosa Morales Valenzuela (68 años, F)
- ✅ Motivo: Post operatorio cirugía de Miles por cáncer de recto
- ✅ Hospitalización: 2025-12-15 al 2025-12-26 (11 días)
- ✅ 1 medicamento al alta insertado

## 🔍 Cómo Usar en el Frontend

### Opción 1: Usando el ID de Episodio

```
ID de Episodio: 21
```

1. Abrir http://localhost:54855/epicrisis (o http://localhost:4200)
2. Ingresar `21` en el campo "ID de Episodio"
3. Click en "Buscar Episodio"
4. Los datos del paciente se cargarán correctamente
5. Click en "Generar Epicrisis" para probar el LLM

### Opción 2: Verificar desde API

```bash
# Verificar que el episodio existe
curl http://localhost:3000/api/episodes/21 | jq .

# Debería retornar:
{
  "episodeId": "21",
  "clinicalData": {
    "motivo_ingreso": "Post operatorio cirugia de Miles por cancer de recto",
    ...
  },
  "patientInfo": {
    "nombre": "Rosa Morales Valenzuela",
    ...
  }
}
```

## 📊 Datos Completos Disponibles

El script completo `03_insert_episodio_1416169.sql` contiene:

### Datos ya insertados:
- ✅ Paciente (Rosa Morales Valenzuela)
- ✅ Episodio/Atención (folio ATN-2025-1416169)
- ✅ 1 Medicamento al alta

### Datos pendientes (opcional):
Si necesitas los datos completos, ejecuta manualmente:

```bash
# Copiar script al contenedor
docker cp sql/tables/03_insert_episodio_1416169.sql oracle19c:/tmp/

# Ejecutar el script completo
docker exec oracle19c sqlplus system/Oracle123@ORCLPDB1 <<EOF
@/tmp/03_insert_episodio_1416169.sql
EXIT;
EOF
```

Esto agregará:
- 7 diagnósticos (ingreso + egreso)
- 5 procedimientos
- 4 medicamentos hospitalarios
- 3 evoluciones clínicas (día 1, 5 y 12)
- 10 exámenes de laboratorio
- 6 antecedentes médicos/quirúrgicos

## ⚠️ Nota sobre Antecedentes

La tabla `antecedentes` no existe en el esquema actual. Si necesitas antecedentes, debes:

1. Crear la tabla primero:
```sql
CREATE TABLE antecedentes (
  id_antecedente NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paciente NUMBER NOT NULL,
  tipo VARCHAR2(20) NOT NULL,
  descripcion VARCHAR2(500) NOT NULL,
  fecha_registro DATE DEFAULT SYSDATE,
  CONSTRAINT fk_antec_paciente FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  CONSTRAINT chk_antec_tipo CHECK (tipo IN ('MEDICO', 'QUIRURGICO', 'ALERGIA', 'FAMILIAR', 'SOCIAL'))
);
```

2. Luego ejecutar el script completo.

## 🎯 Episodios Disponibles

Actualmente tienes estos episodios para probar:

| ID | Folio | Paciente | Diagnóstico Principal |
|----|-------|----------|----------------------|
| 1 | ATN-2025-100000 | Juan Pérez González | Neumonía comunitaria |
| 2 | ATN-2025-100001 | María Silva Rojas | Apendicitis aguda |
| 3 | ATN-2025-100002 | Pedro Ramírez Torres | TCE moderado |
| **21** | **ATN-2025-1416169** | **Rosa Morales Valenzuela** | **Cáncer de recto - Post op Miles** |

## 🚀 Siguiente Paso

**Probar ahora en el frontend con el episodio 21:**

1. Abrir navegador en http://localhost:54855/epicrisis
2. Ingresar `21` en el campo de búsqueda
3. Click en "Buscar Episodio"
4. ¡Listo! Los datos clínicos del caso real se cargarán

---

**Fecha de creación:** 2025-12-29
**Basado en:** `data_example/epicrisis_ejemplo.json`
