# PROMPT PARA GENERAR APP DE EPICRISIS AUTOMÁTICA

## CONTEXTO GENERAL
Crea una aplicación web completa para generar epicrisis (informes de alta hospitalaria) de manera automática, clínicamente válida, privada y rápida, utilizando datos de Oracle 19c y procesamiento con LLM local.

## ARQUITECTURA DEL SISTEMA

### Backend (Node.js/TypeScript)
1. **Conexión a Oracle 19c**
   - Pool de conexiones (UCP/Hikari)
   - Queries SQL optimizadas con índices compuestos
   - Función PL/SQL: `get_discharge_summary_json(p_episodio_id) return CLOB`

2. **Normalizador Clínico**
   - Convierte datos Oracle a JSON clínico canónico
   - Schema obligatorio:
   ```json
   {
     "motivo_ingreso": "",
     "diagnostico_ingreso": [{
       "codigo": "", 
       "nombre": ""
     }],
     "procedimientos": [{
       "codigo": "", 
       "nombre": "", 
       "fecha": ""
     }],
     "tratamientos_intrahosp": [{
       "codigo": "", 
       "nombre": "", 
       "dosis": "", 
       "via": "", 
       "frecuencia": ""
     }],
     "evolucion": [{
       "fecha": "", 
       "nota": "", 
       "profesional": ""
     }],
     "laboratorios_relevantes": [{
       "parametro": "", 
       "valor": "", 
       "fecha": ""
     }],
     "diagnostico_egreso": [{
       "codigo": "", 
       "nombre": ""
     }],
     "indicaciones_alta": {
       "medicamentos": [{
         "codigo": "", 
         "nombre": "", 
         "dosis": "", 
         "via": "", 
         "frecuencia": "", 
         "duracion": ""
       }],
       "controles": [],
       "recomendaciones": []
     }
   }
   ```

3. **Motor RAG (opcional para contexto histórico)**
   - Embeddings: `multilingual-e5-small`
   - Chunking semántico por secciones
   - Vectorización local
   - Índice HNSW

4. **Motor de Generación**
   - LLM: `TinyLlama-1.1B-Chat-q4` (500MB RAM, 80ms primer token)
   - Prompt estructurado médico
   - Generación determinista

5. **Validador Clínico**
   - Whitelist de diagnósticos, procedimientos y medicamentos
   - Detección de alucinaciones
   - Sistema de corrección automática

### Frontend (Angular 21 + TypeScript)
1. **Interfaz principal**
   - Búsqueda de paciente/episodio
   - Visualización del JSON clínico normalizado
   - Generación de epicrisis (botón)
   - Edición manual (opcional)
   - Exportación PDF/Word

2. **Panel de validación**
   - Estado de validación (OK/Warning/Error)
   - Lista de violaciones detectadas
   - Opción de regeneración

3. **Características Angular 21**
   - Componentes standalone
   - Signals para gestión de estado reactivo
   - Control flow moderno (@if, @for)
   - Inyección de dependencias mejorada
   - Angular Material 21 para UI

## ESPECIFICACIONES TÉCNICAS

### SQL Oracle (Ejemplo para implementar)
```sql
CREATE OR REPLACE FUNCTION get_discharge_summary_json(p_episodio_id NUMBER)
RETURN CLOB IS
  v_result CLOB;
BEGIN
  SELECT JSON_OBJECT(
    'motivo_ingreso' VALUE a.motivo_ingreso,
    'diagnostico_ingreso' VALUE (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT('codigo' VALUE dx.codigo, 'nombre' VALUE dx.nombre)
      ) FROM diagnosticos_ingreso dx WHERE dx.episodio_id = p_episodio_id
    ),
    'procedimientos' VALUE (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT('codigo' VALUE p.codigo, 'nombre' VALUE p.nombre, 'fecha' VALUE p.fecha)
        ORDER BY p.fecha
      ) FROM procedimientos p WHERE p.episodio_id = p_episodio_id
    ),
    'evolucion' VALUE (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT('fecha' VALUE e.fecha, 'nota' VALUE e.nota)
        ORDER BY e.fecha
      ) FROM evoluciones e WHERE e.episodio_id = p_episodio_id
    ),
    'laboratorios_relevantes' VALUE (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT('parametro' VALUE l.parametro, 'valor' VALUE l.valor, 'fecha' VALUE l.fecha)
      ) FROM laboratorios l WHERE l.episodio_id = p_episodio_id AND l.relevante = 'S'
    ),
    'diagnostico_egreso' VALUE (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT('codigo' VALUE dx.codigo, 'nombre' VALUE dx.nombre)
      ) FROM diagnosticos_egreso dx WHERE dx.episodio_id = p_episodio_id
    ),
    'indicaciones_alta' VALUE JSON_OBJECT(
      'medicamentos' VALUE (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT('codigo' VALUE m.codigo, 'nombre' VALUE m.nombre, 
                     'dosis' VALUE m.dosis, 'via' VALUE m.via, 
                     'frecuencia' VALUE m.frecuencia, 'duracion' VALUE m.duracion)
        ) FROM medicamentos_alta m WHERE m.episodio_id = p_episodio_id
      )
    )
  ) INTO v_result
  FROM atenciones a
  WHERE a.episodio_id = p_episodio_id;
  
  RETURN v_result;
END;
```

