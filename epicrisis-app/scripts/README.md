# Scripts de Análisis de Métricas

Scripts para extraer y comparar métricas de performance de modelos LLM.

---

## 📋 Scripts Disponibles

### 1. `extract_metrics.sh`

Extrae métricas de un archivo de log.

**Uso:**
```bash
./scripts/extract_metrics.sh [ruta_al_log]
```

**Ejemplos:**
```bash
# Analizar log de hoy
./scripts/extract_metrics.sh backend/logs/flow-$(date +%Y-%m-%d).log

# Analizar log específico
./scripts/extract_metrics.sh backend/logs/flow-2025-12-29.log

# Sin parámetro: usa log de hoy por defecto
./scripts/extract_metrics.sh
```

**Métricas extraídas:**
- Total de generaciones
- Tokens por segundo (promedio, mínimo, máximo, mediana)
- Tiempo de inferencia (promedio, mínimo, máximo)
- Tiempo total (promedio)
- Tokens procesados (input, output, total)
- Métricas RAG (si existen)

---

### 2. `compare_models.sh`

Compara métricas entre dos modelos diferentes.

**Uso:**
```bash
./scripts/compare_models.sh <log_modelo_1> <log_modelo_2>
```

**Ejemplo:**
```bash
# Comparar TinyLlama vs Llama-3
./scripts/compare_models.sh \
  backend/logs/tinyllama_results.log \
  backend/logs/llama3_results.log
```

**Métricas comparadas:**
- Tokens por segundo
- Tiempo de inferencia
- Tiempo total
- Diferencia porcentual entre modelos

---

## 🚀 Flujo de Trabajo Recomendado

### 1. Ejecutar Benchmarks

```bash
# Preparar datos de prueba
cat > test_data.json <<EOF
{
  "clinicalData": {
    "motivo_ingreso": "Dolor torácico",
    "diagnostico_ingreso": [
      {"codigo": "I20.0", "nombre": "Angina inestable"}
    ],
    ...
  }
}
EOF

# Ejecutar 10 requests con Modelo A
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/generate-epicrisis \
    -H "Content-Type: application/json" \
    -d @test_data.json
  sleep 3
done

# Guardar logs en archivo específico
cp backend/logs/flow-$(date +%Y-%m-%d).log backend/logs/model_a.log
```

### 2. Cambiar Modelo

```bash
# Actualizar configuración para usar Modelo B
# Editar backend/.env o backend/src/services/llmService.ts

# Reiniciar servidor
cd backend && npm run dev
```

### 3. Ejecutar Benchmarks con Modelo B

```bash
# Repetir 10 requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/generate-epicrisis \
    -H "Content-Type: application/json" \
    -d @test_data.json
  sleep 3
done

# Guardar logs
cp backend/logs/flow-$(date +%Y-%m-%d).log backend/logs/model_b.log
```

### 4. Comparar Resultados

```bash
# Extraer métricas individuales
./scripts/extract_metrics.sh backend/logs/model_a.log > model_a_metrics.txt
./scripts/extract_metrics.sh backend/logs/model_b.log > model_b_metrics.txt

# Comparar lado a lado
./scripts/compare_models.sh backend/logs/model_a.log backend/logs/model_b.log
```

---

## 📊 Ejemplo de Salida

### extract_metrics.sh

```
================================================
📊 MÉTRICAS DE PERFORMANCE
================================================
Archivo: backend/logs/flow-2025-12-29.log
Fecha: Sun Dec 29 16:45:23 CLT 2025

Total de generaciones: 10

--- TOKENS POR SEGUNDO ---
  Promedio: 62.35 t/s
  Mínimo: 58.12 t/s
  Máximo: 67.89 t/s
  Mediana: 61.45 t/s

--- TIEMPO DE INFERENCIA ---
  Promedio: 2145ms
  Mínimo: 1987ms
  Máximo: 2301ms

--- TIEMPO TOTAL ---
  Promedio: 2153ms

--- TOKENS PROCESADOS ---
  Promedio input: 864 tokens
  Promedio output: 128 tokens
  Promedio total: 992 tokens

================================================
✅ Análisis completado
================================================
```

