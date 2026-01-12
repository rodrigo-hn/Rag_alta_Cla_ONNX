# Prompt para Generar Dataset de 350 Ejemplos - Epicrisis Clínicas

## Prompt Optimizado

```
Eres un experto en documentación clínica hospitalaria chilena. Genera un dataset de entrenamiento para fine-tuning de un modelo de lenguaje que redacta epicrisis médicas.

## FORMATO DE SALIDA
Genera exactamente 350 ejemplos en formato JSONL (un JSON por línea). Cada línea debe seguir este esquema:

{"instruction":"Epicrisis:","input":{"dx":[...],"proc":[...],"tto":[...],"evo":"...","dx_alta":[...],"med":[...]},"output":"Ingresa por..."}

## CAMPOS DEL INPUT
- dx: Array de diagnósticos de ingreso con código CIE-10. Formato: "Nombre diagnóstico (CÓDIGO)"
- proc: Array de procedimientos con código. Formato: "Nombre procedimiento (CÓDIGO)". Puede ser vacío []
- tto: Array de tratamientos intrahospitalarios con código ATC. Formato: "Medicamento dosis vía frecuencia duración (CÓDIGO_ATC)"
- evo: String breve describiendo evolución clínica (máx 50 caracteres)
- dx_alta: Array de diagnósticos al alta con código CIE-10
- med: Array de medicamentos al alta con código ATC. Formato: "Medicamento dosis vía frecuencia duración (CÓDIGO_ATC)"

## CAMPO OUTPUT
- SIEMPRE inicia con "Ingresa por..." (sin datos del paciente)
- Un solo párrafo de texto plano
- Incluir TODOS los códigos entre paréntesis: (J18.9), (J01CA04)
- NO usar formato markdown (negritas, cursivas, corchetes)
- Longitud: 80-200 palabras

## DISTRIBUCIÓN DE ESPECIALIDADES (350 ejemplos)
Genera ejemplos variados cubriendo estas áreas:

### Medicina Interna (100 ejemplos)
- Neumonías (15): adquirida en comunidad, nosocomial, aspirativa, COVID-19
- Infecciones urinarias (12): pielonefritis, ITU complicada, urosepsis
- Cardiovascular (20): IC descompensada, SDCA, FA, crisis HTA, EAP
- Neurológico (15): ACV isquémico, ACV hemorrágico, crisis epiléptica, meningitis
- Gastrointestinal (12): HDA, HDB, cirrosis descompensada, hepatitis
- Respiratorio (10): EPOC exacerbado, asma severa, TEP, derrame pleural
- Metabólico (8): cetoacidosis diabética, estado hiperosmolar, hipoglicemia severa
- Infeccioso (8): celulitis, sepsis, endocarditis, osteomielitis

### Cirugía General (80 ejemplos)
- Colecistitis/colelitiasis (15): aguda, crónica, coledocolitiasis
- Apendicitis (12): aguda, perforada, plastrón apendicular
- Hernias (10): inguinal, umbilical, incisional, complicada
- Obstrucción intestinal (10): bridas, vólvulo, íleo
- Patología colorrectal (10): diverticulitis, absceso perianal, hemorroidectomía
- Pancreatitis (8): biliar, alcohólica, necrotizante
- Trauma abdominal (8): hepático, esplénico, intestinal
- Otros (7): eventración, quiste hidatídico, tumor gástrico

### Traumatología (50 ejemplos)
- Fracturas de cadera (12): cuello femoral, pertrocantérea, subtrocantérea
- Fracturas de extremidad superior (10): húmero, radio, clavícula
- Fracturas de extremidad inferior (10): tibia, tobillo, rótula
- Politraumatismo (8): accidente de tránsito, caída de altura
- Luxaciones (5): hombro, cadera, codo
- Lesiones ligamentarias (5): LCA, menisco, tendón de Aquiles

### Ginecología/Obstetricia (40 ejemplos)
- Cesáreas (10): electiva, urgencia, iterativa
- Patología anexial (8): quiste ovárico, torsión, EPI
- Hemorragia (8): metrorragia, placenta previa, DPPNI
- Embarazo ectópico (6)
- Histerectomía (5): miomatosis, prolapso
- Otros (3): legrado, conización

### Urología (30 ejemplos)
- Litiasis (10): ureteral, renal, vesical
- Patología prostática (8): HPB, retención urinaria, prostatitis
- Tumores (6): vejiga, renal, testicular
- Otros (6): orquiepididimitis, hidrocele, varicocele

### Cardiología intervencionista (25 ejemplos)
- SCA (12): IAMCEST, IAMSEST, angina inestable
- Angioplastía electiva (8): enfermedad coronaria estable
- Otros (5): valvuloplastía, cierre de CIA/CIV

### Neurocirugía (15 ejemplos)
- Tumores (5): meningioma, glioma, metástasis
- Trauma (5): hematoma subdural, epidural, contusión
- Otros (5): hidrocefalia, hernia discal, estenosis

### Pediatría (10 ejemplos)
- Respiratorio (4): bronquiolitis, neumonía, crisis asmática
- Gastrointestinal (3): GEA, invaginación
- Otros (3): convulsión febril, meningitis, sepsis neonatal

## CÓDIGOS MÉDICOS REQUERIDOS

### Códigos CIE-10 frecuentes (usar correctamente)
- J18.9 Neumonía no especificada
- J18.1 Neumonía lobar
- J44.1 EPOC con exacerbación aguda
- J45.9 Asma
- I50.9 Insuficiencia cardíaca
- I21.9 IAM agudo
- I63.9 Infarto cerebral
- I10 Hipertensión esencial
- E11.9 DM tipo 2
- K80.0 Colelitiasis con colecistitis aguda
- K35.8 Apendicitis aguda
- K85.1 Pancreatitis biliar
- N10 Pielonefritis aguda
- S72.0 Fractura de cuello de fémur
- S52.5 Fractura de radio distal

### Códigos ATC frecuentes (usar correctamente)
- J01DD04 Ceftriaxona
- J01CA04 Amoxicilina
- J01CR05 Piperacilina/tazobactam
- J01MA02 Ciprofloxacino
- J01XD01 Metronidazol
- J01FA10 Azitromicina
- B01AB01 Enoxaparina
- B01AC06 Aspirina (antiagregante)
- B01AC04 Clopidogrel
- C03CA01 Furosemida
- C09AA02 Enalapril
- C07AB07 Bisoprolol
- C10AA05 Atorvastatina
- N02BE01 Paracetamol
- M01AE01 Ibuprofeno
- A02BC01 Omeprazol
- H02AB06 Prednisona
- R03AC02 Salbutamol

## EJEMPLOS DE REFERENCIA

Ejemplo 1 (Medicina - Neumonía):
{"instruction":"Epicrisis:","input":{"dx":["Neumonia (J18.9)"],"proc":[],"tto":["Ceftriaxona EV 7d (J01DD04)"],"evo":"Favorable, afebril 3er dia","dx_alta":["Neumonia resuelta (J18.9)"],"med":["Amoxicilina 500mg VO c/8h 5d (J01CA04)"]},"output":"Ingresa por neumonia (J18.9). Recibio ceftriaxona EV por 7 dias (J01DD04), evolucionando favorablemente con defervescencia al tercer dia. Alta con neumonia resuelta (J18.9), indicandose amoxicilina 500mg VO cada 8 horas por 5 dias (J01CA04)."}

Ejemplo 2 (Cirugía - Colecistitis):
{"instruction":"Epicrisis:","input":{"dx":["Colecistitis aguda (K80.0)"],"proc":["Colecistectomia lap (51.23)"],"tto":["Piperacilina/Tazo EV 3d (J01CR05)"],"evo":"Post op sin complicaciones, tolera regimen","dx_alta":["Colecistitis operada (K80.0)"],"med":["Ibuprofeno 400mg VO c/8h SOS (M01AE01)"]},"output":"Ingresa por colecistitis aguda (K80.0). Se realiza colecistectomia laparoscopica (51.23) sin complicaciones. Recibio piperacilina/tazobactam EV por 3 dias (J01CR05). Post operatorio evoluciona sin complicaciones, tolerando regimen. Alta con colecistitis operada (K80.0), indicandose ibuprofeno 400mg VO cada 8 horas SOS dolor (M01AE01)."}

Ejemplo 3 (Traumatología - Fractura):
{"instruction":"Epicrisis:","input":{"dx":["Fractura cuello femur (S72.0)"],"proc":["Artroplastia cadera (81.52)"],"tto":["Enoxaparina 40mg SC c/24h (B01AB01)","Paracetamol 1g EV c/8h (N02BE01)"],"evo":"Inicia KNT 2do dia, logra marcha con andador","dx_alta":["Fractura operada (S72.0)"],"med":["Enoxaparina 40mg SC c/24h 21d (B01AB01)","Paracetamol 1g VO c/8h SOS (N02BE01)"]},"output":"Ingresa por fractura de cuello de femur (S72.0). Se realiza artroplastia parcial de cadera (81.52) sin complicaciones. Recibio enoxaparina 40mg SC cada 24 horas (B01AB01) y paracetamol 1g EV cada 8 horas (N02BE01). Inicia kinesioterapia al segundo dia, logrando marcha con andador. Alta con fractura operada (S72.0), indicandose enoxaparina 40mg SC cada 24 horas por 21 dias (B01AB01) y paracetamol 1g VO cada 8 horas SOS (N02BE01)."}

Ejemplo 4 (Cardiología - IAM):
{"instruction":"Epicrisis:","input":{"dx":["IAM con SDST anterior (I21.0)"],"proc":["Coronariografia (88.56)","Angioplastia primaria DA (36.06)"],"tto":["Heparina EV 48h (B01AB01)","Clopidogrel 75mg VO c/24h (B01AC04)","Aspirina 100mg VO c/24h (B01AC06)"],"evo":"Killip I, sin arritmias, FEVI 45%","dx_alta":["IAM anterior con stent DA (I21.0)"],"med":["Clopidogrel 75mg VO c/24h 12m (B01AC04)","Aspirina 100mg VO c/24h (B01AC06)","Atorvastatina 80mg VO c/noche (C10AA05)","Bisoprolol 2.5mg VO c/24h (C07AB07)","Enalapril 5mg VO c/12h (C09AA02)"]},"output":"Ingresa por infarto agudo al miocardio con supradesnivel ST en pared anterior (I21.0). Coronariografia (88.56) evidencia lesion culpable en DA proximal, realizandose angioplastia primaria con implante de stent (36.06). Recibio heparina EV por 48 horas (B01AB01), clopidogrel 75mg (B01AC04) y aspirina 100mg (B01AC06). Evolucion Killip I sin arritmias, ecocardiograma con FEVI 45%. Alta con IAM anterior tratado con stent en DA (I21.0), indicandose clopidogrel 75mg cada 24 horas por 12 meses (B01AC04), aspirina 100mg cada 24 horas (B01AC06), atorvastatina 80mg cada noche (C10AA05), bisoprolol 2.5mg cada 24 horas (C07AB07) y enalapril 5mg cada 12 horas (C09AA02)."}

## INSTRUCCIONES FINALES
1. Genera los 350 ejemplos en formato JSONL (cada JSON en una línea separada)
2. Asegura variabilidad en presentaciones clínicas y tratamientos
3. Usa códigos CIE-10 y ATC correctos y consistentes
4. El output siempre debe comenzar con "Ingresa por..."
5. Mantén coherencia clínica (tratamientos apropiados para cada diagnóstico)
6. Incluye casos simples y complejos (1-4 diagnósticos, 0-3 procedimientos)
7. Varia la duración de tratamientos y hospitalizaciones realistas

GENERA AHORA LOS 350 EJEMPLOS EN FORMATO JSONL:
```