### Prompt del LLM
```
Eres un médico especialista en medicina interna. Genera un informe de alta hospitalaria (epicrisis) en español de Chile, siguiendo este formato EXACTO:

ESTRUCTURA OBLIGATORIA (un solo párrafo corrido):
- Motivo y diagnóstico de ingreso (incluye código CIE-10 entre paréntesis)
- Procedimientos y tratamientos relevantes durante hospitalización (incluye códigos entre paréntesis)
- Evolución clínica resumida (por días si corresponde, sin repetir)
- Diagnóstico(s) de egreso (incluye código CIE-10 entre paréntesis)
- Indicaciones post-alta: medicamentos con dosis/vía/frecuencia/duración (incluye código ATC entre paréntesis)

REGLAS ESTRICTAS:
1. Usa EXCLUSIVAMENTE la información del JSON proporcionado
2. NO inventes ni agregues información
3. Incluye SIEMPRE los códigos entre paréntesis para dx, procedimientos y medicamentos
4. Si falta información, escribe "No consignado"
5. Escribe en español clínico de Chile
6. Formato: UN SOLO PÁRRAFO continuo, sin bullets ni saltos de línea

JSON CLÍNICO:
{{JSON_CLINICO}}
```

### Validador TypeScript
```typescript
type Item = { codigo?: string; nombre: string };
type Med = { 
  codigo?: string; 
  nombre: string; 
  dosis?: string; 
  via?: string; 
  frecuencia?: string; 
  duracion?: string 
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s\/\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeWhitelist(items: Item[]): { codes: Set<string>; names: Set<string> } {
  const codes = new Set<string>();
  const names = new Set<string>();
  for (const it of items || []) {
    if (it.codigo) codes.add(normalize(it.codigo));
    names.add(normalize(it.nombre));
  }
  return { codes, names };
}

function extractNgrams(textNorm: string, minN = 2, maxN = 6): Set<string> {
  const words = textNorm.split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      out.add(words.slice(i, i + n).join(" "));
    }
  }
  return out;
}

type ValidationResult = {
  ok: boolean;
  violations: {
    type: "dx" | "proc" | "med";
    mention: string;
    reason: string;
  }[];
};

type ClinicalJson = {
  diagnostico_ingreso?: Item[];
  diagnostico_egreso?: Item[];
  procedimientos?: Item[];
  tratamientos_intrahosp?: Med[];
  indicaciones_alta?: { medicamentos?: Med[] };
};

export function validateEpicrisis(text: string, data: ClinicalJson): ValidationResult {
  const textNorm = normalize(text);
  const grams = extractNgrams(textNorm);

  // whitelist: permite mencionar dx ingreso + egreso
  const dxWL = makeWhitelist([...(data.diagnostico_ingreso || []), ...(data.diagnostico_egreso || [])]);
  const procWL = makeWhitelist(data.procedimientos || []);
  // meds permitidos: alta + (opcional) intrahosp si quieres que aparezcan en narrativa
  const medWL = makeWhitelist([
    ...((data.indicaciones_alta?.medicamentos || []).map(m => ({ codigo: m.codigo, nombre: m.nombre }))),
    ...((data.tratamientos_intrahosp || []).map(m => ({ codigo: m.codigo, nombre: m.nombre }))),
  ]);

  // diccionario de sinónimos CONTROLADOS (puedes expandirlo)
  const synonyms: Record<string, string[]> = {
    "tac": ["tomografia computada", "tc"],
    "uci": ["unidad de cuidados intensivos"],
  };

  function allowedMention(mention: string, wl: { codes: Set<string>; names: Set<string> }): boolean {
    const m = normalize(mention);
    if (wl.codes.has(m)) return true;
    if (wl.names.has(m)) return true;
    // aplica sinónimos hacia nombres permitidos
    for (const [key, syns] of Object.entries(synonyms)) {
      if (m === key || syns.includes(m)) {
        // si el "concepto" existe en whitelist por su forma canónica, lo damos por válido
        if (wl.names.has(key)) return true;
        for (const s of syns) if (wl.names.has(s)) return true;
      }
    }
    return false;
  }

  // Heurística: si aparece una frase que parece "medicamento/procedimiento/dx" pero no está en WL => viola.
  // Para bajar falsos positivos, validamos solo contra candidatos que coinciden "parcialmente" con términos médicos comunes.
  const medicalTriggers = [
    "mg", "ev", "vo", "im", "sc", "cada", "hrs", "horas", "dias",
    "diagnostico", "neumonia", "insuficiencia", "fractura", "sepsis",
    "cirugia", "procedimiento", "tac", "rx", "ecg", "endoscopia",
    "antibiotico", "analgesia"
  ];

  const violations: ValidationResult["violations"] = [];

  function checkCategory(type: "dx" | "proc" | "med", wl: { codes: Set<string>; names: Set<string> }) {
    for (const g of grams) {
      // filtra por "parece clínico"
      const hasTrigger = medicalTriggers.some(t => g.includes(t));
      if (!hasTrigger) continue;

      // si g es exactamente uno de los nombres permitidos, ok
      if (wl.names.has(g)) continue;

      // si g parece un código (CIE10/ATC/etc) y no está en codes, marca
      if (/^[a-z]\d{2}(\.\d)?$/i.test(g) || g.startsWith("atc:") || /^[a-z0-9]{3,10}[:\-][a-z0-9]{2,10}$/i.test(g)) {
        if (!wl.codes.has(g)) {
          violations.push({ type, mention: g, reason: "Código no permitido por whitelist" });
        }
        continue;
      }

      // detección "soft": si contiene una palabra de un nombre permitido, no lo consideres violación.
      // (evita falsos positivos por frases largas tipo "se indica azitromicina 500 mg…")
      let overlapsAllowed = false;
      for (const name of wl.names) {
        // si la frase contiene el nombre permitido (substring), lo damos por permitido
        if (g.includes(name) && name.length >= 5) { overlapsAllowed = true; break; }
      }
      if (overlapsAllowed) continue;

      // si parece un término clínico pero no match, lo reportamos como "posible alucinación"
      // (en producción puedes hacerlo "warning" y no bloquear si no quieres ser tan estricto)
      // aquí lo hacemos estricto
      violations.push({ type, mention: g, reason: "Mención clínica no encontrada en whitelist" });
    }
  }

  // chequeos separados (puedes ajustar triggers por categoría)
  checkCategory("dx", dxWL);
  checkCategory("proc", procWL);
  checkCategory("med", medWL);

  // dedupe violaciones
  const seen = new Set<string>();
  const uniq = violations.filter(v => {
    const k = `${v.type}|${v.mention}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { ok: uniq.length === 0, violations: uniq };
}
```

### Prompt de Corrección
```
Tu texto anterior contiene menciones NO permitidas (alucinaciones) o fuera de la lista blanca.

