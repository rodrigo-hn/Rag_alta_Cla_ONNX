# Sistema de Logging de Performance - Resumen

**Fecha:** 2025-12-29
**Estado:** ✅ Implementado y funcional

---

## 🎯 Objetivo Completado

Se ha implementado un **sistema completo de logging de performance** con métricas detalladas para evaluar diferentes modelos LLM y optimizar el pipeline RAG.

---

## ✅ Cambios Realizados

### 1. **LLM Service** (`backend/src/services/llmService.ts`)

Agregado logging detallado para:

#### Generación de Epicrisis
- ⏱️ **Preparación del prompt** (tiempo + tamaño)
- ⏱️ **Tokenización** (tiempo + tokens estimados)
- ⏱️ **Inferencia** (tiempo crítico del modelo)
- ⏱️ **Post-procesamiento**
- 📊 **Métricas de performance** (tokens/segundo, breakdown porcentual)

#### Regeneración con Correcciones
- ⏱️ **Preparación de whitelists** (dx, procedimientos, medicamentos)
- ⏱️ **Construcción del prompt de corrección**
- ⏱️ **Tokenización**
- ⏱️ **Inferencia de regeneración**
- 📊 **Métricas completas** (tokens/segundo, desglose)

### 2. **RAG Service** (`backend/src/services/ragService.ts`)

Agregado logging detallado para:

#### Indexación (Ingesta de Datos)
- ⏱️ **Chunking semántico** (tiempo + estadísticas de chunks)
- ⏱️ **Generación de embeddings** (tiempo por embedding, promedio, min/max)
- 📊 **Performance** (embeddings/segundo, desglose porcentual)

#### Retrieval (Búsqueda)
- ⏱️ **Query embedding** (tiempo + dimensiones)
- ⏱️ **Cálculo de similitud** (tiempo + comparaciones/segundo)
- ⏱️ **Ordenamiento** (tiempo + top-k scores)
- 📊 **Estadísticas de resultados** (avg/min/max scores)

---

## 📊 Métricas Registradas

### Métricas LLM

| Métrica | Descripción | Importancia |
|---------|-------------|-------------|
| `tokens_per_second` | Velocidad de generación | ⭐⭐⭐⭐⭐ |
| `inference_ms` | Tiempo de inferencia | ⭐⭐⭐⭐⭐ |
| `total_time_ms` | Tiempo total end-to-end | ⭐⭐⭐⭐ |
| `input_tokens` | Tokens de entrada | ⭐⭐⭐ |
| `output_tokens` | Tokens generados | ⭐⭐⭐ |
| `prompt_length` | Longitud del prompt | ⭐⭐ |

### Métricas RAG

| Métrica | Descripción | Importancia |
|---------|-------------|-------------|
| `embeddings_per_second` | Velocidad de embeddings | ⭐⭐⭐⭐⭐ |
| `chunks_count` | Número de chunks | ⭐⭐⭐⭐ |
| `avg_chunk_length` | Tamaño promedio de chunks | ⭐⭐⭐ |
| `similarity_computation_ms` | Tiempo de búsqueda | ⭐⭐⭐⭐ |
| `avg_score` | Relevancia promedio | ⭐⭐⭐⭐ |

---

## 🔍 Formato de Logs

### Ejemplo de log LLM

```log
2025-12-29 16:30:45.001 === LLM GENERATION START ===
2025-12-29 16:30:45.002 [LLM_METRICS] Iniciando generación de epicrisis
2025-12-29 16:30:45.004 [LLM_METRICS] Prompt preparado {"time_ms":2,"prompt_length":3456,"json_size":2890}
2025-12-29 16:30:45.009 [LLM_METRICS] Tokenización {"time_ms":5,"estimated_tokens":864}
2025-12-29 16:30:47.154 [LLM_METRICS] Inferencia completada {"time_ms":2145,"output_tokens":128}
2025-12-29 16:30:47.155 [LLM_METRICS] === GENERACIÓN COMPLETADA === {
  "total_time_ms": 2153,
  "breakdown": {
    "prompt_prep": "2ms (0.1%)",
    "tokenization": "5ms (0.2%)",
    "inference": "2145ms (99.6%)",
    "post_processing": "1ms (0.0%)"
  },
  "performance": {
    "tokens_per_second": "59.67",
    "total_tokens": 992,
    "input_tokens": 864,
    "output_tokens": 128
  }
}
```

### Ejemplo de log RAG

