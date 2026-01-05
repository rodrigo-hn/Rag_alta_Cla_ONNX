#!/bin/bash

# Test validation with episode 1 after UTF-8 fixes

echo "=== Obteniendo datos clínicos del episodio 1 ==="
clinical_data=$(curl -s http://localhost:3000/api/episodes/1 | jq '.clinicalData')

echo ""
echo "=== Verificando datos tienen UTF-8 correcto ==="
echo "$clinical_data" | jq '{
  dx_egreso: .diagnostico_egreso[0].nombre,
  med_alta: .indicaciones_alta.medicamentos[0].duracion,
  recomendacion: .indicaciones_alta.recomendaciones[0]
}'

echo ""
echo "=== Generando epicrisis ==="
response=$(curl -s -X POST http://localhost:3000/api/generate-epicrisis \
  -H "Content-Type: application/json" \
  -d "{\"clinicalData\": $clinical_data}")

echo ""
echo "=== Resultados de validación ==="
echo "$response" | jq '{
  validation_ok: .validation.ok,
  violations_count: (.validation.violations | length),
  top_violations: (.validation.violations[:10] | map({type, mention}))
}'

echo ""
echo "=== Muestra de epicrisis generada ==="
echo "$response" | jq -r '.text | .[0:500]'