VIOLACIONES DETECTADAS:
{{VIOLACIONES}}

Debes reescribir el informe de alta en 1 solo párrafo CUMPLIENDO:
- Solo puedes mencionar diagnósticos de esta lista: {{DX_LISTA}}
- Solo puedes mencionar procedimientos de esta lista: {{PROC_LISTA}}
- Solo puedes mencionar medicamentos de esta lista: {{MED_LISTA}}

Si necesitas algo fuera de las listas, escribe "No consignado".
Incluye SIEMPRE los códigos entre paréntesis.

Reescribe completo el informe usando el mismo JSON.

JSON CLÍNICO:
{{JSON_CLINICO}}
```

## FLUJO DE TRABAJO

1. Usuario ingresa ID de episodio
2. Backend ejecuta `get_discharge_summary_json(id)` en Oracle
3. Normaliza el JSON clínico
4. Envía al LLM local con prompt estructurado
5. Recibe epicrisis generada
6. Valida contra whitelist (diagnósticos, procedimientos, medicamentos)
7. Si falla validación → regenera con prompt correctivo
8. Si pasa validación → retorna al frontend
9. Usuario puede editar/exportar

## LATENCIAS ESPERADAS
- SQL + normalización: 40ms
- Embedding (si RAG): 7ms
- Retrieval (si RAG): <1ms
- Generación LLM: 120-300ms
- **Total: ~350ms** (instantáneo para el usuario)

## REQUISITOS DE INFRAESTRUCTURA
- Node.js 18+
- Oracle 19c con índices optimizados
- RAM: 2GB mínimo (500MB para LLM + 1.5GB para app)
- CPU: 2 cores mínimo
- Almacenamiento local para modelos: 1GB

## OPTIMIZACIONES CRÍTICAS ORACLE

### 1. Índices compuestos
```sql
-- En tablas de eventos
CREATE INDEX idx_eventos_episodio_fecha ON evoluciones(id_episodio, fecha_evento);
CREATE INDEX idx_labs_episodio_fecha ON laboratorios(id_episodio, fecha_evento);

