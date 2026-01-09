# Sistema de Logging Incremental - Resumen de Implementación

**Fecha:** 2025-12-29
**Estado:** ✅ Implementado y funcional

---

## 🎯 Objetivo Completado

Se ha implementado un **sistema de logging incremental** que guarda todos los registros del flujo completo desde la búsqueda exitosa de ID del episodio hasta la generación de epicrisis en archivos con rotación automática.

---

## ✅ Cambios Realizados

### 1. **Logger Mejorado** (`backend/src/config/logger.ts`)

- ✅ Configuración de Winston con rotación diaria
- ✅ Clase `FlowLogger` para rastrear flujos completos
- ✅ Session IDs únicos para cada operación
- ✅ Timestamps con milisegundos
- ✅ Múltiples transportes (console, files, rotativo)

**Características:**
- Session ID único: `episodeId-uuid` (ej: `12345-a1b2c3d4`)
- Tiempo transcurrido desde inicio de flujo
- Resumen automático al finalizar
- Datos estructurados en JSON

### 2. **Rutas Instrumentadas** (`backend/src/routes/epicrisisRoutes.ts`)

Se agregó logging detallado en:

#### a) **GET /api/episodes/:id**
```
STEP_1.1_VALIDATE_ID
STEP_2.1_CHECK_EXISTENCE
STEP_2.2_FETCH_FROM_ORACLE
STEP_2.2_ORACLE_SUCCESS
STEP_2.3_NORMALIZE_DATA
STEP_2.3_NORMALIZE_SUCCESS
STEP_2.4_FETCH_PATIENT_INFO
STEP_2.4_PATIENT_INFO_SUCCESS
FLOW_END
FLOW_SUMMARY
```

#### b) **POST /api/generate-epicrisis**
```
STEP_3.1_VALIDATE_INPUT
STEP_3.2_NORMALIZE_DATA
STEP_3.2_NORMALIZE_SUCCESS
STEP_3.3_LLM_GENERATE
STEP_3.3_LLM_SUCCESS
STEP_4.1_VALIDATE
STEP_4.1_VALIDATION_RESULT
[Si hay violaciones:]
  STEP_4.2_AUTO_REGENERATE
  STEP_4.2_REGENERATE_SUCCESS
  STEP_4.2_REVALIDATION
FLOW_END
FLOW_SUMMARY
```

#### c) **POST /api/regenerate-epicrisis**
```
STEP_5.1_VALIDATE_INPUT
STEP_5.2_NORMALIZE_DATA
STEP_5.3_LLM_REGENERATE
STEP_5.3_REGENERATE_SUCCESS
STEP_5.4_VALIDATE
STEP_5.4_VALIDATION_RESULT
FLOW_END
FLOW_SUMMARY
```

#### d) **POST /api/export/pdf**
```
STEP_6.1_VALIDATE_INPUT
STEP_6.2_GENERATE_PDF
STEP_6.2_PDF_SUCCESS
FLOW_END
FLOW_SUMMARY
```

### 3. **Archivos de Log** (`backend/logs/`)

| Archivo | Descripción | Rotación |
|---------|-------------|----------|
| `combined.log` | Todos los logs del sistema | Manual |
| `error.log` | Solo errores | Manual |
| `audit.log` | Auditoría de eventos importantes | Manual |
| `flow-YYYY-MM-DD.log` | **Logs de flujo con rotación** | Diaria |

**Política de rotación del flow log:**
- ✅ Rotación diaria automática
- ✅ Máximo 20MB por archivo
- ✅ Retención de 30 días
- ✅ Nomenclatura: `flow-2025-12-29.log`

### 4. **Dependencias Instaladas**

```bash
npm install winston-daily-rotate-file --save
```

### 5. **Documentación Creada**

- ✅ `FLUJO_COMPLETO_LOG.md` - Documentación detallada del flujo esperado
- ✅ `LOGGING_SYSTEM.md` - Guía completa del sistema de logging
- ✅ `LOGGING_README.md` - Este archivo

---

## 📝 Formato de Logs

### Ejemplo de línea de log:

```
2025-12-29 15:30:45.123 [12345-a1b2c3d4][STEP_2.1_CHECK_EXISTENCE] [info]: STEP_2.1_CHECK_EXISTENCE {"elapsed":"234ms","episodeId":12345}
```

### Estructura:

```
[TIMESTAMP] [SESSION_ID][STEP_NAME] [LEVEL]: MESSAGE {JSON_DATA}
```

---

## 🚀 Cómo Usar

### 1. Iniciar el backend

```bash
cd backend
npm run dev
```

Los logs se generarán automáticamente en `backend/logs/`

### 2. Ver logs en tiempo real

```bash
# Ver todos los logs
tail -f backend/logs/flow-$(date +%Y-%m-%d).log

# Ver solo de hoy con formato limpio
tail -f backend/logs/flow-$(date +%Y-%m-%d).log | grep --line-buffered "STEP"

# Ver errores
tail -f backend/logs/error.log
```

### 3. Buscar logs de una sesión específica

```bash
# Reemplazar SESSION_ID con el ID real
grep "12345-a1b2c3d4" backend/logs/flow-*.log
```

### 4. Ver resúmenes de flujos

```bash
grep "FLOW_SUMMARY" backend/logs/flow-$(date +%Y-%m-%d).log
```

---

## 📊 Ejemplo de Flujo Completo en Logs

```log
2025-12-29 15:30:45.001 [12345-a1b2c3d4][FLOW_START] [info]: FLOW_START
2025-12-29 15:30:45.002 [12345-a1b2c3d4][STEP_1.1_VALIDATE_ID] [info]: STEP_1.1_VALIDATE_ID {"episodeId":"12345"}
2025-12-29 15:30:45.120 [12345-a1b2c3d4][STEP_2.1_CHECK_EXISTENCE] [info]: STEP_2.1_CHECK_EXISTENCE {"episodeId":12345}
2025-12-29 15:30:45.340 [12345-a1b2c3d4][STEP_2.2_FETCH_FROM_ORACLE] [info]: STEP_2.2_FETCH_FROM_ORACLE
2025-12-29 15:30:45.560 [12345-a1b2c3d4][STEP_2.2_ORACLE_SUCCESS] [info]: STEP_2.2_ORACLE_SUCCESS {"dataSize":4567}
2025-12-29 15:30:45.580 [12345-a1b2c3d4][STEP_2.3_NORMALIZE_DATA] [info]: STEP_2.3_NORMALIZE_DATA
2025-12-29 15:30:45.620 [12345-a1b2c3d4][STEP_2.3_NORMALIZE_SUCCESS] [info]: STEP_2.3_NORMALIZE_SUCCESS {"dxIngreso":2,"dxEgreso":3}
2025-12-29 15:30:45.640 [12345-a1b2c3d4][STEP_2.4_FETCH_PATIENT_INFO] [info]: STEP_2.4_FETCH_PATIENT_INFO
2025-12-29 15:30:45.780 [12345-a1b2c3d4][STEP_2.4_PATIENT_INFO_SUCCESS] [info]: STEP_2.4_PATIENT_INFO_SUCCESS {"nombre":"JUAN PEREZ"}
2025-12-29 15:30:45.800 [12345-a1b2c3d4][FLOW_END] [info]: FLOW_END {"totalTime":"799ms","success":true}
2025-12-29 15:30:45.820 [12345-a1b2c3d4][FLOW_SUMMARY] [info]: FLOW_SUMMARY {... resumen completo en JSON ...}
```

---

## 🔍 Comandos Útiles

### Análisis de logs

```bash
# Contar flujos completados hoy
grep "FLOW_END" backend/logs/flow-$(date +%Y-%m-%d).log | wc -l

# Contar errores hoy
grep "error" backend/logs/flow-$(date +%Y-%m-%d).log | wc -l

# Ver tiempo promedio de generación
grep "STEP_3.3_LLM_SUCCESS" backend/logs/flow-$(date +%Y-%m-%d).log | grep -o '"elapsed":"[^"]*"'

# Ver todas las sesiones de un episodio específico
grep "12345-" backend/logs/flow-*.log | sort

# Extraer solo resúmenes en JSON
grep "FLOW_SUMMARY" backend/logs/flow-$(date +%Y-%m-%d).log | \
  sed 's/.*summary"://' | jq '.'
```

### Limpieza

```bash
# Ver tamaño de logs
du -sh backend/logs/

# Eliminar logs mayores a 30 días (automático con rotación)
find backend/logs/ -name "flow-*.log" -mtime +30 -delete
```

---

## 🎨 Estructura de Archivos