```log
2025-12-29 16:31:00.001 === RAG INDEXING START ===
2025-12-29 16:31:00.002 [RAG_METRICS] Iniciando indexación {"episodeId":"12345"}
2025-12-29 16:31:00.014 [RAG_METRICS] Chunking completado {"time_ms":12,"chunks_count":8,"avg_chunk_length":156}
2025-12-29 16:31:00.259 [RAG_METRICS] Embeddings generados {
  "total_time_ms": 245,
  "avg_time_ms": "30.63",
  "embeddings_per_second": "32.65"
}
2025-12-29 16:31:00.271 [RAG_METRICS] === INDEXACIÓN COMPLETADA === {
  "total_time_ms": 257,
  "breakdown": {
    "chunking": "12ms (4.7%)",
    "embeddings": "245ms (95.3%)"
  }
}
```

---

## 🚀 Cómo Usar

### 1. Ver métricas en tiempo real

```bash
# Ver todas las métricas LLM
tail -f backend/logs/flow-$(date +%Y-%m-%d).log | grep "LLM_METRICS"

# Ver todas las métricas RAG
tail -f backend/logs/flow-$(date +%Y-%m-%d).log | grep "RAG_METRICS"

# Ver solo tiempos de inferencia
tail -f backend/logs/flow-$(date +%Y-%m-%d).log | grep "Inferencia completada"
```

### 2. Extraer métricas del día

```bash
# Tokens por segundo promedio
grep "tokens_per_second" backend/logs/flow-$(date +%Y-%m-%d).log | \
  grep -o '"tokens_per_second":"[0-9.]*"' | \
  cut -d'"' -f4 | \
  awk '{sum+=$1; count++} END {print "Promedio: " sum/count " t/s"}'

# Tiempo de inferencia promedio
grep "inference_ms" backend/logs/flow-$(date +%Y-%m-%d).log | \
  grep -o '"inference_ms":[0-9]*' | \
  cut -d: -f2 | \
  awk '{sum+=$1; count++} END {print "Promedio: " sum/count "ms"}'

# Total de generaciones
grep "=== GENERACIÓN COMPLETADA ===" backend/logs/flow-$(date +%Y-%m-%d).log | wc -l
```

### 3. Comparar dos sesiones

```bash
# Sesión 1 (modelo A)
grep "tokens_per_second" backend/logs/flow-2025-12-29.log | head -10 > model_a.txt

# Sesión 2 (modelo B)
grep "tokens_per_second" backend/logs/flow-2025-12-30.log | head -10 > model_b.txt

# Comparar
echo "Modelo A:" && cat model_a.txt | awk '{sum+=$1} END {print "Avg: " sum/NR}'
echo "Modelo B:" && cat model_b.txt | awk '{sum+=$1} END {print "Avg: " sum/NR}'
```

---

## 📈 Evaluación de LLMs

### Métricas clave para comparar modelos

#### 1. **Velocidad** (tokens/segundo)
```bash
grep "tokens_per_second" backend/logs/flow-*.log | \
  grep -o '[0-9.]*' | \
  sort -n | \
  awk '{
    sum+=$1;
    arr[NR]=$1
  }
  END {
    print "Promedio: " sum/NR " t/s"
    print "Mediana: " arr[int(NR/2)] " t/s"
  }'
```

#### 2. **Latencia** (tiempo de inferencia)
```bash
grep "inference_ms" backend/logs/flow-*.log | \
  grep -o '[0-9]*' | \
  awk '{
    sum+=$1
    if(NR==1){min=$1;max=$1}
    if($1<min){min=$1}
    if($1>max){max=$1}
  }
  END {
    print "Promedio: " sum/NR "ms"
    print "Mín: " min "ms"
    print "Máx: " max "ms"
  }'
```

#### 3. **Throughput** (total end-to-end)
```bash
grep "total_time_ms" backend/logs/flow-*.log | \
  grep -o '[0-9]*' | \
  awk '{sum+=$1; count++} END {print "Promedio: " sum/count "ms"}'
```

---

## 🧪 Benchmarking

### Protocolo recomendado

```bash
#!/bin/bash
# benchmark.sh

echo "=== BENCHMARK EPICRISIS LLM ==="
echo "Modelo: $1"
echo "Fecha: $(date)"
echo ""

# 10 requests de prueba
for i in {1..10}; do
  echo "Request $i/10..."
  curl -s -X POST http://localhost:3000/api/generate-epicrisis \
    -H "Content-Type: application/json" \
    -d @test_data.json > /dev/null
  sleep 3
done

# Extraer métricas
LOG=$(date +%Y-%m-%d)
echo ""
echo "=== RESULTADOS ==="

echo "Tokens/segundo:"
grep "tokens_per_second" backend/logs/flow-$LOG.log | \
  tail -10 | \
  grep -o '[0-9.]*' | \
  awk '{sum+=$1; count++} END {print "  Promedio: " sum/count " t/s"}'

echo ""
echo "Tiempo de inferencia:"
grep "inference_ms" backend/logs/flow-$LOG.log | \
  tail -10 | \
  grep -o '[0-9]*' | \
  awk '{sum+=$1; count++} END {print "  Promedio: " sum/count "ms"}'

echo ""
echo "Tiempo total:"
grep "total_time_ms" backend/logs/flow-$LOG.log | \
  tail -10 | \
  grep -o '[0-9]*' | \
  awk '{sum+=$1; count++} END {print "  Promedio: " sum/count "ms"}'
```