-- Si se busca por paciente
CREATE INDEX idx_eventos_paciente_fecha ON evoluciones(id_paciente, fecha_evento);

-- En diagnósticos/procedimientos
CREATE INDEX idx_diagnosticos_episodio ON diagnosticos_ingreso(id_episodio, tipo, fecha);
CREATE INDEX idx_procedimientos_episodio ON procedimientos(id_episodio, fecha);
```

### 2. Materialized View (si se consulta repetido)
```sql
CREATE MATERIALIZED VIEW mv_episodios_resumen
REFRESH FAST ON COMMIT
AS SELECT 
  episodio_id, 
  get_discharge_summary_json(episodio_id) as json_data,
  fecha_alta
FROM atenciones 
WHERE estado = 'ALTA';
```

### 3. Particionamiento por fecha en tablas grandes
```sql
CREATE TABLE evoluciones (
  id NUMBER,
  id_episodio NUMBER,
  fecha_evento DATE,
  nota CLOB,
  ...
)
PARTITION BY RANGE (fecha_evento) (
  PARTITION p_2024_01 VALUES LESS THAN (TO_DATE('2024-02-01', 'YYYY-MM-DD')),
  PARTITION p_2024_02 VALUES LESS THAN (TO_DATE('2024-03-01', 'YYYY-MM-DD')),
  ...
);
```

### 4. Pool de conexiones configurado
```javascript
// oracledb configuración
const poolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1,
  poolTimeout: 60
};
```

## CARACTERÍSTICAS DE SEGURIDAD
- Procesamiento 100% local (sin envío a cloud)
- Auditoría de generaciones
- Validación médica estricta
- Trazabilidad completa
- Sin almacenamiento de datos sensibles en caché
- Logs de todas las generaciones con timestamp y usuario

## DICCIONARIO DE SINÓNIMOS CLÍNICOS CHILE

```typescript
const CLINICAL_SYNONYMS = {
  // Procedimientos imagenológicos
  "tac": ["tomografia computada", "tc", "scanner"],
  "rx": ["radiografia", "rayos x"],
  
  // Unidades
  "uci": ["unidad de cuidados intensivos", "upc"],
  "uti": ["unidad de tratamiento intensivo"],
  
  // Vías de administración
  "ev": ["endovenoso", "intravenoso", "iv"],
  "vo": ["via oral", "oral"],
  "im": ["intramuscular"],
  "sc": ["subcutaneo", "subcutanea"],
  
  // Términos comunes
  "pcr": ["paro cardiorrespiratorio", "paro cardiorespiratorio"],
  "irc": ["insuficiencia renal cronica"],
  "ira": ["insuficiencia renal aguda"],
  "icc": ["insuficiencia cardiaca congestiva"],
  "epoc": ["enfermedad pulmonar obstructiva cronica"],
  "avc": ["accidente vascular cerebral", "ave"],
  "iam": ["infarto agudo al miocardio"],
  "tec": ["traumatismo encefalocraneano"],
  "hta": ["hipertension arterial"],
  "dm": ["diabetes mellitus"],
  "dm2": ["diabetes mellitus tipo 2"],
  
  // Signos vitales
  "pa": ["presion arterial"],
  "fc": ["frecuencia cardiaca"],
  "fr": ["frecuencia respiratoria"],
  "sat o2": ["saturacion de oxigeno", "sao2"],
  "temp": ["temperatura"]
};
```

## ESTRUCTURA DE DIRECTORIOS

```
epicrisis-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── services/
│   │   │   ├── oracleService.ts
│   │   │   ├── normalizerService.ts
│   │   │   ├── llmService.ts
│   │   │   ├── validatorService.ts
│   │   │   └── ragService.ts (opcional)
│   │   ├── types/
│   │   │   └── clinical.types.ts
│   │   ├── utils/
│   │   │   ├── synonyms.ts
│   │   │   └── validators.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── services/
│   │   │   │   │   ├── api.service.ts
│   │   │   │   │   ├── epicrisis.service.ts
│   │   │   │   │   └── validation.service.ts
│   │   │   │   ├── models/
│   │   │   │   │   └── clinical.types.ts
│   │   │   │   └── interceptors/
│   │   │   │       └── http-error.interceptor.ts
│   │   │   ├── features/
│   │   │   │   ├── episode-search/
│   │   │   │   │   ├── episode-search.component.ts
│   │   │   │   │   ├── episode-search.component.html
│   │   │   │   │   └── episode-search.component.scss
│   │   │   │   ├── json-viewer/
│   │   │   │   │   ├── json-viewer.component.ts
│   │   │   │   │   ├── json-viewer.component.html
│   │   │   │   │   └── json-viewer.component.scss
│   │   │   │   ├── epicrisis-generator/
│   │   │   │   │   ├── epicrisis-generator.component.ts
│   │   │   │   │   ├── epicrisis-generator.component.html
│   │   │   │   │   └── epicrisis-generator.component.scss
│   │   │   │   ├── validation-panel/
│   │   │   │   │   ├── validation-panel.component.ts
│   │   │   │   │   ├── validation-panel.component.html
│   │   │   │   │   └── validation-panel.component.scss
│   │   │   │   └── export-options/
│   │   │   │       ├── export-options.component.ts
│   │   │   │       ├── export-options.component.html
│   │   │   │       └── export-options.component.scss
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   └── pipes/
│   │   │   ├── app.component.ts
│   │   │   ├── app.component.html
│   │   │   ├── app.component.scss
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   ├── assets/
│   │   ├── styles/
│   │   │   └── styles.scss
│   │   ├── index.html
│   │   └── main.ts
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
├── models/
│   ├── embeddings/
│   │   └── multilingual-e5-small/
│   └── llm/
│       └── tinyllama-1.1b-chat-q4/
├── sql/
│   ├── functions/
│   │   └── get_discharge_summary_json.sql
│   ├── indexes/
│   │   └── create_indexes.sql
│   ├── materialized_views/
│   │   └── create_mv_episodios.sql
│   └── partitions/
│       └── create_partitions.sql
└── README.md
```

## ENTREGABLES FINALES
1. Aplicación web completa (backend + frontend)
2. Scripts SQL de optimización Oracle
3. Documentación de instalación y despliegue
4. Suite de pruebas unitarias e integración
5. Manual de usuario
6. Diccionario de sinónimos clínicos Chile
7. Scripts de migración y despliegue

## EJEMPLOS DE CÓDIGO ANGULAR 21

### Service: EpicrisisService
```typescript
// src/app/core/services/epicrisis.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClinicalJson, EpicrisisResponse, ValidationResult } from '../models/clinical.types';

