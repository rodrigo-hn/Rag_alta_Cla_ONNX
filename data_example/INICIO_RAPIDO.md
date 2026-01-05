# 🚀 Inicio Rápido - Consulta JSON Oracle 19c

## ✅ Validación Completada

La **VERSIÓN 1** de la consulta JSON está validada y funcionando en Oracle 19c.

---

## 🎯 Usa la Consulta Ahora

### Método 1: Generar archivo JSON (Más fácil)

```bash
cd /Users/rodrigoherrera/code/RAG/rag_alta_Cla/data_example
./generar_json_completo.sh
```

**Resultado:** Archivo `laboratorios_resultado.json` con todos los datos

---

### Método 2: Ejecutar en SQLPlus/SQL Developer

1. Abre el archivo: `consulta_final_validada.sql`
2. Copia todo el contenido
3. Pega en SQLPlus o SQL Developer
4. Ejecuta (F5 o botón Run)

**Conexión:**
- Host: localhost:1521
- Service: ORCLPDB1
- User: SYSTEM
- Password: Oracle123

---

### Método 3: Desde la línea de comandos

```bash
docker exec -i oracle19c bash -c "
  export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
  export PATH=\$ORACLE_HOME/bin:\$PATH
  \$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 \
  @/tmp/consulta_final_validada.sql
"
```

---

## 📝 La Consulta SQL

Está en: **consulta_final_validada.sql**

```sql
SELECT JSON_OBJECT(
    'laboratorios_resumen' VALUE
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'prueba' VALUE prueba,
            'unidad' VALUE unidad,
            'ingreso' VALUE JSON_OBJECT(
                'valor' VALUE valor_ingreso,
                'fecha' VALUE TO_CHAR(fecha_ingreso, 'YYYY-MM-DD"T"HH24:MI:SS'),
                'estado' VALUE estado_ingreso
            ),
            'ultimo' VALUE CASE
                WHEN tiene_ultimo = 'SI' THEN JSON_OBJECT(
                    'valor' VALUE valor_ultimo,
                    'fecha' VALUE TO_CHAR(fecha_ultimo, 'YYYY-MM-DD"T"HH24:MI:SS'),
                    'estado' VALUE estado_ultimo
                )
                ELSE NULL
            END
            ABSENT ON NULL
        )
    )
) FROM (...)
```

---

## 🔧 Personalizar

### Filtrar por paciente específico:

Edita `consulta_final_validada.sql`, línea 67:

```sql
-- Cambiar esto:
-- AND e.ID_ATENCION = 1416169

-- Por esto:
AND e.ID_ATENCION = 1416169  -- Tu ID aquí
```

---

## 📊 Ejemplo de Resultado

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
    },
    {
      "prueba": "Glucosa",
      "unidad": "mg/dL",
      "ingreso": {
        "valor": 95,
        "fecha": "2025-12-25T07:11:10",
        "estado": "normal"
      },
      "ultimo": {
        "valor": 110,
        "fecha": "2025-12-26T08:00:00",
        "estado": "alto"
      }
    }
  ]
}
```

---

## 📚 Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `consulta_final_validada.sql` | ⭐ Consulta SQL lista para usar |
| `generar_json_completo.sh` | ⭐ Genera JSON en archivo |
| `RESUMEN_VALIDACION.md` | Documentación completa |
| `run_test_inline.sh` | Test rápido |
| `diagnostico.sh` | Verificar sistema |

---

## ❓ Ayuda

### Ver todos los métodos disponibles:
```bash
cat INSTRUCCIONES_EJECUCION.md
```

### Ver documentación completa:
```bash
cat RESUMEN_VALIDACION.md
```

### Verificar que todo funciona:
```bash
./diagnostico.sh
```

---

## 🎉 ¡Listo!

Tu consulta está validada y lista para usar en producción.

**Siguiente paso:** Ejecuta `./generar_json_completo.sh`
