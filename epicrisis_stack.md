# Epicrisis Automatica -- Prompt + Validador

## Contrato de Entrada (JSON)

Ejemplo basado en caso real: Paciente 68 anios, post operatorio cirugia de Miles por cancer de recto, con derrame pleural y enfermedad hepatica cronica.

``` json
{
  "id_atencion": 1416169,
  "paciente": {
    "sexo": "F",
    "edad": 68
  },
  "atencion": {
    "id": "1416169",
    "fecha_ingreso": "2025-12-15",
    "fecha_alta": "2025-12-26"
  },
  "motivo_ingreso": "Post operatorio cirugia de Miles por cancer de recto",
  "antecedentes": {
    "medicos": [
      "HTA",
      "Cardiopatia hipertensiva",
      "FA paroxistica",
      "Enfermedad hepatica cronica con hipertension portal"
    ],
    "quirurgicos": [
      "Protesis de cadera derecha por artrosis severa"
    ],
    "alergias": "Sin alergias conocidas"
  },
  "diagnostico_ingreso": [
    { "codigo": "C20", "nombre": "Tumor maligno del recto" },
    { "codigo": "K74.6", "nombre": "Cirrosis hepatica, otra y la no especificada" },
    { "codigo": "J90", "nombre": "Derrame pleural no clasificado en otra parte" }
  ],
  "procedimientos": [
    { "codigo": "48.52", "nombre": "Cirugia de Miles (reseccion abdominoperineal)" },
    { "codigo": "34.04", "nombre": "Pleurostomia 24 FR" },
    { "codigo": "87.41", "nombre": "TAC de torax" },
    { "codigo": "87.43", "nombre": "TAC de abdomen y pelvis" },
    { "codigo": "86.22", "nombre": "VAC perineal (curacion con presion negativa)" }
  ],
  "tratamientos_intrahosp": [
    { "codigo": "ATC:J01CR05", "nombre": "Piperacilina/Tazobactam", "via": "EV", "inicio": "2025-12-15", "fin": "2025-12-19" },
    { "codigo": "ATC:J01DH02", "nombre": "Meropenem 1g c/8h", "via": "EV", "inicio": "2025-12-19", "fin": "2025-12-26" },
    { "codigo": "ATC:J01XA01", "nombre": "Ceftriaxona", "via": "EV", "inicio": "2025-12-15", "fin": "2025-12-17" },
    { "codigo": "ATC:J01XD01", "nombre": "Metronidazol", "via": "EV", "inicio": "2025-12-15", "fin": "2025-12-17" }
  ],
  "evolucion_resumen": [
    {
      "dia": 1,
      "texto": "TORAX- PLEUROSTOMIA PACIENTE POST OP DE CIRUGIA DE MILES. DERRAME PLEURAL BILATERAL, A DERECHA MODERADO A SEVERO. SE INSTALA PLEUROSTOMIA 24 FR, DANDO SALIDA A 1000 CC DE CONTENIDO SEROSO OSCURO."
    },
    {
      "dia": 2,
      "texto": "TORAX ESTABLE, PLEUROSTOMIA 1340 CC SEROHEMATICO. RADIOGRAFIA CON EXPANSION PULMONAR COMPLETA. ESTUDIO DE LIQUIDO PLEURAL COMPATIBLE CON EXUDADO."
    },
    {
      "dia": 3,
      "texto": "PACIENTE ESTABLE, SAT 96-98 CON FIO2 AMBIENTAL. PLEUROSTOMIA 800 CC. TAC CON SIGNOS DE DHC E HIPERTENSION PORTAL ASOCIADO A ASCITIS."
    },
    {
      "dia": 5,
      "texto": "Medicina interna: HTA, cirugia de cancer de colon hace 1 mes. TAC con hallazgos compatibles con DHC. Nauseas y vomitos. Icterica, abdomen distendido. Se sugiere Meropenem 1g c/8h EV, TAC abdomen y pelvis."
    },
    {
      "dia": 6,
      "texto": "TAC DE TORAX DE CONTROL CON MINIMO DERRAME RESIDUAL DERECHO Y LEVE IZQUIERDO. EXPANSION ADECUADA. DEBITO 120 CC EN 12 HRS."
    },
    {
      "dia": 10,
      "texto": "TORAX ESTABLE 310 CC EN 24 HRS. DEBITO A LA BAJA. MANEJO DE ASCITIS EFECTIVO."
    },
    {
      "dia": 12,
      "texto": "DEBITO DE 50 CC EN 24 HRS, SE DECIDE RETIRO DE PLEUROSTOMIA. PROCEDIMIENTO SIN INCIDENTES. RETIRO DE PUNTOS EN 5-7 DIAS."
    }
  ],
  "laboratorios_resumen": [
    {
      "prueba": "Hemoglobina en sangre total",
      "unidad": "g/dL",
      "ingreso": {
        "valor": 7.8,
        "fecha": "2025-12-25T07:11:09",
        "rango_inferior": 12.3,
        "rango_superior": 15.3,
        "estado": "bajo"
      },
      "periodo": { "min": 7.8, "max": 7.8 }
    },
    {
      "prueba": "Hematocrito",
      "unidad": "%",
      "ingreso": {
        "valor": 23.7,
        "fecha": "2025-12-25T07:11:09",
        "rango_inferior": 35,
        "rango_superior": 47,
        "estado": "bajo"
      },
      "periodo": { "min": 23.7, "max": 23.7 }
    },
    {
      "prueba": "Recuento de leucocitos (absoluto)",
      "unidad": "x10^9/L",
      "ingreso": {
        "valor": 12.62,
        "fecha": "2025-12-25T07:11:09",
        "rango_inferior": 4.4,
        "rango_superior": 11.3,
        "estado": "alto"
      },
      "periodo": { "min": 12.62, "max": 12.62 }
    },
    {
      "prueba": "Proteina C reactiva",
      "unidad": "mg/dL",
      "ingreso": {
        "valor": 8.79,
        "fecha": "2025-12-25T07:11:11",
        "rango_inferior": 0,
        "rango_superior": 0.49,
        "estado": "alto"
      },
      "periodo": { "min": 8.79, "max": 8.79 }
    },
    {
      "prueba": "Albumina en sangre",
      "unidad": "g/dL",
      "ingreso": {
        "valor": 2.82,
        "fecha": "2025-12-25T07:11:10",
        "rango_inferior": 3.5,
        "rango_superior": 5.2,
        "estado": "bajo"
      },
      "periodo": { "min": 2.82, "max": 2.82 }
    },
    {
      "prueba": "Potasio plasmatico",
      "unidad": "mmol/L",
      "ingreso": {
        "valor": 3.3,
        "fecha": "2025-12-25T07:11:10",
        "rango_inferior": 3.5,
        "rango_superior": 5.1,
        "estado": "bajo"
      },
      "periodo": { "min": 3.3, "max": 3.3 }
    },
    {
      "prueba": "Creatinina en sangre",
      "unidad": "mg/dL",
      "ingreso": {
        "valor": 0.63,
        "fecha": "2025-12-25T07:11:10",
        "rango_inferior": 0.5,
        "rango_superior": 0.9,
        "estado": "normal"
      },
      "periodo": { "min": 0.63, "max": 0.63 }
    }
  ],
  "diagnostico_egreso": [
    { "codigo": "C20", "nombre": "Tumor maligno del recto - Post operatorio cirugia de Miles" },
    { "codigo": "J90", "nombre": "Derrame pleural bilateral resuelto" },
    { "codigo": "K74.6", "nombre": "Enfermedad hepatica cronica con hipertension portal" },
    { "codigo": "K65.0", "nombre": "Coleccion pelviana post quirurgica en tratamiento" }
  ],
  "indicaciones_alta": {
    "medicamentos": [
      { "codigo": "ATC:J01DH02", "nombre": "Meropenem", "dosis": "1g", "via": "EV", "frecuencia": "cada 8 horas", "duracion": "Completar esquema segun infectologia" }
    ],
    "controles": [
      "Control con cirugia de torax en caso de sintomas respiratorios",
      "Control con cirugia digestiva para seguimiento de colostomia",
      "Control con infectologia para ajuste de antibioticos",
      "Retiro de puntos de pleurostomia en 5-7 dias"
    ],
    "cuidados": [
      "Curacion de herida perineal con VAC segun indicacion",
      "Curacion de sitio de pleurostomia",
      "Cuidados de colostomia",
      "Kinesioterapia respiratoria y motora",
      "Ejercicios con Triflo"
    ],
    "signos_alarma": [
      "Fiebre mayor a 38C",
      "Disnea o dificultad respiratoria",
      "Dolor toracico",
      "Aumento de volumen o secrecion por heridas",
      "Nauseas o vomitos persistentes",
      "Ictericia progresiva"
    ]
  }
}
```

### Estructura del JSON

| Campo | Descripcion |
|-------|-------------|
| `id_atencion` | Identificador unico de la atencion |
| `paciente` | Datos demograficos (sexo, edad) |
| `atencion` | Fechas de ingreso y alta |
| `antecedentes` | Antecedentes medicos, quirurgicos y alergias |
| `diagnostico_ingreso` | Diagnosticos CIE-10 al ingreso |
| `procedimientos` | Procedimientos realizados |
| `tratamientos_intrahosp` | Medicamentos con codigos ATC |
| `evolucion_resumen` | Resumen diario de evolucion |
| `laboratorios_resumen` | Examenes con valores, rangos y estado |
| `diagnostico_egreso` | Diagnosticos al alta |
| `indicaciones_alta` | Medicamentos, controles, cuidados y signos de alarma |

## Prompt de Producción

(... contenido resumido ...)