@Injectable({
  providedIn: 'root'
})
export class EpicrisisService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  // Signals para estado reactivo
  clinicalData = signal<ClinicalJson | null>(null);
  epicrisisText = signal<string>('');
  validationResult = signal<ValidationResult | null>(null);
  isLoading = signal<boolean>(false);

  getEpisodeData(episodeId: string): Observable<ClinicalJson> {
    this.isLoading.set(true);
    return this.http.get<ClinicalJson>(`${this.baseUrl}/episodes/${episodeId}`);
  }

  generateEpicrisis(clinicalData: ClinicalJson): Observable<EpicrisisResponse> {
    this.isLoading.set(true);
    return this.http.post<EpicrisisResponse>(`${this.baseUrl}/generate-epicrisis`, clinicalData);
  }

  validateEpicrisis(text: string, clinicalData: ClinicalJson): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.baseUrl}/validate-epicrisis`, {
      text,
      clinicalData
    });
  }

  regenerateEpicrisis(clinicalData: ClinicalJson, violations: any[]): Observable<EpicrisisResponse> {
    return this.http.post<EpicrisisResponse>(`${this.baseUrl}/regenerate-epicrisis`, {
      clinicalData,
      violations
    });
  }

  exportToPDF(text: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export/pdf`, { text }, {
      responseType: 'blob'
    });
  }

  exportToWord(text: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export/word`, { text }, {
      responseType: 'blob'
    });
  }
}
```

### Component: EpisodeSearchComponent
```typescript
// src/app/features/episode-search/episode-search.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EpicrisisService } from '../../core/services/epicrisis.service';

@Component({
  selector: 'app-episode-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="search-container">
      <h2>Buscar Episodio de Hospitalización</h2>
      
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>ID de Episodio</mat-label>
        <input 
          matInput 
          [(ngModel)]="episodeId"
          placeholder="Ingrese ID de episodio"
          (keyup.enter)="searchEpisode()"
        />
      </mat-form-field>

      <button 
        mat-raised-button 
        color="primary"
        (click)="searchEpisode()"
        [disabled]="!episodeId() || isLoading()"
      >
        @if (isLoading()) {
          <mat-spinner diameter="20"></mat-spinner>
          <span>Buscando...</span>
        } @else {
          <span>Buscar</span>
        }
      </button>

      @if (errorMessage()) {
        <div class="error-message">
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .search-container {
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
    }

    .error-message {
      color: #f44336;
      margin-top: 16px;
      padding: 12px;
      border: 1px solid #f44336;
      border-radius: 4px;
      background-color: #ffebee;
    }

    button {
      width: 100%;
      height: 48px;
      margin-top: 16px;
    }
  `]
})
export class EpisodeSearchComponent {
  private epicrisisService = inject(EpicrisisService);

