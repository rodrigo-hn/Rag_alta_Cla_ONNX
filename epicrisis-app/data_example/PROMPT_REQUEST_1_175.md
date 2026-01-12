# Request 1: Ejemplos 1-175 (Medicina Interna + Cirugía General)

## Prompt para Claude 3.5 Sonnet

```
Eres un experto en documentación clínica hospitalaria chilena. Genera un dataset de entrenamiento para fine-tuning de un modelo que redacta epicrisis médicas.

## FORMATO DE SALIDA
Genera exactamente 175 ejemplos en formato JSONL (un JSON por línea). Cada línea debe seguir este esquema:

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

---

## DISTRIBUCIÓN REQUEST 1 (175 ejemplos)

### MEDICINA INTERNA (95 ejemplos)

#### Neumonías (15 ejemplos)
1-3: Neumonía adquirida en comunidad (J18.9) - diferentes severidades
4-6: Neumonía lobar (J18.1) - con/sin derrame
7-9: Neumonía aspirativa (J69.0) - pacientes añosos, ACV previo
10-12: Neumonía por COVID-19 (U07.1) - leve, moderada, severa
13-15: Neumonía nosocomial (J18.8) - post quirúrgica, VMI

#### Infecciones Urinarias (12 ejemplos)
16-19: Pielonefritis aguda (N10) - simple, complicada, recurrente, embarazada
20-22: ITU complicada (N39.0) - sonda vesical, litiasis, diabético
23-27: Urosepsis (A41.9 + N10) - diferentes focos y gérmenes

#### Cardiovascular (20 ejemplos)
28-32: IC descompensada (I50.9) - diferentes etiologías (isquémica, HTA, valvular)
33-36: Síndrome coronario agudo (I20.0) - angina inestable, diferentes territorios
37-40: Fibrilación auricular (I48.9) - debut, RVR, cardioversión, anticoagulación
41-43: Crisis hipertensiva (I10) - urgencia vs emergencia, con/sin daño órgano
44-47: Edema pulmonar agudo (J81) - cardiogénico, diferentes causas

#### Neurológico (15 ejemplos)
48-52: ACV isquémico (I63.9) - ACM, ACA, territorio posterior, lacunar
53-55: ACV hemorrágico (I61.9) - putaminal, lobar, cerebeloso
56-58: Crisis epiléptica (G40.9) - debut, status, breakthrough
59-62: Meningitis (G03.9) - bacteriana, viral, TB

#### Gastrointestinal (12 ejemplos)
63-66: Hemorragia digestiva alta (K92.0) - úlcera, várices, Mallory-Weiss
67-69: Hemorragia digestiva baja (K92.1) - diverticular, angiodisplasia
70-73: Cirrosis descompensada (K74.6) - ascitis, PBE, encefalopatía, SHR
74-77: Hepatitis aguda (K72.0) - viral, alcohólica, tóxica

#### Respiratorio (10 ejemplos)
78-80: EPOC exacerbado (J44.1) - infeccioso, no infeccioso, con IRA
81-83: Asma severa (J45.9) - crisis, status asmático
84-86: TEP (I26.9) - masivo, submasivo, subsegmentario
87-88: Derrame pleural (J90) - paraneumónico, maligno

#### Metabólico (8 ejemplos)
89-91: Cetoacidosis diabética (E10.1) - leve, moderada, severa
92-94: Estado hiperosmolar (E11.0) - diferentes osmolaridades
95-96: Hipoglicemia severa (E16.2) - insulina, sulfonilureas

### CIRUGÍA GENERAL (80 ejemplos)

#### Colecistitis/Colelitiasis (15 ejemplos)
97-100: Colecistitis aguda (K80.0) - litiásica, alitiásica, gangrenosa
101-103: Colecistitis crónica (K80.1) - electiva, sintomática
104-107: Coledocolitiasis (K80.5) - con/sin colangitis, CPRE + colecistectomía
108-111: Colangitis aguda (K83.0) - leve, moderada, severa (Tokio)

#### Apendicitis (12 ejemplos)
112-115: Apendicitis aguda (K35.8) - no complicada, diferentes presentaciones
116-118: Apendicitis perforada (K35.2) - con/sin peritonitis, absceso
119-123: Plastrón apendicular (K35.3) - manejo conservador, drenaje, diferido

#### Hernias (10 ejemplos)
124-126: Hernia inguinal (K40.9) - unilateral, bilateral, recidivada
127-128: Hernia umbilical (K42.9) - simple, complicada
129-130: Hernia incisional (K43.9) - pequeña, gigante
131-133: Hernia complicada (K40.3/K42.0) - atascada, estrangulada

#### Obstrucción Intestinal (10 ejemplos)
134-137: Obstrucción por bridas (K56.5) - parcial, completa, recurrente
138-140: Vólvulo (K56.2) - sigmoides, ciego, intestino delgado
141-143: Íleo (K56.0) - postoperatorio, metabólico, farmacológico

#### Patología Colorrectal (10 ejemplos)
144-146: Diverticulitis (K57.3) - no complicada, absceso, perforación (Hinchey)
147-149: Absceso perianal (K61.0) - simple, complejo, Fournier
150-153: Hemorroidectomía (K64.9) - trombosada, prolapso, sangrado

#### Pancreatitis (8 ejemplos)
154-156: Pancreatitis biliar (K85.1) - leve, moderada, severa (Atlanta)
157-159: Pancreatitis alcohólica (K85.2) - primer episodio, recurrente
160-161: Pancreatitis necrotizante (K85.9) - infectada, colección

#### Trauma Abdominal (8 ejemplos)
162-164: Trauma hepático (S36.1) - grados I-III, conservador vs quirúrgico
165-167: Trauma esplénico (S36.0) - esplenectomía, conservador
168-169: Trauma intestinal (S36.4) - perforación, hematoma

#### Otros Cirugía (7 ejemplos)
170-171: Eventración (K43.9) - reparación con malla
172-173: Quiste hidatídico hepático (B67.0)
174-175: Tumor gástrico (C16.9) - gastrectomía

---

## CÓDIGOS DE REFERENCIA

### CIE-10 Frecuentes
- J18.9 Neumonía no especificada
- J18.1 Neumonía lobar
- J69.0 Neumonía aspirativa
- U07.1 COVID-19
- N10 Pielonefritis aguda
- N39.0 ITU
- A41.9 Sepsis
- I50.9 Insuficiencia cardíaca
- I20.0 Angina inestable
- I21.0/I21.1/I21.9 IAM
- I48.9 Fibrilación auricular
- I10 Hipertensión esencial
- J81 Edema pulmonar
- I63.9 Infarto cerebral
- I61.9 Hemorragia intracerebral
- G40.9 Epilepsia
- G03.9 Meningitis
- K92.0 Hematemesis/HDA
- K92.1 Melena/HDB
- K74.6 Cirrosis
- J44.1 EPOC exacerbado
- J45.9 Asma
- I26.9 TEP
- E10.1/E11.0 Cetoacidosis/Hiperosmolar
- K80.0 Colecistitis aguda
- K80.5 Coledocolitiasis
- K83.0 Colangitis
- K35.8 Apendicitis
- K40.9 Hernia inguinal
- K56.5 Obstrucción por bridas
- K57.3 Diverticulitis
- K85.1 Pancreatitis biliar
- S36.1 Trauma hepático

### Códigos ATC Frecuentes
- J01DD04 Ceftriaxona
- J01CA04 Amoxicilina
- J01CR05 Piperacilina/tazobactam
- J01DH02 Meropenem
- J01MA02 Ciprofloxacino
- J01XD01 Metronidazol
- J01FA10 Azitromicina
- J01XX08 Linezolid
- J02AC01 Fluconazol
- B01AB01 Enoxaparina
- B01AB05 Heparina no fraccionada
- B01AC06 Aspirina
- B01AC04 Clopidogrel
- B01AF01 Rivaroxaban
- C03CA01 Furosemida
- C09AA02 Enalapril
- C07AB07 Bisoprolol
- C07AB02 Metoprolol
- C08CA01 Amlodipino
- C10AA05 Atorvastatina
- N02BE01 Paracetamol
- M01AE01 Ibuprofeno
- N02AX02 Tramadol
- A02BC01 Omeprazol
- A02BC02 Pantoprazol
- H02AB06 Prednisona
- H02AB02 Dexametasona
- R03AC02 Salbutamol
- R03BB01 Ipratropio
- A10AB01 Insulina cristalina
- A10AE04 Insulina glargina

### Códigos Procedimientos
- 51.23 Colecistectomía laparoscópica
- 51.22 Colecistectomía abierta
- 51.10 CPRE con papilotomía
- 47.01 Apendicectomía laparoscópica
- 47.09 Apendicectomía abierta
- 53.00 Hernioplastía inguinal
- 54.11 Laparotomía exploradora
- 45.73 Resección anterior
- 46.10 Colostomía
- 88.91 RM cerebro
- 88.72 Ecocardiograma
- 89.52 Electroencefalograma

---

## EJEMPLOS DE REFERENCIA

### Medicina Interna - Neumonía
{"instruction":"Epicrisis:","input":{"dx":["Neumonia adquirida en comunidad (J18.9)","HTA (I10)"],"proc":[],"tto":["Ceftriaxona 2g EV c/24h 7d (J01DD04)","Azitromicina 500mg VO c/24h 5d (J01FA10)"],"evo":"Favorable, afebril 3er dia, sin O2 5to dia","dx_alta":["Neumonia resuelta (J18.9)","HTA (I10)"],"med":["Amoxicilina/Ac.clavulanico 875mg VO c/12h 5d (J01CR02)","Losartan 50mg VO c/24h (C09CA01)"]},"output":"Ingresa por neumonia adquirida en comunidad (J18.9) en paciente con hipertension arterial (I10). Recibio ceftriaxona 2g EV cada 24 horas por 7 dias (J01DD04) y azitromicina 500mg VO cada 24 horas por 5 dias (J01FA10), evolucionando favorablemente con defervescencia al tercer dia y retiro de oxigeno al quinto dia. Alta con neumonia resuelta (J18.9) e HTA (I10), indicandose amoxicilina/acido clavulanico 875mg VO cada 12 horas por 5 dias (J01CR02) y losartan 50mg VO cada 24 horas (C09CA01)."}

### Medicina Interna - IC Descompensada
{"instruction":"Epicrisis:","input":{"dx":["IC descompensada CF IV (I50.9)","Fibrilacion auricular RVR (I48.9)","DM2 (E11.9)"],"proc":["Ecocardiograma (88.72)"],"tto":["Furosemida 40mg EV c/8h (C03CA01)","Digoxina 0.25mg VO c/24h (C01AA05)","Metformina 850mg VO c/12h (A10BA02)"],"evo":"Balance -4L en 72h, FC controlada, CF II al alta","dx_alta":["IC compensada CF II (I50.9)","FA con RV controlada (I48.9)","DM2 (E11.9)"],"med":["Furosemida 40mg VO c/12h (C03CA01)","Digoxina 0.25mg VO c/24h (C01AA05)","Bisoprolol 2.5mg VO c/24h (C07AB07)","Enalapril 10mg VO c/12h (C09AA02)","Metformina 850mg VO c/12h (A10BA02)"]},"output":"Ingresa por insuficiencia cardiaca descompensada en capacidad funcional IV (I50.9) asociada a fibrilacion auricular con respuesta ventricular rapida (I48.9) y diabetes mellitus tipo 2 (E11.9). Ecocardiograma (88.72) muestra FEVI 35% con disfuncion diastolica. Recibio furosemida 40mg EV cada 8 horas (C03CA01) y digoxina 0.25mg VO (C01AA05), logrando balance negativo de 4 litros en 72 horas con control de frecuencia cardiaca. Alta en capacidad funcional II con IC compensada (I50.9), FA con respuesta ventricular controlada (I48.9) y DM2 (E11.9), indicandose furosemida 40mg VO cada 12 horas (C03CA01), digoxina 0.25mg cada 24 horas (C01AA05), bisoprolol 2.5mg cada 24 horas (C07AB07), enalapril 10mg cada 12 horas (C09AA02) y metformina 850mg cada 12 horas (A10BA02)."}

### Cirugía - Apendicitis Complicada
{"instruction":"Epicrisis:","input":{"dx":["Apendicitis aguda perforada (K35.2)","Peritonitis localizada (K65.0)"],"proc":["Apendicectomia laparoscopica (47.01)","Lavado peritoneal (54.25)"],"tto":["Ceftriaxona 2g EV c/24h 5d (J01DD04)","Metronidazol 500mg EV c/8h 5d (J01XD01)","Paracetamol 1g EV c/8h (N02BE01)"],"evo":"Post op febril 48h, luego afebril, tolera regimen 3er dia","dx_alta":["Apendicitis perforada operada (K35.2)"],"med":["Metronidazol 500mg VO c/8h 5d (J01XD01)","Ciprofloxacino 500mg VO c/12h 5d (J01MA02)","Paracetamol 1g VO c/8h SOS (N02BE01)"]},"output":"Ingresa por apendicitis aguda perforada (K35.2) con peritonitis localizada (K65.0). Se realiza apendicectomia laparoscopica (47.01) con lavado peritoneal (54.25), encontrando apendice gangrenoso perforado con liquido purulento en fosa iliaca derecha. Recibio ceftriaxona 2g EV cada 24 horas (J01DD04) y metronidazol 500mg EV cada 8 horas (J01XD01) por 5 dias, con paracetamol 1g EV cada 8 horas (N02BE01). Post operatorio cursa febril las primeras 48 horas, luego afebril, tolerando regimen liviano al tercer dia. Alta con apendicitis perforada operada (K35.2), indicandose metronidazol 500mg VO cada 8 horas por 5 dias (J01XD01), ciprofloxacino 500mg VO cada 12 horas por 5 dias (J01MA02) y paracetamol 1g VO cada 8 horas SOS (N02BE01)."}

### Cirugía - Pancreatitis Biliar
{"instruction":"Epicrisis:","input":{"dx":["Pancreatitis aguda biliar moderada (K85.1)","Colelitiasis (K80.2)"],"proc":["CPRE con papilotomia (51.10)"],"tto":["Omeprazol 40mg EV c/24h 5d (A02BC01)","Metamizol 1g EV c/8h (N02BB02)","Cristaloides EV"],"evo":"Lipasa en descenso, realimenta 4to dia, dolor controlado","dx_alta":["Pancreatitis biliar resuelta (K85.1)","Colelitiasis (K80.2)"],"med":["Omeprazol 20mg VO c/24h 14d (A02BC01)","Paracetamol 1g VO c/8h SOS (N02BE01)"]},"output":"Ingresa por pancreatitis aguda biliar moderada (K85.1) con colelitiasis (K80.2). Se realiza CPRE con papilotomia (51.10) con extraccion de barro biliar. Recibio omeprazol 40mg EV cada 24 horas (A02BC01), metamizol 1g EV cada 8 horas (N02BB02) y reposicion de volumen con cristaloides. Evoluciona con lipasa en descenso progresivo, reiniciando alimentacion oral al cuarto dia con buena tolerancia y dolor controlado. Alta con pancreatitis biliar resuelta (K85.1) y colelitiasis pendiente de colecistectomia electiva (K80.2), indicandose omeprazol 20mg VO cada 24 horas por 14 dias (A02BC01) y paracetamol 1g VO cada 8 horas SOS (N02BE01)."}

---

## INSTRUCCIONES FINALES

1. Genera exactamente 175 ejemplos numerados del 1 al 175
2. Sigue la distribución por patología indicada arriba
3. Cada ejemplo en formato JSONL (una línea por JSON)
4. El output SIEMPRE comienza con "Ingresa por..."
5. Usa códigos CIE-10 y ATC correctos de la lista de referencia
6. Varía severidad, comorbilidades y tratamientos
7. Incluye casos simples (1 diagnóstico) y complejos (2-4 diagnósticos)
8. Mantén coherencia clínica entre diagnóstico y tratamiento

GENERA AHORA LOS 175 EJEMPLOS EN FORMATO JSONL:
```
