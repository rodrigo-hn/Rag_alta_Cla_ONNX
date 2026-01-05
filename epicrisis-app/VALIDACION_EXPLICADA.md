# 🔍 Proceso de Validación de Epicrisis - Explicación Detallada

**Archivo:** `backend/src/services/validatorService.ts`

---

## 📚 Índice
1. [Objetivo de la Validación](#objetivo)
2. [Proceso Paso a Paso](#proceso-paso-a-paso)
3. [Ejemplo Práctico](#ejemplo-práctico)
4. [Por Qué Hay Tantas Violaciones](#por-qué-hay-tantas-violaciones)
5. [Configuración y Ajustes](#configuración-y-ajustes)

---

## 🎯 Objetivo de la Validación

El validador tiene un objetivo principal: **Detectar alucinaciones del LLM**

Una "alucinación" es cuando el modelo de lenguaje (LLM) inventa información que **NO está** en los datos clínicos originales del paciente. Por ejemplo:

❌ **Alucinación:** El LLM escribe "Paciente con diabetes tipo 2" pero los datos clínicos no mencionan diabetes.

✅ **Correcto:** El LLM escribe "Paciente con HTA" y en los datos clínicos SÍ aparece "HTA" como diagnóstico.

---

## 🔄 Proceso Paso a Paso

### **PASO 1: Preparación de Datos**

Cuando llamas a `validateEpicrisis(text, data)`:

**Entrada:**
- `text`: La epicrisis generada por el LLM (string largo de texto médico)
- `data`: Los datos clínicos reales del paciente (objeto JSON con diagnósticos, procedimientos, medicamentos, etc.)

**Ejemplo:**
```javascript
text = "Paciente ingresa por post operatorio cirugia de Miles por cancer de recto..."
data = {
  diagnostico_ingreso: [
    { codigo: "C20", nombre: "Tumor maligno del recto" }
  ],
  procedimientos: [
    { codigo: "48.52", nombre: "Cirugia de Miles" }
  ],
  // ...
}
```

---

### **PASO 2: Normalización del Texto**

**Función:** `normalize(s: string)`

**¿Qué hace?**
Convierte el texto a un formato estándar para poder compararlo fácilmente:

```javascript
// Entrada
"Paciente con Cardiopatía Hipertensiva"

// Proceso:
1. .toLowerCase()           → "paciente con cardiopatía hipertensiva"
2. .normalize('NFD')        → Descompone caracteres (á → a + ´)
3. .replace(/\p{Diacritic}/) → "paciente con cardiopatia hipertensiva" (sin tildes)
4. .replace(/[^a-z0-9\s]/)  → "paciente con cardiopatia hipertensiva" (solo letras y números)
5. .replace(/\s+/g, ' ')    → Espacios múltiples → un solo espacio
6. .trim()                  → Elimina espacios al inicio/fin

// Salida
"paciente con cardiopatia hipertensiva"
```

**¿Por qué?**
Para que "Cardiopatía", "cardiopatia", "CARDIOPATÍA" se consideren iguales al comparar.

---

### **PASO 3: Extracción de N-gramas**

**Función:** `extractNgrams(textNorm, minN=2, maxN=6)`

**¿Qué es un N-grama?**
Son secuencias de N palabras consecutivas del texto.

**Ejemplo:**
```javascript
Texto normalizado: "paciente ingresa por post operatorio cirugia de miles"

N-gramas (de 2 a 6 palabras):
┌────────────────────────────────────────┐
│ N=2 (bigramas):                        │
│ - "paciente ingresa"                   │
│ - "ingresa por"                        │
│ - "por post"                           │
│ - "post operatorio"                    │
│ - "operatorio cirugia"      ← 🚨 Esta causa violación │
│ - "cirugia de"              ← 🚨 Esta también         │
│ - "de miles"                           │
├────────────────────────────────────────┤
│ N=3 (trigramas):                       │
│ - "paciente ingresa por"               │
│ - "ingresa por post"                   │
│ - "por post operatorio"                │
│ - "post operatorio cirugia" ← 🚨 Violación            │
│ - "operatorio cirugia de"   ← 🚨 Violación            │
│ - "cirugia de miles"                   │
├────────────────────────────────────────┤
│ N=4, N=5, N=6...                       │
│ (se generan todas las combinaciones)  │
└────────────────────────────────────────┘
```

**¿Por qué?**
Para detectar menciones clínicas de diferentes longitudes:
- "cirugia de miles" (3 palabras)
- "tumor maligno del recto" (4 palabras)
- "insuficiencia cardiaca congestiva" (3 palabras)

---

### **PASO 4: Creación de Whitelists**

**Función:** `makeWhitelist(items: Item[])`

**¿Qué es una Whitelist?**
Es una "lista blanca" de términos permitidos extraídos de los datos clínicos reales del paciente.

**Ejemplo:**
```javascript
// Datos clínicos del paciente
diagnostico_ingreso: [
  { codigo: "C20", nombre: "Tumor maligno del recto" },
  { codigo: "K74.6", nombre: "Cirrosis hepatica" }
]

// Whitelist generada:
{
  codes: Set([
    "c20",           // Código normalizado
    "k746"           // Código normalizado (sin punto)
  ]),
  names: Set([
    "tumor maligno del recto",      // Nombre completo normalizado
    "cirrosis hepatica"             // Nombre completo normalizado
  ])
}
```

**Se crean 3 whitelists:**
1. **dxWL**: Diagnósticos (ingreso + egreso)
2. **procWL**: Procedimientos quirúrgicos
3. **medWL**: Medicamentos (hospitalarios + al alta)

---

### **PASO 5: Detección de Medical Triggers**

**Array:** `medicalTriggers`

```javascript
medicalTriggers = [
  'mg', 'ev', 'vo', 'im', 'sc',           // Unidades y vías
  'cada', 'hrs', 'horas', 'dias',         // Frecuencias
  'diagnostico', 'neumonia', 'insuficiencia', 'fractura', 'sepsis',
  'cirugia', 'procedimiento', 'tac', 'rx', 'ecg', 'endoscopia',
  'antibiotico', 'analgesia', 'infeccion', 'diabetes', 'hipertension',
  'cardiopatia', 'nefropatia', 'hepatopatia', 'anemia', 'leucocitosis'
]
```

**¿Para qué sirven?**
Para filtrar qué n-gramas revisar. Solo se validan n-gramas que contengan al menos uno de estos triggers.

**Ejemplo:**
```javascript
// N-gramas del texto
"paciente ingresa por"      → NO tiene trigger → NO se valida ✓
"post operatorio cirugia"   → SÍ tiene "cirugia" → SE VALIDA ⚠️
"sala de mayor"             → NO tiene trigger → NO se valida ✓
"cirugia de miles"          → SÍ tiene "cirugia" → SE VALIDA ⚠️
```

**¿Por qué?**
Para no validar palabras comunes como "el paciente", "durante la", etc. Solo validamos frases que parecen menciones clínicas.

---

### **PASO 6: Verificación de Cada N-grama**

**Función:** `checkCategory(type, wl)`

Para cada n-grama que tiene un medical trigger:

#### **6.1 - Verificación Exacta**
```javascript
n-grama: "tumor maligno del recto"
whitelist.names: ["tumor maligno del recto"]
                   ↓
         ✅ MATCH EXACTO → No es violación
```

#### **6.2 - Verificación de Códigos**
```javascript
n-grama: "c20"
whitelist.codes: ["c20", "k746"]
                   ↓
         ✅ MATCH → No es violación

n-grama: "j45"  (código inventado por LLM)
whitelist.codes: ["c20", "k746"]
                   ↓
         ❌ NO MATCH → 🚨 VIOLACIÓN DETECTADA
```

#### **6.3 - Verificación "Soft" (Overlap)**
```javascript
n-grama: "cirugia de miles"
whitelist.names: ["cirugia de miles"]
                   ↓
¿"cirugia de miles" contiene algún nombre de whitelist de largo >= 5?
  → Busca: "tumor maligno del recto" en "cirugia de miles" → NO
  → Busca: "cirugia de miles" en "cirugia de miles" → ❌ (es exacto, no substring)
                   ↓
         ❌ NO OVERLAP → 🚨 VIOLACIÓN DETECTADA
```

#### **6.4 - N-gramas Parciales (Problema Principal)**
```javascript
Whitelist tiene: "cirugia de miles" (completo) ✅

Pero el texto genera estos n-gramas:
- "operatorio cirugia"      → NO está en whitelist → 🚨 VIOLACIÓN
- "cirugia de"              → NO está en whitelist → 🚨 VIOLACIÓN
- "de miles"                → NO está en whitelist → 🚨 VIOLACIÓN
- "post operatorio cirugia" → NO está en whitelist → 🚨 VIOLACIÓN
```

**Esto es lo que causa las 974 violaciones que ves en el frontend.**

---

### **PASO 7: Deduplicación**

**Código:**
```javascript
const seen = new Set<string>();
const uniqueViolations = violations.filter((v) => {
  const k = `${v.type}|${v.mention}`;  // Ejemplo: "dx|operatorio cirugia"
  if (seen.has(k)) return false;       // Ya vimos esta violación
  seen.add(k);                         // Marcar como vista
  return true;                         // Incluir en resultado
});
```

Evita mostrar la misma violación múltiples veces.

---

### **PASO 8: Resultado Final**

```javascript
return {
  ok: uniqueViolations.length === 0,   // true si NO hay violaciones
  violations: uniqueViolations         // Array de violaciones detectadas
};
```

**Ejemplo de salida:**
```javascript
{
  ok: false,
  violations: [
    {
      type: "proc",
      mention: "operatorio cirugia",
      reason: "Mención clínica no encontrada en whitelist"
    },
    {
      type: "proc",
      mention: "cirugia de",
      reason: "Mención clínica no encontrada en whitelist"
    },
    // ... 972 más
  ]
}
```

---

## 🔬 Ejemplo Práctico Completo

### **Entrada:**

**Texto generado por LLM:**
```
Paciente ingresa por post operatorio cirugia de Miles por cancer de recto.
```

**Datos clínicos reales:**
```javascript
{
  diagnostico_ingreso: [
    { codigo: "C20", nombre: "Tumor maligno del recto" }
  ],
  procedimientos: [
    { codigo: "48.52", nombre: "Cirugia de Miles" }
  ]
}
```

---

### **Proceso:**

#### **1. Normalización**
```
"paciente ingresa por post operatorio cirugia de miles por cancer de recto"
```

#### **2. N-gramas (solo algunos):**
```
"post operatorio"
"operatorio cirugia"      ← Tiene trigger "cirugia"
"cirugia de"              ← Tiene trigger "cirugia"
"de miles"
"miles por"
"por cancer"
"cancer de"               ← Tiene trigger (implícito)
"de recto"
"cirugia de miles"        ← Tiene trigger "cirugia"
```

#### **3. Whitelists:**
```javascript
procWL = {
  codes: ["4852"],
  names: ["cirugia de miles"]
}

dxWL = {
  codes: ["c20"],
  names: ["tumor maligno del recto"]
}
```

#### **4. Validación:**

```javascript
// N-grama: "operatorio cirugia"
¿Tiene trigger? → SÍ ("cirugia")
¿Está en procWL.names? → NO
¿Está en procWL.codes? → NO
¿Overlap con nombres largos? → NO
→ 🚨 VIOLACIÓN: "operatorio cirugia"

// N-grama: "cirugia de"
¿Tiene trigger? → SÍ ("cirugia")
¿Está en procWL.names? → NO
→ 🚨 VIOLACIÓN: "cirugia de"

// N-grama: "cirugia de miles"
¿Tiene trigger? → SÍ ("cirugia")
¿Está en procWL.names? → SÍ ✅
→ ✅ OK (no es violación)

// N-grama: "cancer de"
¿Tiene trigger? → SÍ (trigger implícito)
¿Está en dxWL.names? → NO ("tumor maligno del recto" != "cancer de")
→ 🚨 VIOLACIÓN: "cancer de"
```

---

## ❓ Por Qué Hay Tantas Violaciones

### **Problema Principal: N-gramas Parciales**

El validador genera **TODOS los n-gramas posibles** (2 a 6 palabras) del texto.

**Ejemplo:**

Frase: `"post operatorio cirugia de miles"`

Whitelist: `["cirugia de miles"]` ✅

Pero genera:
- `"post operatorio"` → ❌ No está
- `"operatorio cirugia"` → ❌ No está (🚨 VIOLACIÓN)
- `"cirugia de"` → ❌ No está (🚨 VIOLACIÓN)
- `"de miles"` → ❌ No está
- `"post operatorio cirugia"` → ❌ No está (🚨 VIOLACIÓN)
- `"operatorio cirugia de"` → ❌ No está (🚨 VIOLACIÓN)
- `"cirugia de miles"` → ✅ SÍ está
- `"post operatorio cirugia de"` → ❌ No está (🚨 VIOLACIÓN)
- `"operatorio cirugia de miles"` → ❌ No está (🚨 VIOLACIÓN)

**Resultado:** 6 violaciones de una sola frase válida.

---

### **¿Por Qué Está Diseñado Así?**

**Filosofía: "Mejor pecar de precavido"**

En medicina, es **MUY PELIGROSO** dejar pasar una alucinación:

❌ **Peligro:** LLM inventa "Paciente alérgico a penicilina" → Doctor le da penicilina → Reacción alérgica

✅ **Seguro:** El validador marca CUALQUIER mención sospechosa → Doctor revisa manualmente → Seguridad del paciente

**Principio:**
- **Falso Positivo** (marcar algo correcto como violación) = Molesto pero SEGURO
- **Falso Negativo** (dejar pasar una alucinación) = PELIGROSO para el paciente

---

## ⚙️ Configuración y Ajustes

### **Parámetros Configurables:**

#### **1. Tamaño de N-gramas**
```javascript
// Línea 60
private extractNgrams(textNorm: string, minN = 2, maxN = 6)

// Reducir maxN reduce violaciones pero puede dejar pasar alucinaciones
minN = 2  // Bigramas ("cirugia de")
maxN = 6  // Hasta 6 palabras juntas
```

**Cambio sugerido para menos violaciones:**
```javascript
minN = 3  // Empezar en trigramas
maxN = 5  // Reducir máximo
```

#### **2. Medical Triggers**
```javascript
// Línea 21-27
private readonly medicalTriggers = [
  'mg', 'ev', 'cirugia', ...
]

// Agregar más triggers = más validación
// Quitar triggers = menos validación (más permisivo)
```

#### **3. Overlap Mínimo**
```javascript
// Línea 158
if (g.includes(name) && name.length >= 5) {

// Cambiar a 3 para ser más permisivo:
if (g.includes(name) && name.length >= 3) {
```

---

## 📊 Resumen Visual

```
┌─────────────────────────────────────────────────────────────┐
│ TEXTO LLM: "Paciente con post operatorio cirugia de Miles" │
└─────────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ 1. NORMALIZAR                 │
        │ → quitar tildes, minúsculas   │
        └───────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ 2. EXTRAER N-GRAMAS (2-6)     │
        │ → "operatorio cirugia"        │
        │ → "cirugia de"                │
        │ → "cirugia de miles"          │
        └───────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ 3. CREAR WHITELISTS           │
        │ Diagnósticos: ["tumor..."]    │
        │ Procedimientos: ["cirugia..."]│
        └───────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ 4. FILTRAR POR TRIGGERS       │
        │ "cirugia de" → tiene "cirugia"│
        │ → SE VALIDA                   │
        └───────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ 5. VERIFICAR vs WHITELIST     │
        │ ¿"cirugia de" está? → NO      │
        │ → 🚨 VIOLACIÓN                │
        └───────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ 6. RETORNAR RESULTADO         │
        │ violations: [ ... ]           │
        └───────────────────────────────┘
```

---

## 🎯 Conclusión

El validador es **intencionalmente estricto** por seguridad médica. Las 974 violaciones que ves son principalmente:

1. **N-gramas parciales** de términos válidos
2. **Sinónimos** no reconocidos ("cáncer" vs "tumor maligno")
3. **Palabras de contexto** que contienen triggers ("por cirugía", "con diagnóstico")

Esto es **CORRECTO** en un contexto médico - es mejor revisar manualmente que arriesgarse a una alucinación peligrosa.