  episodeId = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  searchEpisode(): void {
    if (!this.episodeId()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.epicrisisService.getEpisodeData(this.episodeId()).subscribe({
      next: (data) => {
        this.epicrisisService.clinicalData.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al buscar el episodio. Verifique el ID ingresado.');
        this.isLoading.set(false);
        console.error('Error fetching episode:', error);
      }
    });
  }
}
```

### Component: EpicrisisGeneratorComponent
```typescript
// src/app/features/epicrisis-generator/epicrisis-generator.component.ts
import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { EpicrisisService } from '../../core/services/epicrisis.service';

@Component({
  selector: 'app-epicrisis-generator',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <mat-card class="generator-card">
      <mat-card-header>
        <mat-card-title>Epicrisis Generada</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        @if (hasData()) {
          @if (!epicrisisText()) {
            <div class="empty-state">
              <mat-icon>description</mat-icon>
              <p>Presione el botón para generar la epicrisis automáticamente</p>
            </div>
          } @else {
            <div class="epicrisis-text">
              {{ epicrisisText() }}
            </div>
          }
        } @else {
          <div class="empty-state">
            <mat-icon>info</mat-icon>
            <p>Busque un episodio para comenzar</p>
          </div>
        }
      </mat-card-content>

      <mat-card-actions>
        @if (hasData()) {
          <button 
            mat-raised-button 
            color="primary"
            (click)="generate()"
            [disabled]="isGenerating()"
          >
            @if (isGenerating()) {
              <mat-spinner diameter="20"></mat-spinner>
              <span>Generando...</span>
            } @else {
              <mat-icon>auto_awesome</mat-icon>
              <span>Generar Epicrisis</span>
            }
          </button>

          @if (epicrisisText()) {
            <button 
              mat-stroked-button
              (click)="regenerate()"
              [disabled]="isGenerating()"
            >
              <mat-icon>refresh</mat-icon>
              <span>Regenerar</span>
            </button>
          }
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .generator-card {
      margin: 24px;
    }

    .epicrisis-text {
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 4px;
      line-height: 1.6;
      font-size: 14px;
      min-height: 200px;
      white-space: pre-wrap;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #757575;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bdbdbd;
    }

    mat-card-actions {
      display: flex;
      gap: 12px;
      padding: 16px;
    }

    button {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class EpicrisisGeneratorComponent {
  private epicrisisService = inject(EpicrisisService);

  clinicalData = this.epicrisisService.clinicalData;
  epicrisisText = this.epicrisisService.epicrisisText;
  isGenerating = this.epicrisisService.isLoading;

  hasData = computed(() => this.clinicalData() !== null);

  generate(): void {
    const data = this.clinicalData();
    if (!data) return;

    this.epicrisisService.generateEpicrisis(data).subscribe({
      next: (response) => {
        this.epicrisisService.epicrisisText.set(response.text);
        this.epicrisisService.validationResult.set(response.validation);
        this.epicrisisService.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error generating epicrisis:', error);
        this.epicrisisService.isLoading.set(false);
      }
    });
  }

  regenerate(): void {
    const data = this.clinicalData();
    const validation = this.epicrisisService.validationResult();
    
    if (!data || !validation) return;

    this.epicrisisService.regenerateEpicrisis(data, validation.violations).subscribe({
      next: (response) => {
        this.epicrisisService.epicrisisText.set(response.text);
        this.epicrisisService.validationResult.set(response.validation);
        this.epicrisisService.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error regenerating epicrisis:', error);
        this.epicrisisService.isLoading.set(false);
      }
    });
  }
}
```

### Component: ValidationPanelComponent
```typescript
// src/app/features/validation-panel/validation-panel.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { EpicrisisService } from '../../core/services/epicrisis.service';

@Component({
  selector: 'app-validation-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatListModule
  ],
  template: `
    <mat-card class="validation-card">
      <mat-card-header>
        <mat-card-title>Validación Clínica</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        @if (validationResult(); as validation) {
          <div class="validation-status">
            @if (validation.ok) {
              <mat-chip class="status-chip success">
                <mat-icon>check_circle</mat-icon>
                Validación exitosa
              </mat-chip>
            } @else {
              <mat-chip class="status-chip error">
                <mat-icon>error</mat-icon>
                {{ validation.violations.length }} violación(es) detectada(s)
              </mat-chip>
            }
          </div>

          @if (!validation.ok && validation.violations.length > 0) {
            <mat-list class="violations-list">
              <h3 mat-subheader>Violaciones Detectadas:</h3>
              @for (violation of validation.violations; track violation.mention) {
                <mat-list-item>
                  <mat-icon matListItemIcon color="warn">warning</mat-icon>
                  <div matListItemTitle>
                    <strong>{{ getViolationType(violation.type) }}:</strong> 
                    "{{ violation.mention }}"
                  </div>
                  <div matListItemLine>{{ violation.reason }}</div>
                </mat-list-item>
              }
            </mat-list>
          }
        } @else {
          <div class="empty-state">
            <mat-icon>rule</mat-icon>
            <p>La validación se ejecutará automáticamente al generar la epicrisis</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .validation-card {
      margin: 24px;
    }

    .validation-status {
      margin-bottom: 16px;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-weight: 500;
    }

    .status-chip.success {
      background-color: #4caf50;
      color: white;
    }

    .status-chip.error {
      background-color: #f44336;
      color: white;
    }

    .violations-list {
      margin-top: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: #757575;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #bdbdbd;
    }
  `]
})
export class ValidationPanelComponent {
  private epicrisisService = inject(EpicrisisService);
  
  validationResult = this.epicrisisService.validationResult;

  getViolationType(type: string): string {
    const types: Record<string, string> = {
      'dx': 'Diagnóstico',
      'proc': 'Procedimiento',
      'med': 'Medicamento'
    };
    return types[type] || type;
  }
}
```

### App Config (Angular 21)
```typescript
// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([httpErrorInterceptor])
    ),
    provideAnimations()
  ]
};
```

### App Routes
```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'epicrisis',
    pathMatch: 'full'
  },
  {
    path: 'epicrisis',
    loadComponent: () => import('./features/episode-search/episode-search.component')
      .then(m => m.EpisodeSearchComponent)
  }
];
```

### Main Component
```typescript
// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { EpisodeSearchComponent } from './features/episode-search/episode-search.component';
import { JsonViewerComponent } from './features/json-viewer/json-viewer.component';
import { EpicrisisGeneratorComponent } from './features/epicrisis-generator/epicrisis-generator.component';
import { ValidationPanelComponent } from './features/validation-panel/validation-panel.component';
import { ExportOptionsComponent } from './features/export-options/export-options.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MatToolbarModule,
    EpisodeSearchComponent,
    JsonViewerComponent,
    EpicrisisGeneratorComponent,
    ValidationPanelComponent,
    ExportOptionsComponent
  ],
  template: `
    <mat-toolbar color="primary">
      <span>Sistema de Epicrisis Automática</span>
    </mat-toolbar>

    <div class="container">
      <div class="main-content">
        <app-episode-search />
        
        <div class="two-column">
          <app-json-viewer />
          <app-epicrisis-generator />
        </div>

        <app-validation-panel />
        <app-export-options />
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin: 24px 0;
    }

    @media (max-width: 768px) {
      .two-column {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AppComponent {
  title = 'Epicrisis App';
}
```