---

## Análisis de Costos por Modelo Claude

### Estimación de Tokens

| Componente | Tokens Estimados |
|------------|------------------|
| Prompt (instrucciones + ejemplos) | ~3,500 tokens |
| Output (350 ejemplos × ~400 tokens c/u) | ~140,000 tokens |
| **Total Input** | ~3,500 tokens |
| **Total Output** | ~140,000 tokens |

### Precios Claude API (Enero 2025)

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|----------------------|------------------------|
| Claude 3.5 Haiku | $0.80 | $4.00 |
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3 Opus | $15.00 | $75.00 |
| Claude Opus 4.5 | $15.00 | $75.00 |

### Costo Estimado por Modelo

| Modelo | Costo Input | Costo Output | **Total Estimado** | Calidad Esperada |
|--------|-------------|--------------|-------------------|------------------|
| **Claude 3.5 Haiku** | $0.003 | $0.56 | **~$0.56** | Media - puede requerir revisión |
| **Claude 3.5 Sonnet** | $0.01 | $2.10 | **~$2.11** | Alta - recomendado |
| Claude 3 Opus | $0.05 | $10.50 | **~$10.55** | Muy alta - excesivo para tarea |
| Claude Opus 4.5 | $0.05 | $10.50 | **~$10.55** | Muy alta - excesivo para tarea |