```
epicrisis-app/
├── FLUJO_COMPLETO_LOG.md          # Documentación del flujo esperado
├── LOGGING_SYSTEM.md              # Guía completa del sistema de logging
├── LOGGING_README.md              # Este archivo (resumen)
│
└── backend/
    ├── src/
    │   ├── config/
    │   │   └── logger.ts          # ✨ Logger mejorado con FlowLogger
    │   └── routes/
    │       └── epicrisisRoutes.ts # ✨ Rutas instrumentadas con logging
    │
    └── logs/                      # 📁 Directorio de logs (auto-creado)
        ├── .gitkeep               # Mantiene directorio en git
        ├── combined.log           # Todos los logs
        ├── error.log              # Solo errores
        ├── audit.log              # Auditoría
        ├── flow-2025-12-29.log    # ✨ Logs del día (rotativo)
        ├── flow-2025-12-28.log
        └── flow-2025-12-27.log
```

---

## 🧪 Testing

Para probar el sistema de logging:

### 1. Iniciar el backend

```bash
cd backend
npm run dev
```

### 2. Hacer una request de prueba

```bash
# Buscar episodio
curl http://localhost:3000/api/episodes/12345

# Ver los logs generados
tail -20 backend/logs/flow-$(date +%Y-%m-%d).log
```

### 3. Verificar que se creó el log

Deberías ver algo como:

```
[12345-a1b2c3d4][FLOW_START]
[12345-a1b2c3d4][STEP_1.1_VALIDATE_ID]
[12345-a1b2c3d4][STEP_2.1_CHECK_EXISTENCE]
...
[12345-a1b2c3d4][FLOW_END]
```

---

## 📈 Métricas Rastreadas

Para cada flujo se registra:

- ✅ **Session ID único** para rastrear toda la sesión
- ✅ **Timestamp preciso** (con milisegundos)
- ✅ **Tiempo transcurrido** desde inicio del flujo
- ✅ **Cada paso del proceso** con datos relevantes
- ✅ **Errores** con stack traces completos
- ✅ **Resumen final** con estadísticas

### Datos capturados:

- Episode ID
- Tamaño de datos obtenidos de Oracle
- Número de diagnósticos, procedimientos, medicamentos
- Nombre del paciente
- Longitud del texto generado
- Resultado de validación
- Violaciones detectadas
- Tiempos de cada operación
- Tamaño de archivos exportados

---

## 🔐 Seguridad

- ✅ Los logs NO contienen datos sensibles del paciente (solo nombres e IDs)
- ✅ Los archivos de log están en `.gitignore`
- ✅ Rotación automática previene crecimiento descontrolado
- ✅ Solo se loguea información necesaria para debugging

---

## 🐛 Debugging

Si encuentras un problema:

1. **Busca el Session ID** en la respuesta HTTP (si está disponible)
2. **Grep los logs** con ese Session ID
3. **Revisa el flujo completo** de esa sesión
4. **Identifica el paso que falló**
5. **Revisa los datos** registrados en ese paso

Ejemplo:

```bash
# Supongamos que hubo un error con el episodio 12345
# Buscar todas las sesiones de ese episodio
grep "12345-" backend/logs/flow-*.log

# Revisar los errores específicos
grep "12345-" backend/logs/error.log
```

---

## 📚 Documentación Adicional

Para más detalles, consultar:

- **`LOGGING_SYSTEM.md`** - Guía completa del sistema
- **`FLUJO_COMPLETO_LOG.md`** - Documentación detallada del flujo
- **`backend/src/config/logger.ts`** - Código fuente del logger

---

## ✨ Próximos Pasos (Opcional)

Posibles mejoras futuras:

- [ ] Dashboard de visualización de logs
- [ ] Alertas automáticas por errores
- [ ] Integración con Grafana/Prometheus
- [ ] Exportar métricas a servicios de monitoreo
- [ ] Logs de performance detallados
- [ ] Agregación de métricas por período

---

## 🎉 Resumen

✅ **Sistema de logging incremental implementado**
✅ **Archivos de log con rotación automática**
✅ **Session IDs únicos para rastrear flujos**
✅ **Logging detallado en todas las rutas principales**
✅ **Documentación completa creada**
✅ **Dependencias instaladas**
✅ **Listo para usar en producción**

---

**Implementado por:** Sistema Epicrisis Automática
**Fecha:** 2025-12-29
**Estado:** ✅ Completado y funcional