## PASOS DE IMPLEMENTACIÓN RECOMENDADOS

### Fase 1: Base de Datos (Semana 1)
1. Crear función PL/SQL `get_discharge_summary_json`
2. Implementar índices compuestos
3. Crear Materialized Views
4. Configurar particionamiento
5. Testing de performance SQL

### Fase 2: Backend (Semana 2-3)
1. Configurar conexión Oracle con pool
2. Implementar servicio de normalización
3. Integrar LLM local (TinyLlama)
4. Implementar validador con whitelist
5. Crear API REST
6. Testing unitario e integración

### Fase 3: Frontend Angular 21 (Semana 4)
1. Configurar proyecto Angular 21 con standalone components
2. Implementar servicios core (EpicrisisService, API Service)
3. Crear componentes standalone:
   - EpisodeSearchComponent (búsqueda con signals)
   - JsonViewerComponent (visualización reactiva)
   - EpicrisisGeneratorComponent (generación con loading states)
   - ValidationPanelComponent (panel de validación)
   - ExportOptionsComponent (exportación PDF/Word)
4. Implementar gestión de estado con Signals
5. Integrar Angular Material 21 para UI
6. Testing E2E con Playwright o Cypress

### Fase 4: Optimización y Seguridad (Semana 5)
1. Implementar sistema de caché
2. Agregar logs y auditoría
3. Testing de seguridad
4. Optimización de latencias
5. Documentación final

