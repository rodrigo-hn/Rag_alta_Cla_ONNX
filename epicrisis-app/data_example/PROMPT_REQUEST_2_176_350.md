# Request 2: Ejemplos 176-350 (Traumatología, Ginecología, Urología, Cardiología, Neurocirugía, Pediatría)

## Prompt para Claude 3.5 Sonnet

```
Eres un experto en documentación clínica hospitalaria chilena. Genera un dataset de entrenamiento para fine-tuning de un modelo que redacta epicrisis médicas.

## FORMATO DE SALIDA
Genera exactamente 175 ejemplos en formato JSONL (un JSON por línea), numerados del 176 al 350. Cada línea debe seguir este esquema:

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
- Incluir TODOS los códigos entre paréntesis: (S72.0), (B01AB01)
- NO usar formato markdown (negritas, cursivas, corchetes)
- Longitud: 80-200 palabras

---

## DISTRIBUCIÓN REQUEST 2 (175 ejemplos: 176-350)

### TRAUMATOLOGÍA (50 ejemplos: 176-225)

#### Fracturas de Cadera (12 ejemplos: 176-187)
176-178: Fractura cuello femoral (S72.0) - Garden I-II (osteosíntesis), Garden III-IV (prótesis)
179-181: Fractura pertrocantérea (S72.1) - estable, inestable, con extensión subtrocantérea
182-184: Fractura subtrocantérea (S72.2) - clavo endomedular, diferentes patrones
185-187: Fractura periprotésica (M96.6) - Vancouver B, revisión de prótesis

#### Fracturas Extremidad Superior (10 ejemplos: 188-197)
188-190: Fractura húmero proximal (S42.2) - conservador, placa, prótesis
191-193: Fractura diáfisis humeral (S42.3) - conservador, clavo, placa
194-195: Fractura radio distal (S52.5) - Colles, Smith, placa volar
196-197: Fractura clavícula (S42.0) - tercio medio, lateral

#### Fracturas Extremidad Inferior (10 ejemplos: 198-207)
198-200: Fractura diáfisis tibial (S82.2) - cerrada, expuesta, clavo endomedular
201-203: Fractura tobillo (S82.8) - unimaleolar, bimaleolar, trimaleolar
204-205: Fractura rótula (S82.0) - cerclaje, patelectomía parcial
206-207: Fractura platillos tibiales (S82.1) - Schatzker II, VI

#### Politraumatismo (8 ejemplos: 208-215)
208-210: Accidente de tránsito (V89.2) - múltiples fracturas, trauma torácico asociado
211-213: Caída de altura (W13.9) - fracturas vertebrales, pélvicas, calcáneo
214-215: Atropello (V03.1) - trauma craneal + ortopédico

#### Luxaciones (5 ejemplos: 216-220)
216-217: Luxación hombro (S43.0) - anterior recidivante, posterior
218-219: Luxación cadera (S73.0) - posterior traumática, protésica
220: Luxación codo (S53.1) - simple

#### Lesiones Ligamentarias (5 ejemplos: 221-225)
221-222: Rotura LCA (S83.5) - reconstrucción artroscópica
223-224: Lesión meniscal (S83.2) - meniscectomía, reparación
225: Rotura tendón Aquiles (S86.0) - reparación quirúrgica

---

### GINECOLOGÍA/OBSTETRICIA (40 ejemplos: 226-265)

#### Cesáreas (10 ejemplos: 226-235)
226-228: Cesárea electiva (O82.0) - presentación podálica, cesárea anterior, macrosomía
229-231: Cesárea de urgencia (O82.1) - sufrimiento fetal, DPPNI, prolapso cordón
232-235: Cesárea iterativa (O82.0) - segunda, tercera, con ligadura tubaria

#### Patología Anexial (8 ejemplos: 236-243)
236-238: Quiste ovárico (N83.2) - simple, complejo, teratoma
239-241: Torsión anexial (N83.5) - destorsión, anexectomía
242-243: Enfermedad pélvica inflamatoria (N73.9) - absceso tubo-ovárico

#### Hemorragia Obstétrica (8 ejemplos: 244-251)
244-246: Metrorragia (N93.9) - disfuncional, miomas, pólipo
247-248: Placenta previa (O44.1) - oclusiva total, marginal
249-251: DPPNI (O45.9) - leve, moderado, severo

#### Embarazo Ectópico (6 ejemplos: 252-257)
252-254: Embarazo tubario (O00.1) - salpingectomía laparoscópica, abierta
255-257: Embarazo ectópico roto (O00.1) - hemoperitoneo, inestabilidad

#### Histerectomía (5 ejemplos: 258-262)
258-259: Miomatosis uterina (D25.9) - histerectomía total abdominal
260-261: Prolapso genital (N81.9) - histerectomía vaginal + colporrafia
262: Adenomiosis (N80.0) - histerectomía laparoscópica

#### Otros Ginecología (3 ejemplos: 263-265)
263: Legrado uterino (Z30.2) - aborto incompleto
264: Conización cervical (N87.1) - NIC III
265: Bartholinitis (N75.0) - marsupialización

---

### UROLOGÍA (30 ejemplos: 266-295)

#### Litiasis Urinaria (10 ejemplos: 266-275)
266-268: Litiasis ureteral (N20.1) - ureteroscopía, litotricia
269-271: Litiasis renal (N20.0) - nefrolitotomía percutánea, litotricia
272-273: Litiasis vesical (N21.0) - cistolitotomía
274-275: Cólico renal complicado (N23) - pionefrosis, sepsis

#### Patología Prostática (8 ejemplos: 276-283)
276-278: HPB (N40) - RTU prostática, adenomectomía
279-281: Retención urinaria aguda (R33) - sonda vesical, RTU diferida
282-283: Prostatitis aguda (N41.0) - manejo antibiótico

#### Tumores Urológicos (6 ejemplos: 284-289)
284-285: Cáncer vesical (C67.9) - RTU vesical, cistectomía
286-287: Cáncer renal (C64) - nefrectomía radical, parcial
288-289: Cáncer testicular (C62.9) - orquiectomía radical

#### Otros Urología (6 ejemplos: 290-295)
290-291: Orquiepididimitis (N45.9) - manejo antibiótico
292-293: Hidrocele (N43.3) - hidrocelectomía
294: Varicocele (I86.1) - varicocelectomía
295: Torsión testicular (N44.0) - destorsión, orquiectomía

---

### CARDIOLOGÍA INTERVENCIONISTA (25 ejemplos: 296-320)

#### SCA con Intervención (12 ejemplos: 296-307)
296-298: IAMCEST anterior (I21.0) - angioplastía primaria DA
299-301: IAMCEST inferior (I21.1) - angioplastía CD, complicaciones
302-304: IAMCEST lateral (I21.2) - angioplastía Cx
305-307: IAMSEST (I21.4) - estrategia invasiva precoz, multivaso

#### Angioplastía Electiva (8 ejemplos: 308-315)
308-310: Enfermedad coronaria estable (I25.1) - stent DA, Cx
311-313: Enfermedad multivaso (I25.1) - angioplastía vs cirugía
314-315: Reestenosis intrastent (T82.8) - angioplastía con balón medicado

#### Otros Procedimientos (5 ejemplos: 316-320)
316-317: Valvuloplastía mitral (I05.0) - estenosis mitral reumática
318-319: Cierre CIA (Q21.1) - dispositivo percutáneo
320: Implante marcapasos (I44.2) - bloqueo AV completo

---

### NEUROCIRUGÍA (15 ejemplos: 321-335)

#### Tumores Cerebrales (5 ejemplos: 321-325)
321-322: Meningioma (D32.0) - convexidad, base de cráneo
323-324: Glioma (C71.9) - resección, biopsia
325: Metástasis cerebral (C79.3) - resección única

#### Trauma Craneal (5 ejemplos: 326-330)
326-327: Hematoma subdural (S06.5) - agudo, crónico, craneotomía
328-329: Hematoma epidural (S06.4) - evacuación urgente
330: Contusión cerebral (S06.3) - manejo conservador, craniectomía

#### Otros Neurocirugía (5 ejemplos: 331-335)
331-332: Hidrocefalia (G91.9) - DVP, ventriculostomía
333-334: Hernia discal lumbar (M51.1) - discectomía L4-L5, L5-S1
335: Estenosis lumbar (M48.0) - laminectomía descompresiva

---

### PEDIATRÍA (15 ejemplos: 336-350)

#### Respiratorio Pediátrico (5 ejemplos: 336-340)
336-337: Bronquiolitis (J21.9) - VRS, manejo O2, NBZ
338-339: Neumonía pediátrica (J18.9) - viral, bacteriana
340: Crisis asmática pediátrica (J45.9) - exacerbación severa

#### Gastrointestinal Pediátrico (5 ejemplos: 341-345)
341-342: GEA con deshidratación (A09) - leve, moderada
343-344: Invaginación intestinal (K56.1) - reducción hidrostática, quirúrgica
345: Estenosis pilórica (Q40.0) - piloromiotomía

#### Otros Pediatría (5 ejemplos: 346-350)
346-347: Convulsión febril (R56.0) - simple, compleja
348-349: Meningitis pediátrica (G03.9) - bacteriana, viral
350: Sepsis neonatal (P36.9) - precoz, tardía

---

## CÓDIGOS DE REFERENCIA

### CIE-10 Traumatología
- S72.0 Fractura cuello femoral
- S72.1 Fractura pertrocantérea
- S72.2 Fractura subtrocantérea
- S42.2 Fractura húmero proximal
- S42.3 Fractura diáfisis humeral
- S52.5 Fractura radio distal
- S42.0 Fractura clavícula
- S82.2 Fractura tibia
- S82.8 Fractura tobillo
- S82.0 Fractura rótula
- S43.0 Luxación hombro
- S83.5 Rotura LCA
- S86.0 Rotura tendón Aquiles

### CIE-10 Ginecología/Obstetricia
- O82.0 Cesárea electiva
- O82.1 Cesárea urgencia
- N83.2 Quiste ovárico
- N83.5 Torsión anexial
- N73.9 EPI
- O44.1 Placenta previa
- O45.9 DPPNI
- O00.1 Embarazo ectópico
- D25.9 Mioma uterino
- N81.9 Prolapso genital

### CIE-10 Urología
- N20.1 Litiasis ureteral
- N20.0 Litiasis renal
- N40 HPB
- R33 Retención urinaria
- C67.9 Cáncer vesical
- C64 Cáncer renal
- N45.9 Orquiepididimitis
- N44.0 Torsión testicular

### CIE-10 Cardiología
- I21.0 IAMCEST anterior
- I21.1 IAMCEST inferior
- I21.4 IAMSEST
- I25.1 Enfermedad coronaria
- I05.0 Estenosis mitral
- Q21.1 CIA

### CIE-10 Neurocirugía
- D32.0 Meningioma
- C71.9 Tumor cerebral maligno
- S06.5 Hematoma subdural
- S06.4 Hematoma epidural
- G91.9 Hidrocefalia
- M51.1 Hernia discal

### CIE-10 Pediatría
- J21.9 Bronquiolitis
- A09 GEA
- K56.1 Invaginación
- R56.0 Convulsión febril
- P36.9 Sepsis neonatal

### Códigos ATC Adicionales
- B01AB01 Enoxaparina
- B01AC04 Clopidogrel
- B01AC06 Aspirina
- B01AF01 Rivaroxaban
- M01AE01 Ibuprofeno
- N02BE01 Paracetamol
- N02AX02 Tramadol
- J01DD04 Ceftriaxona
- J01CA04 Amoxicilina
- J01CR02 Amoxicilina/clavulánico
- C03CA01 Furosemida
- C10AA05 Atorvastatina
- C09AA02 Enalapril
- C07AB07 Bisoprolol
- A02BC01 Omeprazol
- H02AB06 Prednisona
- R03AC02 Salbutamol
- G03AA Anticonceptivos
- N03AX16 Pregabalina

### Códigos Procedimientos Adicionales
- 81.52 Artroplastía parcial cadera
- 81.51 Artroplastía total cadera
- 79.35 Reducción abierta fractura fémur
- 79.36 Reducción abierta fractura tibia
- 80.26 Artroscopía rodilla
- 74.1 Cesárea
- 68.4 Histerectomía total abdominal
- 65.6 Salpingectomía
- 60.2 RTU próstata
- 57.49 RTU vesical
- 55.4 Nefrectomía parcial
- 36.06 Angioplastía coronaria
- 01.24 Craneotomía
- 03.09 Laminectomía

---

## EJEMPLOS DE REFERENCIA

### Traumatología - Fractura Cadera
{"instruction":"Epicrisis:","input":{"dx":["Fractura pertrocanterea femur derecho (S72.1)","HTA (I10)","DM2 (E11.9)"],"proc":["Osteosintesis con DHS (79.35)"],"tto":["Enoxaparina 40mg SC c/24h (B01AB01)","Cefazolina 2g EV profilaxis (J01DB04)","Tramadol 50mg EV c/8h (N02AX02)"],"evo":"Post op estable, inicia KNT 2do dia, bipedestacion 3er dia","dx_alta":["Fractura pertrocanterea operada (S72.1)","HTA (I10)","DM2 (E11.9)"],"med":["Enoxaparina 40mg SC c/24h 28d (B01AB01)","Paracetamol 1g VO c/8h SOS (N02BE01)","Losartan 50mg VO c/24h (C09CA01)","Metformina 850mg VO c/12h (A10BA02)"]},"output":"Ingresa por fractura pertrocanterea de femur derecho (S72.1) en contexto de hipertension arterial (I10) y diabetes mellitus tipo 2 (E11.9). Se realiza osteosintesis con sistema DHS (79.35) sin complicaciones. Recibio enoxaparina 40mg SC cada 24 horas (B01AB01), cefazolina profilactica (J01DB04) y tramadol 50mg EV cada 8 horas (N02AX02). Post operatorio estable, inicia kinesioterapia al segundo dia logrando bipedestacion al tercer dia. Alta con fractura pertrocanterea operada (S72.1), HTA (I10) y DM2 (E11.9), indicandose enoxaparina 40mg SC cada 24 horas por 28 dias (B01AB01), paracetamol 1g VO cada 8 horas SOS (N02BE01), losartan 50mg cada 24 horas (C09CA01) y metformina 850mg cada 12 horas (A10BA02)."}

### Ginecología - Cesárea Urgencia
{"instruction":"Epicrisis:","input":{"dx":["Embarazo 39 sem (Z34.9)","Sufrimiento fetal agudo (O68.0)","Circular de cordon (O69.1)"],"proc":["Cesarea de urgencia (74.1)"],"tto":["Cefazolina 2g EV profilaxis (J01DB04)","Oxitocina 10UI EV post parto (H01BB02)","Paracetamol 1g EV c/8h (N02BE01)"],"evo":"Puerperio fisiologico, RN vigoroso Apgar 8-9","dx_alta":["Puerperio post cesarea (Z39.0)"],"med":["Ibuprofeno 400mg VO c/8h 5d (M01AE01)","Paracetamol 1g VO c/8h SOS (N02BE01)","Hierro 100mg VO c/24h (B03AA07)"]},"output":"Ingresa por embarazo de 39 semanas (Z34.9) con sufrimiento fetal agudo (O68.0) asociado a circular de cordon (O69.1). Se realiza cesarea de urgencia (74.1) obteniendose recien nacido vivo vigoroso con Apgar 8-9. Recibio cefazolina profilactica (J01DB04), oxitocina 10UI post parto (H01BB02) y paracetamol 1g EV cada 8 horas (N02BE01). Puerperio evoluciona fisiologico con buena involucion uterina y lactancia materna exclusiva. Alta con puerperio post cesarea (Z39.0), indicandose ibuprofeno 400mg VO cada 8 horas por 5 dias (M01AE01), paracetamol 1g VO cada 8 horas SOS (N02BE01) y hierro 100mg VO cada 24 horas (B03AA07)."}

### Cardiología - IAMCEST
{"instruction":"Epicrisis:","input":{"dx":["IAMCEST pared anterior (I21.0)","HTA (I10)","Tabaquismo (F17.2)"],"proc":["Coronariografia (88.56)","Angioplastia primaria DA con stent (36.06)"],"tto":["Heparina 5000UI EV bolo (B01AB01)","Clopidogrel 600mg carga + 75mg c/24h (B01AC04)","Aspirina 300mg carga + 100mg c/24h (B01AC06)","Atorvastatina 80mg VO c/noche (C10AA05)"],"evo":"Killip I, FEVI 40%, sin arritmias, peak troponina 15ng/mL","dx_alta":["IAM anterior con stent DA (I21.0)","HTA (I10)"],"med":["Clopidogrel 75mg VO c/24h 12m (B01AC04)","Aspirina 100mg VO c/24h (B01AC06)","Atorvastatina 80mg VO c/noche (C10AA05)","Bisoprolol 2.5mg VO c/24h (C07AB07)","Enalapril 5mg VO c/12h (C09AA02)"]},"output":"Ingresa por infarto agudo al miocardio con supradesnivel ST en pared anterior (I21.0) en contexto de hipertension arterial (I10) y tabaquismo activo (F17.2). Coronariografia (88.56) evidencia oclusion aguda de DA proximal, realizandose angioplastia primaria con implante de stent farmacoactivo (36.06) con flujo TIMI 3 final. Recibio heparina 5000UI EV (B01AB01), clopidogrel carga 600mg (B01AC04), aspirina 300mg (B01AC06) y atorvastatina 80mg (C10AA05). Evolucion Killip I sin arritmias, ecocardiograma muestra FEVI 40% con hipoquinesia anteroseptal, peak de troponina 15ng/mL. Alta con IAM anterior tratado con stent en DA (I21.0) e HTA (I10), indicandose clopidogrel 75mg cada 24 horas por 12 meses (B01AC04), aspirina 100mg cada 24 horas (B01AC06), atorvastatina 80mg cada noche (C10AA05), bisoprolol 2.5mg cada 24 horas (C07AB07) y enalapril 5mg cada 12 horas (C09AA02)."}

### Pediatría - Bronquiolitis
{"instruction":"Epicrisis:","input":{"dx":["Bronquiolitis aguda por VRS (J21.0)"],"proc":[],"tto":["Oxigeno por naricera 2L/min (V94)","Suero fisiologico NBZ c/4h","Paracetamol 15mg/kg VO c/6h SOS (N02BE01)"],"evo":"O2 por 48h, alimentacion conservada, sin distress al alta","dx_alta":["Bronquiolitis en resolucion (J21.0)"],"med":["Paracetamol 15mg/kg VO c/6h SOS fiebre (N02BE01)","Suero fisiologico nasal"]},"output":"Ingresa por bronquiolitis aguda por virus respiratorio sincicial (J21.0) con requerimiento de oxigeno suplementario. Recibio oxigeno por naricera a 2 litros por minuto, nebulizaciones con suero fisiologico cada 4 horas y paracetamol 15mg/kg VO cada 6 horas SOS fiebre (N02BE01). Evoluciona con requerimiento de oxigeno por 48 horas, manteniendo alimentacion oral conservada y sin signos de distress respiratorio al momento del alta. Alta con bronquiolitis en resolucion (J21.0), indicandose paracetamol 15mg/kg VO cada 6 horas SOS fiebre (N02BE01) y aseo nasal con suero fisiologico."}

---

## INSTRUCCIONES FINALES

1. Genera exactamente 175 ejemplos numerados del 176 al 350
2. Sigue la distribución por especialidad indicada arriba
3. Cada ejemplo en formato JSONL (una línea por JSON)
4. El output SIEMPRE comienza con "Ingresa por..."
5. Usa códigos CIE-10 y ATC correctos de la lista de referencia
6. Varía severidad, comorbilidades y tratamientos
7. En pediatría, ajusta dosis por peso cuando corresponda
8. Mantén coherencia clínica entre diagnóstico y tratamiento

GENERA AHORA LOS 175 EJEMPLOS (176-350) EN FORMATO JSONL:
```