### compare_models.sh

```
================================================
🔬 COMPARACIÓN DE MODELOS LLM
================================================

Modelo 1: backend/logs/tinyllama.log
Modelo 2: backend/logs/llama3.log
Fecha: Sun Dec 29 16:50:15 CLT 2025

--- TOKENS POR SEGUNDO ---
Modelo               Promedio    Mínimo    Máximo   Samples
-------------------- ---------- ---------- ---------- ----------
Modelo 1               62.35 t/s  58.12 t/s  67.89 t/s         10
Modelo 2               38.67 t/s  35.21 t/s  42.11 t/s         10
📊 Modelo 1 es 61.24% más rápido

--- TIEMPO DE INFERENCIA ---
Modelo               Promedio    Mínimo    Máximo   Samples
-------------------- ---------- ---------- ---------- ----------
Modelo 1              2145ms     1987ms     2301ms         10
Modelo 2              3456ms     3201ms     3789ms         10

--- TIEMPO TOTAL ---
Modelo               Promedio    Mínimo    Máximo   Samples
-------------------- ---------- ---------- ---------- ----------
Modelo 1              2153ms     1995ms     2310ms         10
Modelo 2              3468ms     3215ms     3801ms         10

================================================
✅ Comparación completada
================================================
```

---

## 🔧 Troubleshooting

### Error: "division by zero"

Esto ocurre cuando no hay datos en el log. Soluciones:

```bash
# Verificar que el archivo existe y tiene contenido
ls -lh backend/logs/flow-*.log

# Ver si hay métricas
grep "LLM_METRICS" backend/logs/flow-*.log

# Ejecutar al menos una generación primero
curl -X POST http://localhost:3000/api/generate-epicrisis \
  -H "Content-Type: application/json" \
  -d @test_data.json
```

### Error: "Archivo no encontrado"

```bash
# Crear directorio de logs si no existe
mkdir -p backend/logs

# Verificar que el servidor está corriendo
ps aux | grep node
```

### Los scripts no tienen permisos de ejecución

```bash
chmod +x scripts/*.sh
```

---

## 📝 Personalización

### Agregar nuevas métricas

Editar `extract_metrics.sh` y agregar:

```bash
# Nueva métrica: Longitud de output
echo "--- LONGITUD DE OUTPUT ---"
grep "output_length" "$LOG_FILE" | \
  grep -o '"output_length":[0-9]*' | \
  cut -d: -f2 | \
  awk '{sum+=$1; count++} END {if(count>0) print "  Promedio: " sum/count " caracteres"}'
```

### Exportar a CSV

```bash
# Modificar extract_metrics.sh para generar CSV
echo "timestamp,tokens_per_second,inference_ms,total_ms" > metrics.csv

grep "GENERACIÓN COMPLETADA" backend/logs/flow-*.log | \
  while read line; do
    # Extraer campos y escribir a CSV
    echo "$timestamp,$tps,$inf,$total" >> metrics.csv
  done
```

---

## 🎯 Mejores Prácticas

1. **Consistencia**: Usar los mismos datos de prueba para todos los modelos
2. **Warmup**: Ejecutar 2-3 requests de calentamiento antes de medir
3. **Samples**: Usar al menos 10 samples por modelo
4. **Condiciones**: Misma máquina, mismo estado del sistema
5. **Aislamiento**: Cerrar otras aplicaciones durante benchmarks
6. **Documentar**: Registrar versión de modelo, configuración, hardware

---

## 📚 Referencias

- `LLM_PERFORMANCE_METRICS.md` - Guía completa de métricas
- `PERFORMANCE_LOGGING_README.md` - Resumen del sistema
- `LOGGING_SYSTEM.md` - Sistema general de logging

---

**Última actualización:** 2025-12-29