## DEPENDENCIAS DE FRONTEND (package.json)

```json
{
  "name": "epicrisis-frontend",
  "version": "1.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^21.0.0",
    "@angular/common": "^21.0.0",
    "@angular/compiler": "^21.0.0",
    "@angular/core": "^21.0.0",
    "@angular/forms": "^21.0.0",
    "@angular/material": "^21.0.0",
    "@angular/platform-browser": "^21.0.0",
    "@angular/platform-browser-dynamic": "^21.0.0",
    "@angular/router": "^21.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^21.0.0",
    "@angular/cli": "^21.0.0",
    "@angular/compiler-cli": "^21.0.0",
    "typescript": "~5.6.0"
  }
}
```

## MÉTRICAS DE ÉXITO
- Tiempo de generación < 500ms en 95% de casos
- Tasa de validación exitosa > 98%
- Precisión clínica validada por médicos > 95%
- Disponibilidad del sistema > 99.5%
- Cero fugas de datos sensibles

## CARACTERÍSTICAS ESPECÍFICAS DE ANGULAR 21

### 1. Componentes Standalone
- No requieren NgModules
- Importaciones directas en el componente
- Mejor tree-shaking y rendimiento
- Carga lazy por defecto

### 2. Signals para Gestión de Estado
```typescript
// Estado reactivo sin RxJS cuando no es necesario
const clinicalData = signal<ClinicalJson | null>(null);
const isLoading = signal<boolean>(false);

// Computed values
const hasData = computed(() => clinicalData() !== null);

// Effects para side-effects
effect(() => {
  if (clinicalData()) {
    console.log('Data loaded:', clinicalData());
  }
});
```

### 3. Control Flow Moderno
```typescript
// Nuevo sintaxis @if, @for, @switch
@if (isLoading()) {
  <mat-spinner></mat-spinner>
} @else if (hasError()) {
  <error-message />
} @else {
  <content />
}

@for (item of items(); track item.id) {
  <list-item [data]="item" />
}
```

### 4. Inyección de Dependencias con inject()
```typescript
// Más limpio que constructor injection
private epicrisisService = inject(EpicrisisService);
private router = inject(Router);
```

### 5. Mejoras de Performance
- Renderizado más rápido con signals
- Change detection optimizada
- Mejor manejo de memoria
- Carga diferida automática de componentes standalone

### 6. Angular Material 21
- Componentes actualizados con mejor accesibilidad
- Theming mejorado
- Componentes más livianos
- Mejor integración con signals

## VENTAJAS DE ANGULAR 21 PARA ESTA APLICACIÓN

1. **Tipado fuerte**: TypeScript nativo garantiza menos errores
2. **Arquitectura escalable**: Estructura clara y mantenible
3. **Rendimiento**: Signals ofrecen reactividad sin overhead de RxJS
4. **Testing**: Herramientas robustas de testing integradas
5. **Documentación**: Excelente documentación oficial
6. **Ecosistema médico**: Muchas apps médicas usan Angular por su estabilidad

---

**NOTA IMPORTANTE**: Esta app NO es solo RAG, es una arquitectura completa ETL clínico + normalización + RAG opcional + generación narrativa + validación médica.

El objetivo es producir epicrisis automáticas que sean:
- ✅ Clínicamente válidas
- ✅ Certificables
- ✅ 100% privadas (local)
- ✅ Rápidas (~350ms)
- ✅ Repetibles y deterministas
- ✅ Auditables