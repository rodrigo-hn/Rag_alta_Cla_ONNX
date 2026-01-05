#!/bin/bash
# compare_models.sh
# Compara métricas entre dos archivos de log (dos modelos diferentes)

set -e

if [ "$#" -ne 2 ]; then
    echo "Uso: $0 <log_modelo_1> <log_modelo_2>"
    echo "Ejemplo: $0 backend/logs/tinyllama.log backend/logs/llama3.log"
    exit 1
fi

LOG1="$1"
LOG2="$2"

if [ ! -f "$LOG1" ] || [ ! -f "$LOG2" ]; then
    echo "❌ Error: Uno o ambos archivos no existen"
    exit 1
fi

echo "================================================"
echo "🔬 COMPARACIÓN DE MODELOS LLM"
echo "================================================"
echo ""
echo "Modelo 1: $LOG1"
echo "Modelo 2: $LOG2"
echo "Fecha: $(date)"
echo ""

# Función para calcular estadísticas
calc_stats() {
    local file=$1
    local pattern=$2
    local field=$3

    grep "$pattern" "$file" 2>/dev/null | \
      grep -o "\"$field\":\"\\?[0-9.]*\"\\?" | \
      grep -o '[0-9.]*' | \
      awk 'BEGIN {sum=0; count=0; min=999999; max=0}
           {
             sum+=$1;
             count++;
             if($1<min) min=$1;
             if($1>max) max=$1
           }
           END {
             if(count>0) {
               printf "%.2f|%.2f|%.2f|%d", sum/count, min, max, count
             } else {
               print "N/A|N/A|N/A|0"
             }
           }'
}

# Tokens por segundo
echo "--- TOKENS POR SEGUNDO ---"
MODEL1_TPS=$(calc_stats "$LOG1" "tokens_per_second" "tokens_per_second")
MODEL2_TPS=$(calc_stats "$LOG2" "tokens_per_second" "tokens_per_second")

IFS='|' read -r m1_avg m1_min m1_max m1_count <<< "$MODEL1_TPS"
IFS='|' read -r m2_avg m2_min m2_max m2_count <<< "$MODEL2_TPS"

printf "%-20s %10s %10s %10s %10s\n" "Modelo" "Promedio" "Mínimo" "Máximo" "Samples"
printf "%-20s %10s %10s %10s %10s\n" "--------------------" "----------" "----------" "----------" "----------"
printf "%-20s %10s %10s %10s %10s\n" "Modelo 1" "$m1_avg t/s" "$m1_min t/s" "$m1_max t/s" "$m1_count"
printf "%-20s %10s %10s %10s %10s\n" "Modelo 2" "$m2_avg t/s" "$m2_min t/s" "$m2_max t/s" "$m2_count"

# Calcular diferencia porcentual
if [ "$m1_avg" != "N/A" ] && [ "$m2_avg" != "N/A" ]; then
    DIFF=$(echo "scale=2; (($m2_avg - $m1_avg) / $m1_avg) * 100" | bc)
    if (( $(echo "$DIFF > 0" | bc -l) )); then
        echo "📊 Modelo 2 es ${DIFF}% más rápido"
    else
        DIFF=$(echo "scale=2; $DIFF * -1" | bc)
        echo "📊 Modelo 1 es ${DIFF}% más rápido"
    fi
fi
echo ""

# Tiempo de inferencia
echo "--- TIEMPO DE INFERENCIA ---"
MODEL1_INF=$(calc_stats "$LOG1" "inference_ms" "inference_ms")
MODEL2_INF=$(calc_stats "$LOG2" "inference_ms" "inference_ms")

IFS='|' read -r m1_avg m1_min m1_max m1_count <<< "$MODEL1_INF"
IFS='|' read -r m2_avg m2_min m2_max m2_count <<< "$MODEL2_INF"

printf "%-20s %10s %10s %10s %10s\n" "Modelo" "Promedio" "Mínimo" "Máximo" "Samples"
printf "%-20s %10s %10s %10s %10s\n" "--------------------" "----------" "----------" "----------" "----------"
printf "%-20s %10s %10s %10s %10s\n" "Modelo 1" "${m1_avg}ms" "${m1_min}ms" "${m1_max}ms" "$m1_count"
printf "%-20s %10s %10s %10s %10s\n" "Modelo 2" "${m2_avg}ms" "${m2_min}ms" "${m2_max}ms" "$m2_count"
echo ""

# Tiempo total
echo "--- TIEMPO TOTAL ---"
MODEL1_TOT=$(calc_stats "$LOG1" "total_time_ms" "total_time_ms")
MODEL2_TOT=$(calc_stats "$LOG2" "total_time_ms" "total_time_ms")

IFS='|' read -r m1_avg m1_min m1_max m1_count <<< "$MODEL1_TOT"
IFS='|' read -r m2_avg m2_min m2_max m2_count <<< "$MODEL2_TOT"

printf "%-20s %10s %10s %10s %10s\n" "Modelo" "Promedio" "Mínimo" "Máximo" "Samples"
printf "%-20s %10s %10s %10s %10s\n" "--------------------" "----------" "----------" "----------" "----------"
printf "%-20s %10s %10s %10s %10s\n" "Modelo 1" "${m1_avg}ms" "${m1_min}ms" "${m1_max}ms" "$m1_count"
printf "%-20s %10s %10s %10s %10s\n" "Modelo 2" "${m2_avg}ms" "${m2_min}ms" "${m2_max}ms" "$m2_count"
echo ""

echo "================================================"
echo "✅ Comparación completada"
echo "================================================"