**Uso:**
```bash
chmod +x benchmark.sh
./benchmark.sh "TinyLlama-1.1B"
```

---

## 📚 Documentación

Para más detalles, consultar:

- **`LLM_PERFORMANCE_METRICS.md`** - Guía completa de métricas (600+ líneas)
- **`LOGGING_SYSTEM.md`** - Sistema general de logging
- **`FLUJO_COMPLETO_LOG.md`** - Flujo detallado del sistema

---

## 📊 Ejemplo de Comparación

### Comparando TinyLlama vs Llama-3

| Modelo | Tokens/Seg | Tiempo Inf | Tiempo Total | Calidad |
|--------|------------|------------|--------------|---------|
| **TinyLlama-1.1B** | 62.3 t/s | 2,145ms | 2,153ms | ⭐⭐⭐ |
| **Llama-3-8B** | 38.7 t/s | 3,456ms | 3,468ms | ⭐⭐⭐⭐ |

**Conclusión:** TinyLlama es 61% más rápido pero con menor calidad.

---

## 🎨 Estructura de Archivos

```
epicrisis-app/
├── PERFORMANCE_LOGGING_README.md       # Este archivo (resumen)
├── LLM_PERFORMANCE_METRICS.md         # Guía completa de métricas
├── LOGGING_SYSTEM.md                  # Sistema de logging general
├── FLUJO_COMPLETO_LOG.md             # Flujo detallado
│
└── backend/
    ├── src/
    │   ├── services/
    │   │   ├── llmService.ts         # ✨ Métricas LLM agregadas
    │   │   └── ragService.ts         # ✨ Métricas RAG agregadas
    │   └── config/
    │       └── logger.ts             # Logger con FlowLogger
    │
    └── logs/
        ├── flow-2025-12-29.log       # ✨ Logs con métricas
        ├── combined.log
        └── error.log
```

---

## 🔧 Variables de Entorno

Para ajustar el nivel de logging:

```bash
# .env
LOG_LEVEL=info    # info, debug, warn, error
```

---

## 🎯 Métricas Más Importantes

Para evaluar LLMs, enfocarse en:

1. **`tokens_per_second`** ⭐⭐⭐⭐⭐
   - Mide velocidad pura del modelo
   - Permite comparar hardware/configuraciones

2. **`inference_ms`** ⭐⭐⭐⭐⭐
   - Tiempo real de generación
   - Crítico para UX

3. **`total_time_ms`** ⭐⭐⭐⭐
   - Tiempo end-to-end
   - Incluye overheads

4. **`embeddings_per_second`** (RAG) ⭐⭐⭐⭐
   - Velocidad de indexación
   - Importante para ingesta masiva

---

## 🚦 Umbrales Recomendados

### LLM Generation

- ✅ **Excelente**: >70 tokens/segundo
- ⚠️ **Aceptable**: 40-70 tokens/segundo
- ❌ **Lento**: <40 tokens/segundo

### RAG Indexing

- ✅ **Excelente**: >50 embeddings/segundo
- ⚠️ **Aceptable**: 20-50 embeddings/segundo
- ❌ **Lento**: <20 embeddings/segundo

---

## ✨ Próximos Pasos (Opcional)

Mejoras futuras posibles:

- [ ] Dashboard de visualización (Grafana)
- [ ] Alertas automáticas por degradación
- [ ] Comparación automática A/B testing
- [ ] Exportar métricas a Prometheus
- [ ] Métricas de calidad (BLEU, ROUGE)
- [ ] Costo por request (para APIs)

---

## 🎉 Resumen

✅ **Métricas LLM completas** (prompt, tokenización, inferencia, post-processing)
✅ **Métricas RAG detalladas** (chunking, embeddings, retrieval)
✅ **Logs estructurados** para análisis fácil
✅ **Scripts de extracción** y comparación
✅ **Documentación completa** para evaluación de modelos
✅ **Benchmarking protocol** definido
✅ **Listo para producción** y comparación de LLMs

---

**Implementado por:** Sistema Epicrisis Automática
**Fecha:** 2025-12-29
**Estado:** ✅ Completado y listo para evaluar LLMs
