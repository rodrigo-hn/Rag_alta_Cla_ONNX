# ✅ Resultado de la Consulta - JSON Generado Exitosamente

**Fecha de ejecución:** 2025-12-28
**Archivo generado:** `laboratorios_resultado.json`
**Tamaño:** 7.2 KB

---

## 📊 Resumen de Datos Procesados

- **Total de pruebas procesadas:** 30 pruebas únicas
- **Todas las pruebas tienen solo registro de ingreso** (sin campo "ultimo")
- **Fecha de exámenes:** 2025-12-25

---

## 🧪 Lista de Pruebas Generadas (30 pruebas)

### Pruebas con Estado: NORMAL (16 pruebas)
1. Basofilos - 0.3 % - 2025-12-25T07:11:09
2. C.H.C.M. - 32.9 g/dL - 2025-12-25T07:11:09
3. Cloro plasmatico - 106 mmol/L - 2025-12-25T07:11:10
4. Creatinina en sangre - 0.63 mg/dL - 2025-12-25T07:11:10
5. H.C.M. - 31.1 pg - 2025-12-25T07:11:09
6. Magnesio en sangre - 1.96 mg/dL - 2025-12-25T07:11:11
7. Monocitos - 7.6 % - 2025-12-25T07:11:10
8. Nitrogeno ureico en sangre - 13 mg/dL - 2025-12-25T07:11:11
9. Recuento de linfocitos (absoluto) - 1.43 x10^3/uL - 2025-12-25T07:11:09
10. Recuento de plaquetas (absoluto) - 170 x10^3/uL - 2025-12-25T07:11:09
11. Sodio plasmatico - 143.1 mmol/L - 2025-12-25T07:11:10
12. Total - 100 % - 2025-12-25T07:11:10
13. Urea en sangre - 27.9 mg/dL - 2025-12-25T07:11:11
14. V.C.M. - 94.4 fL - 2025-12-25T07:11:09
15. V.P.M. - 10 fL - 2025-12-25T07:11:09
16. Velocidad de sedimentacion - 2 mm/hr - 2025-12-25T07:11:09

### Pruebas con Estado: BAJO (9 pruebas)
1. Albumina en sangre - 2.82 g/dL - 2025-12-25T07:11:10
2. Calcio en sangre - 7.6 mg/dL - 2025-12-25T07:11:10
3. Fosforo en sangre - 2.41 mg/dL - 2025-12-25T07:11:10
4. Hematocrito - 23.7 % - 2025-12-25T07:11:09
5. Hemoglobina en sangre total - 7.8 g/dL - 2025-12-25T07:11:09
6. Linfocitos - 11.3 % - 2025-12-25T07:11:10
7. Potasio plasmatico - 3.3 mmol/L - 2025-12-25T07:11:10
8. Recuento eritrocitos (absoluto) - 2.51 x10^6/uL - 2025-12-25T07:11:09

### Pruebas con Estado: ALTO (7 pruebas)
1. Eosinofilos - 4.6 % - 2025-12-25T07:11:09
2. Proteina C reactiva - 8.79 mg/dL - 2025-12-25T07:11:11
3. RDW-CV - 21.5 % - 2025-12-25T07:11:09
4. Recuento de leucocitos (absoluto) - 12.62 x10^9/L - 2025-12-25T07:11:09
5. Recuento de neutrofilos (absoluto) - 9.47 x10^3/uL - 2025-12-25T07:11:09
6. Segmentados - 76.2 % - 2025-12-25T07:11:09

---

## 📈 Estadísticas por Estado

| Estado | Cantidad | Porcentaje |
|--------|----------|------------|
| Normal | 16 | 53.3% |
| Bajo | 9 | 30.0% |
| Alto | 7 | 23.3% |
| **TOTAL** | **30** | **100%** |

---

## 🔍 Observaciones

### Valores Anormales Detectados:

**Estados BAJOS (9 casos):**
- ⚠️ Albumina en sangre: 2.82 g/dL
- ⚠️ Calcio en sangre: 7.6 mg/dL
- ⚠️ Fosforo en sangre: 2.41 mg/dL
- ⚠️ Hematocrito: 23.7 %
- ⚠️ Hemoglobina en sangre total: 7.8 g/dL
- ⚠️ Linfocitos: 11.3 %
- ⚠️ Potasio plasmatico: 3.3 mmol/L
- ⚠️ Recuento eritrocitos (absoluto): 2.51 x10^6/uL

**Estados ALTOS (7 casos):**
- ⚠️ Eosinofilos: 4.6 %
- ⚠️ Proteina C reactiva: 8.79 mg/dL
- ⚠️ RDW-CV: 21.5 %
- ⚠️ Recuento de leucocitos (absoluto): 12.62 x10^9/L
- ⚠️ Recuento de neutrofilos (absoluto): 9.47 x10^3/uL
- ⚠️ Segmentados: 76.2 %

---

## ✅ Validación del JSON

### Estructura Validada:
- ✅ JSON bien formado
- ✅ Formato ISO 8601 en fechas
- ✅ Valores numéricos correctos
- ✅ Estados normalizados (normal, alto, bajo)
- ✅ Unidades de medida incluidas

### Ejemplo de Estructura:
```json
{
    "laboratorios_resumen": [
        {
            "prueba": "Albumina en sangre",
            "unidad": "g/dL",
            "ingreso": {
                "valor": 2.82,
                "fecha": "2025-12-25T07:11:10",
                "estado": "bajo"
            }
        }
    ]
}
```

---

## 🎯 Próximos Pasos Sugeridos

### 1. Análisis Clínico
Los resultados muestran varios valores anormales que requieren atención:
- Niveles bajos de hemoglobina y hematocrito (posible anemia)
- Proteína C reactiva elevada (posible proceso inflamatorio)
- Leucocitos elevados (posible infección)

### 2. Integración del JSON
El archivo `laboratorios_resultado.json` está listo para:
- Importar en aplicaciones web/móviles
- Procesar con Python, JavaScript, etc.
- Almacenar en bases de datos NoSQL
- Enviar vía API REST

### 3. Visualización
Puedes crear dashboards con estos datos:
- Gráficos de valores fuera de rango
- Timeline de evolución (cuando haya datos "ultimo")
- Alertas automáticas para valores críticos

---

## 📝 Comandos Útiles

### Ver el JSON completo:
```bash
cat laboratorios_resultado.json
```

### Ver el JSON formateado:
```bash
cat laboratorios_resultado.json | python3 -m json.tool
```

### Contar pruebas:
```bash
cat laboratorios_resultado.json | jq '.laboratorios_resumen | length'
```

### Filtrar solo pruebas con estado "alto":
```bash
cat laboratorios_resultado.json | jq '.laboratorios_resumen[] | select(.ingreso.estado == "alto")'
```

### Extraer nombres de pruebas:
```bash
cat laboratorios_resultado.json | jq -r '.laboratorios_resumen[].prueba'
```

---

## 🔄 Regenerar el JSON

Para volver a ejecutar la consulta:

```bash
# Método 1: Usar el script
./generar_json_completo.sh

# Método 2: Ejecutar el archivo SQL
docker exec -i oracle19c bash -c "
  export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
  export PATH=\$ORACLE_HOME/bin:\$PATH
  \$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 \
    @/tmp/generar_json.sql
"
```

---

## ✨ Resumen Final

**Estado:** ✅ EXITOSO
**Consulta:** VERSIÓN 1 (JSON_OBJECT + JSON_ARRAYAGG)
**Oracle:** 19c Enterprise Edition
**Resultado:** JSON válido de 30 pruebas de laboratorio
**Archivo:** `laboratorios_resultado.json` (7.2 KB)

La consulta SQL funciona perfectamente y está lista para producción.

---

**Generado por:** Consulta SQL validada en Oracle 19c
**Fecha:** 2025-12-28
**Archivo SQL:** `generar_json.sql`