### Plan MAX de Claude

Con el **Plan MAX ($100/mes)** tienes acceso ilimitado a:
- Claude 3.5 Sonnet
- Claude 3.5 Haiku
- Claude Opus 4.5 (uso limitado)

**Estrategia recomendada con Plan MAX:**

| Enfoque | Modelo | Costo Real | Observaciones |
|---------|--------|------------|---------------|
| **Recomendado** | Claude 3.5 Sonnet | $0 (incluido en MAX) | Genera los 350 en 1-2 requests |
| Alternativa rápida | Claude 3.5 Haiku | $0 (incluido en MAX) | Puede necesitar 2-3 iteraciones |
| Overkill | Opus 4.5 | Consume cuota limitada | No necesario para esta tarea |

### Recomendación Final

**Usar Claude 3.5 Sonnet con Plan MAX** porque:

1. **Costo efectivo**: $0 adicional (incluido en suscripción)
2. **Calidad**: Genera contenido médico preciso con códigos correctos
3. **Contexto**: Ventana de 200K tokens, suficiente para generar todo en 1-2 requests
4. **Velocidad**: Más rápido que Opus, calidad superior a Haiku

### Estrategia de Generación

```
Request 1: Generar ejemplos 1-175 (Medicina + Cirugía + parte de Trauma)
Request 2: Generar ejemplos 176-350 (resto de especialidades)
```

Cada request usará ~70K tokens de output, bien dentro del límite.

### Consideraciones Adicionales

1. **Validación post-generación**: Verificar códigos CIE-10 y ATC
2. **Deduplicación**: Revisar ejemplos muy similares
3. **Balance**: Confirmar distribución por especialidad
4. **Formato**: Validar que cada línea sea JSON válido

---

## Uso del Prompt

1. Copiar el prompt completo
2. Pegarlo en Claude 3.5 Sonnet (console.anthropic.com o claude.ai con MAX)
3. Para 350 ejemplos, dividir en 2 requests de 175 cada uno
4. Concatenar outputs en un archivo `.jsonl`
5. Validar formato JSON de cada línea
6. Verificar códigos médicos con tabla de referencia
