
# Proyecto Epicrisis Automática Local

## Objetivo
Generar epicrisis de alta hospitalaria automáticamente en entorno local, usando Oracle 19c + LLM ligero (Gemma 270M) en navegador, sin exponer datos clínicos.

## Arquitectura
- Oracle 19c: fuente de datos clínicos y cálculo de resúmenes
- Capa ETL: transforma prestaciones, laboratorios y evoluciones en JSON canónico
- Frontend web: transformers.js + Gemma 270M
- Validación: listas blancas anti-alucinación

## Flujo
1. Oracle consolida datos por atención.
2. Se generan JSON estructurados (diagnósticos, tratamientos, labs, indicaciones).
3. LLM genera epicrisis a partir del JSON.
4. Validador bloquea menciones no permitidas.

## Laboratorios
Desde prestaciones LIS:
- Se toman solo valores numéricos.
- Se calcula por analito: ingreso / último / min / max.
- Se genera JSON `laboratorios_resumen`.

## Ejemplo estructura JSON
(ver conversación)

## Prompt productivo
(ver conversación)

## Beneficios
- Privacidad total
- Alta velocidad
- Cero alucinaciones
- Cumplimiento clínico

## Futuras extensiones
- Soporte multi-clínica
- Dashboards de validación
