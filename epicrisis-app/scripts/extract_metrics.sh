#!/bin/bash
# extract_metrics.sh
# Script para extraer métricas de performance de los logs

set -e

LOG_FILE="${1:-backend/logs/flow-$(date +%Y-%m-%d).log}"

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Error: Archivo de log no encontrado: $LOG_FILE"
    echo "Uso: $0 [ruta_al_log]"
    exit 1
fi

echo "================================================"
echo "📊 MÉTRICAS DE PERFORMANCE"
echo "================================================"
echo "Archivo: $LOG_FILE"
echo "Fecha: $(date)"
echo ""

# Contar generaciones
GENERATIONS=$(grep -c "=== GENERACIÓN COMPLETADA ===" "$LOG_FILE" 2>/dev/null || echo 0)
echo "Total de generaciones: $GENERATIONS"
echo ""

if [ "$GENERATIONS" -eq 0 ]; then
    echo "⚠️  No hay métricas de generación en este log."
    echo "💡 Ejecuta algunas generaciones primero."
    exit 0
fi

# Tokens por segundo
echo "--- TOKENS POR SEGUNDO ---"
TPS_VALUES=$(grep "tokens_per_second" "$LOG_FILE" 2>/dev/null | \
  grep -o '"tokens_per_second":"[0-9.]*"' | \
  cut -d'"' -f4)

if [ -n "$TPS_VALUES" ]; then
  echo "$TPS_VALUES" | \
    awk 'BEGIN {sum=0; count=0; min=999999; max=0}
         {
           sum+=$1;
           count++;
           if($1<min) min=$1;
           if($1>max) max=$1
         }
         END {
           if(count>0) {
             avg=sum/count;
             print "  Promedio: " avg " t/s";
             print "  Mínimo: " min " t/s";
             print "  Máximo: " max " t/s"
           }
         }'

  # Calcular mediana usando sort
  MEDIAN=$(echo "$TPS_VALUES" | sort -n | awk '{arr[NR]=$1} END {
    if(NR%2==1) {
      print arr[(NR+1)/2]
    } else {
      print (arr[NR/2]+arr[NR/2+1])/2
    }
  }')

  if [ -n "$MEDIAN" ]; then
    echo "  Mediana: $MEDIAN t/s"
  fi
else
  echo "  No hay datos disponibles"
fi
echo ""

# Tiempo de inferencia
echo "--- TIEMPO DE INFERENCIA ---"
INF_VALUES=$(grep "GENERACIÓN COMPLETADA\|REGENERACIÓN COMPLETADA" "$LOG_FILE" 2>/dev/null | \
  grep -o '"inference":"[0-9]*ms' | \
  grep -o '[0-9]*')

if [ -n "$INF_VALUES" ]; then
  echo "$INF_VALUES" | \
    awk 'BEGIN {sum=0; count=0; min=999999; max=0}
         {
           sum+=$1;
           count++;
           if($1<min) min=$1;
           if($1>max) max=$1
         }
         END {
           if(count>0) {
             print "  Promedio: " sum/count "ms";
             print "  Mínimo: " min "ms";
             print "  Máximo: " max "ms"
           }
         }'
else
  echo "  No hay datos disponibles"
fi
echo ""

# Tiempo total
echo "--- TIEMPO TOTAL ---"
grep "total_time_ms" "$LOG_FILE" 2>/dev/null | \
  grep -o '"total_time_ms":[0-9]*' | \
  cut -d: -f2 | \
  head -"$GENERATIONS" | \
  awk 'BEGIN {sum=0; count=0}
       {sum+=$1; count++}
       END {if(count>0) print "  Promedio: " sum/count "ms"}'
echo ""

# Tokens procesados
echo "--- TOKENS PROCESADOS ---"
INPUT_TOKENS=$(grep "input_tokens" "$LOG_FILE" 2>/dev/null | \
  grep -o '"input_tokens":[0-9]*' | \
  cut -d: -f2 | \
  awk 'BEGIN {sum=0; count=0} {sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')

OUTPUT_TOKENS=$(grep "output_tokens" "$LOG_FILE" 2>/dev/null | \
  grep -o '"output_tokens":[0-9]*' | \
  cut -d: -f2 | \
  awk 'BEGIN {sum=0; count=0} {sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')

echo "  Promedio input: $INPUT_TOKENS tokens"
echo "  Promedio output: $OUTPUT_TOKENS tokens"

# Calcular total de manera segura
TOTAL_TOKENS=$(awk "BEGIN {printf \"%.0f\", $INPUT_TOKENS + $OUTPUT_TOKENS}")
echo "  Promedio total: $TOTAL_TOKENS tokens"
echo ""

# Métricas RAG (si existen)
RAG_INDEXING=$(grep -c "=== INDEXACIÓN COMPLETADA ===" "$LOG_FILE" 2>/dev/null || echo 0)

if [ "$RAG_INDEXING" -gt 0 ] 2>/dev/null; then
    echo "--- MÉTRICAS RAG ---"
    echo "Total de indexaciones: $RAG_INDEXING"

    # Embeddings por segundo
    grep "embeddings_per_second" "$LOG_FILE" 2>/dev/null | \
      grep -o '"embeddings_per_second":"[0-9.]*"' | \
      cut -d'"' -f4 | \
      awk 'BEGIN {sum=0; count=0}
           {sum+=$1; count++}
           END {if(count>0) print "  Embeddings/segundo: " sum/count}'

    # Chunks promedio
    grep "chunks_count" "$LOG_FILE" 2>/dev/null | \
      grep -o '"chunks_count":[0-9]*' | \
      cut -d: -f2 | \
      awk 'BEGIN {sum=0; count=0}
           {sum+=$1; count++}
           END {if(count>0) print "  Chunks promedio: " sum/count}'
    echo ""
fi

echo "================================================"
echo "✅ Análisis completado"
echo "================================================"
