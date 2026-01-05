# Métricas de Performance para Evaluación de LLMs

**Documento:** Guía completa de métricas para evaluar diferentes modelos LLM
**Fecha:** 2025-12-29
**Sistema:** Epicrisis Automática

---

## Índice

1. [Introducción](#introducción)
2. [Métricas Implementadas](#métricas-implementadas)
3. [Métricas LLM](#métricas-llm)
4. [Métricas RAG](#métricas-rag)
5. [Cómo Leer los Logs](#cómo-leer-los-logs)
6. [Análisis Comparativo de LLMs](#análisis-comparativo-de-llms)
7. [Scripts de Análisis](#scripts-de-análisis)
8. [Benchmarking](#benchmarking)

---

## Introducción

Este documento describe el sistema de métricas implementado para evaluar el rendimiento de diferentes modelos LLM en el sistema de generación de epicrisis. Las métricas permiten comparar:

- **Velocidad de inferencia** (tokens/segundo)
- **Tiempos de procesamiento** por etapa
- **Uso de recursos** (memoria, tokens)
- **Calidad de salida** (longitud, coherencia)

---

## Métricas Implementadas

### Ubicación de los logs

Todas las métricas se registran en:
```
backend/logs/flow-YYYY-MM-DD.log
```

Buscar por:
```bash
grep "LLM_METRICS" backend/logs/flow-*.log
grep "RAG_METRICS" backend/logs/flow-*.log
```

---

## Métricas LLM

### 1. Generación de Epicrisis

**Pasos medidos:**

#### a) Preparación del Prompt
```
[LLM_METRICS] Prompt preparado
{
  "time_ms": 2,
  "prompt_length": 3456,
  "json_size": 2890
}
```

**Métricas:**
- `time_ms`: Tiempo en preparar el prompt
- `prompt_length`: Longitud total del prompt en caracteres
- `json_size`: Tamaño del JSON clínico en caracteres

#### b) Tokenización
```
[LLM_METRICS] Tokenización
{
  "time_ms": 5,
  "estimated_tokens": 864,
  "tokens_per_char": 0.25
}
```

**Métricas:**
- `time_ms`: Tiempo de tokenización
- `estimated_tokens`: Tokens estimados (1 token ≈ 4 chars)
- `tokens_per_char`: Ratio tokens/caracteres

#### c) Inferencia
```
[LLM_METRICS] Inferencia completada
{
  "time_ms": 2145,
  "output_length": 512,
  "output_tokens": 128
}
```

**Métricas:**
- `time_ms`: **Tiempo crítico** de inferencia del modelo
- `output_length`: Longitud del texto generado
- `output_tokens`: Tokens generados

#### d) Post-procesamiento
```
[LLM_METRICS] Post-procesamiento
{
  "time_ms": 1
}
```

#### e) Resumen Final
```
[LLM_METRICS] === GENERACIÓN COMPLETADA ===
{
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

**Métricas clave:**
- `total_time_ms`: Tiempo total de generación
- `tokens_per_second`: **MÉTRICA PRINCIPAL** para comparar LLMs
- `total_tokens`: Total de tokens procesados
- `breakdown`: Desglose porcentual por etapa

---

### 2. Regeneración con Correcciones

**Pasos adicionales medidos:**

#### a) Preparación de Whitelists
```
[LLM_METRICS] Whitelists preparadas
{
  "time_ms": 3,
  "dx_count": 5,
  "proc_count": 8,
  "med_count": 12
}
```

**Métricas:**
- `time_ms`: Tiempo en construir listas de validación
- `dx_count`: Cantidad de diagnósticos permitidos
- `proc_count`: Cantidad de procedimientos permitidos
- `med_count`: Cantidad de medicamentos permitidos

#### b) Prompt de Corrección
```
[LLM_METRICS] Prompt de corrección preparado
{
  "time_ms": 4,
  "prompt_length": 4567,
  "violations_text_length": 234
}
```

**Métricas:**
- `violations_text_length`: Tamaño del texto de violaciones

---

## Métricas RAG

### 1. Indexación (Chunking + Embeddings)

#### a) Chunking Semántico
```
[RAG_METRICS] Chunking completado
{
  "time_ms": 12,
  "chunks_count": 8,
  "avg_chunk_length": 156,
  "sections": ["motivo_ingreso", "diagnostico_ingreso", "procedimientos", ...]
}
```

**Métricas:**
- `time_ms`: Tiempo de chunking
- `chunks_count`: Número de chunks creados
- `avg_chunk_length`: Longitud promedio de chunks
- `sections`: Secciones procesadas

#### b) Generación de Embeddings
```
[RAG_METRICS] Embeddings generados
{
  "total_time_ms": 245,
  "avg_time_ms": "30.63",
  "min_time_ms": 28,
  "max_time_ms": 35,
  "embeddings_per_second": "32.65"
}
```

**Métricas:**
- `total_time_ms`: Tiempo total de embeddings
- `avg_time_ms`: Tiempo promedio por embedding
- `min/max_time_ms`: Rango de tiempos
- `embeddings_per_second`: **MÉTRICA PRINCIPAL** para modelos de embedding

#### c) Resumen de Indexación
```
[RAG_METRICS] === INDEXACIÓN COMPLETADA ===
{
  "total_time_ms": 257,
  "breakdown": {
    "chunking": "12ms (4.7%)",
    "embeddings": "245ms (95.3%)"
  },
  "index_stats": {
    "total_vectors": 8,
    "chunks_indexed": 8
  }
}
```

---

### 2. Retrieval (Búsqueda Semántica)

#### a) Query Embedding
```
[RAG_METRICS] Query embedding generado
{
  "time_ms": 28,
  "embedding_dim": 384
}
```

#### b) Cálculo de Similitud
```
[RAG_METRICS] Similitud calculada
{
  "time_ms": 2,
  "docs_compared": 8,
  "comparisons_per_second": "4000.00"
}
```

**Métricas:**
- `comparisons_per_second`: Velocidad de comparación vectorial

#### c) Ordenamiento
```
[RAG_METRICS] Resultados ordenados
{
  "time_ms": 0,
  "top_k": 3,
  "top_scores": ["0.8765", "0.8234", "0.7891"]
}
```

#### d) Resumen de Retrieval
```
[RAG_METRICS] === RETRIEVAL COMPLETADO ===
{
  "total_time_ms": 30,
  "breakdown": {
    "query_embedding": "28ms (93.3%)",
    "similarity_comp": "2ms (6.7%)",
    "sorting": "0ms (0.0%)"
  },
  "results_stats": {
    "returned": 3,
    "avg_score": "0.8297",
    "min_score": "0.7891",
    "max_score": "0.8765"
  }
}
```

---

## Cómo Leer los Logs

### Ejemplo de log completo de generación

```log
2025-12-29 16:30:45.001 [generate-a1b2c3d4][FLOW_START] [info]: FLOW_START
2025-12-29 16:30:45.002 === LLM GENERATION START ===
2025-12-29 16:30:45.003 [LLM_METRICS] Iniciando generación de epicrisis
2025-12-29 16:30:45.005 [LLM_METRICS] Prompt preparado {"time_ms":2,"prompt_length":3456,"json_size":2890}
2025-12-29 16:30:45.010 [LLM_METRICS] Tokenización {"time_ms":5,"estimated_tokens":864,"tokens_per_char":0.25}
2025-12-29 16:30:47.155 [LLM_METRICS] Inferencia completada {"time_ms":2145,"output_length":512,"output_tokens":128}
2025-12-29 16:30:47.156 [LLM_METRICS] === GENERACIÓN COMPLETADA === {"total_time_ms":2153,...}
```

### Buscar métricas específicas

```bash
# Ver solo tiempos de inferencia
grep "Inferencia completada" backend/logs/flow-*.log

# Ver solo tokens/segundo
grep "tokens_per_second" backend/logs/flow-*.log

# Ver solo métricas de RAG
grep "RAG_METRICS" backend/logs/flow-*.log
```

---

## Análisis Comparativo de LLMs

### Tabla de Métricas Clave

| Modelo | Tokens/Seg | Tiempo Inferencia | Tamaño | Calidad |
|--------|------------|-------------------|--------|---------|
| TinyLlama-1.1B | ~60 t/s | ~2000ms | 1.1GB | ⭐⭐⭐ |
| Llama-3-8B | ~35 t/s | ~3500ms | 8GB | ⭐⭐⭐⭐ |
| GPT-3.5-turbo (API) | ~80 t/s | ~1500ms | N/A | ⭐⭐⭐⭐⭐ |
| Claude-3 (API) | ~75 t/s | ~1600ms | N/A | ⭐⭐⭐⭐⭐ |

### Factores a Evaluar

#### 1. **Velocidad** (tokens/segundo)
- ✅ **Alta**: >70 t/s
- ⚠️ **Media**: 40-70 t/s
- ❌ **Baja**: <40 t/s

#### 2. **Latencia** (tiempo de primera respuesta)
- ✅ **Baja**: <500ms
- ⚠️ **Media**: 500-2000ms
- ❌ **Alta**: >2000ms

#### 3. **Throughput** (total_time_ms)
- ✅ **Rápido**: <2000ms
- ⚠️ **Medio**: 2000-5000ms
- ❌ **Lento**: >5000ms

#### 4. **Costo**
- Local (TinyLlama, Llama): $0/request
- API (GPT, Claude): $0.001-0.01/request

#### 5. **Calidad**
- Medir con validación automática (violations)
- Revisar manualmente coherencia clínica

---

## Scripts de Análisis

### 1. Extraer todas las métricas de LLM

```bash
#!/bin/bash
# extract_llm_metrics.sh

LOG_FILE="backend/logs/flow-$(date +%Y-%m-%d).log"

echo "=== MÉTRICAS LLM DEL DÍA ==="
echo ""

echo "Tiempos de Inferencia:"
grep "Inferencia completada" "$LOG_FILE" | \
  grep -o '"time_ms":[0-9]*' | \
  cut -d: -f2 | \
  awk '{sum+=$1; count++} END {print "Promedio: " sum/count "ms"}'

echo ""
echo "Tokens por Segundo:"
grep "tokens_per_second" "$LOG_FILE" | \
  grep -o '"tokens_per_second":"[0-9.]*"' | \
  cut -d'"' -f4 | \
  awk '{sum+=$1; count++} END {print "Promedio: " sum/count " t/s"}'

echo ""
echo "Total de Generaciones:"
grep "=== GENERACIÓN COMPLETADA ===" "$LOG_FILE" | wc -l
```

### 2. Comparar dos modelos

```bash
#!/bin/bash
# compare_models.sh

MODEL1_LOG="backend/logs/tinyllama_results.log"
MODEL2_LOG="backend/logs/llama3_results.log"

echo "Comparación de Modelos"
echo "======================"

echo ""
echo "Modelo 1 (TinyLlama):"
grep "tokens_per_second" "$MODEL1_LOG" | \
  grep -o '"tokens_per_second":"[0-9.]*"' | \
  cut -d'"' -f4 | \
  awk '{sum+=$1; count++} END {print "  Avg tokens/s: " sum/count}'

echo ""
echo "Modelo 2 (Llama-3):"
grep "tokens_per_second" "$MODEL2_LOG" | \
  grep -o '"tokens_per_second":"[0-9.]*"' | \
  cut -d'"' -f4 | \
  awk '{sum+=$1; count++} END {print "  Avg tokens/s: " sum/count}'
```

### 3. Generar reporte CSV

```bash
#!/bin/bash
# generate_metrics_csv.sh

LOG_FILE="backend/logs/flow-$(date +%Y-%m-%d).log"
OUTPUT="metrics_$(date +%Y-%m-%d).csv"

echo "timestamp,inference_ms,tokens_per_second,input_tokens,output_tokens,total_tokens" > "$OUTPUT"

grep "=== GENERACIÓN COMPLETADA ===" "$LOG_FILE" -A5 | \
  grep -E "(timestamp|inference_ms|tokens_per_second|input_tokens|output_tokens)" | \
  # Procesar y formatear a CSV
  awk '...' >> "$OUTPUT"

echo "Reporte generado: $OUTPUT"
```

---

## Benchmarking

### Escenarios de Prueba

#### 1. **Caso Simple** (pocos datos clínicos)
- Diagnósticos: 2
- Procedimientos: 1
- Medicamentos: 3
- Esperado: <2000ms

#### 2. **Caso Medio** (datos estándar)
- Diagnósticos: 5
- Procedimientos: 5
- Medicamentos: 8
- Esperado: 2000-3000ms

#### 3. **Caso Complejo** (muchos datos)
- Diagnósticos: 10+
- Procedimientos: 10+
- Medicamentos: 15+
- Esperado: 3000-5000ms

### Protocolo de Benchmarking

1. **Preparación**
   ```bash
   # Limpiar cache, reiniciar servidor
   rm -rf backend/logs/*
   npm run dev
   ```

2. **Ejecución**
   - Ejecutar 10 requests de cada caso
   - Esperar 5 segundos entre requests
   - Registrar todos los resultados

3. **Análisis**
   ```bash
   # Extraer métricas
   grep "GENERACIÓN COMPLETADA" backend/logs/flow-*.log

   # Calcular promedios
   # Identificar outliers
   # Comparar con baseline
   ```

4. **Reporte**
   - Promedio de tokens/segundo
   - P50, P95, P99 de latencia
   - Tasa de éxito
   - Calidad de salida (validaciones)

---

## Métricas por Tipo de LLM

### Modelos Locales (Llama, TinyLlama)

**Métricas adicionales a monitorear:**
- Uso de RAM durante inferencia
- Uso de GPU (si aplica)
- Tiempo de carga del modelo (inicial)
- Latencia de primera respuesta (TTFT)

### Modelos API (GPT, Claude)

**Métricas adicionales:**
- Tiempo de request HTTP
- Rate limiting (requests/min)
- Costo acumulado ($)
- Errores de API (429, 500, etc.)

---

## Ejemplo de Análisis Completo

### Flujo de evaluación

```bash
# 1. Ejecutar 10 generaciones
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/generate-epicrisis \
    -H "Content-Type: application/json" \
    -d @test_data.json
  sleep 5
done

# 2. Extraer métricas
LOG=$(date +%Y-%m-%d)
grep "LLM_METRICS" backend/logs/flow-$LOG.log > llm_results.txt

# 3. Calcular estadísticas
cat llm_results.txt | \
  grep "tokens_per_second" | \
  grep -o '[0-9.]*' | \
  awk '{
    sum+=$1
    sumsq+=$1*$1
    if(NR==1){min=$1; max=$1}
    if($1<min){min=$1}
    if($1>max){max=$1}
  }
  END {
    avg=sum/NR
    stddev=sqrt(sumsq/NR - avg*avg)
    print "Promedio: " avg " t/s"
    print "Desv. Est: " stddev " t/s"
    print "Mín: " min " t/s"
    print "Máx: " max " t/s"
  }'
```

**Output esperado:**
```
Promedio: 62.35 t/s
Desv. Est: 3.24 t/s
Mín: 58.12 t/s
Máx: 67.89 t/s
```

---

## Conclusión

El sistema de métricas implementado permite:

✅ **Comparar objetivamente** diferentes modelos LLM
✅ **Identificar cuellos de botella** en el pipeline
✅ **Optimizar configuraciones** (batch size, context length)
✅ **Monitorear rendimiento** en producción
✅ **Tomar decisiones informadas** sobre qué modelo usar

### Próximos Pasos

- [ ] Automatizar benchmarking con scripts
- [ ] Crear dashboard de visualización
- [ ] Integrar métricas de calidad (BLEU, ROUGE)
- [ ] Comparar con baseline médico (manual)
- [ ] Optimizar configuraciones de modelos

---

**Fin del documento**
