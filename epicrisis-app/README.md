# Sistema de Epicrisis Automatica

Sistema completo para generacion automatica de epicrisis (informes de alta hospitalaria) utilizando datos de Oracle 19c y procesamiento con LLM local.

## Caracteristicas

- Generacion automatica de epicrisis clinicamente validas
- Procesamiento 100% local (sin envio a cloud)
- Validacion contra whitelist de diagnosticos, procedimientos y medicamentos
- Deteccion de alucinaciones
- Exportacion a PDF y Word
- Interfaz moderna con Angular 19 y Material Design
- Latencia total ~350ms

## Arquitectura

```
epicrisis-app/
├── backend/                 # API Node.js/TypeScript
│   ├── src/
│   │   ├── config/         # Configuracion DB y logging
│   │   ├── services/       # Logica de negocio
│   │   ├── routes/         # Endpoints REST
│   │   ├── types/          # Tipos TypeScript
│   │   └── utils/          # Utilidades
│   └── package.json
├── frontend/               # App Angular 19
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/       # Servicios y modelos
│   │   │   └── features/   # Componentes standalone
│   │   └── styles/
│   └── package.json
├── models/                 # Modelos LLM y embeddings
│   ├── llm/
│   └── embeddings/
└── sql/                    # Scripts Oracle
    ├── functions/
    ├── indexes/
    ├── materialized_views/
    └── partitions/
```

## Requisitos

- Node.js 18+
- Oracle 19c con Oracle Client instalado
- Angular CLI 19+
- RAM: 2GB minimo (500MB para LLM + 1.5GB para app)
- CPU: 2 cores minimo

## Instalacion

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con credenciales de Oracle
```

### 2. Frontend

```bash
cd frontend
npm install
```

### 3. Base de Datos Oracle

Ejecutar los scripts SQL en orden:

```bash
# 1. Indices
sqlplus user/pass@db @sql/indexes/create_indexes.sql

# 2. Funcion principal
sqlplus user/pass@db @sql/functions/get_discharge_summary_json.sql

# 3. Vistas materializadas (opcional)
sqlplus user/pass@db @sql/materialized_views/create_mv_episodios.sql

# 4. Particionamiento (opcional, para tablas grandes)
sqlplus user/pass@db @sql/partitions/create_partitions.sql
```

### 4. Modelos LLM (Opcional pero Recomendado)

Los modelos locales garantizan **privacidad 100%** de los datos clínicos.

#### Opción 1: Script Automático (Recomendado)

```bash
# Instalar dependencia
pip install tqdm

# Descargar todo (LLM + Embeddings)
python download_models.py --all

# O interactivo
python download_models.py
```

#### Opción 2: Bash Script

```bash
./download-models.sh
```

#### Opción 3: Manual

Ver instrucciones detalladas en [`models/README.md`](models/README.md)

**Modelos disponibles:**
- TinyLlama 1.1B (637 MB) - Pruebas y desarrollo
- Mistral 7B (4.1 GB) - Producción, alta calidad
- Llama 3.2 3B (1.9 GB) - Balance ideal
- E5 Embeddings (118 MB) - Búsqueda semántica

**Alternativa:** Usar APIs externas (OpenAI, Anthropic) configurando `.env`

## Ejecucion

### Desarrollo

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

### Produccion

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Servir dist/ con nginx o similar
```

## Uso

1. Abrir http://localhost:4200
2. Ingresar ID de episodio
3. Revisar datos clinicos cargados
4. Click en "Generar Epicrisis"
5. Revisar validacion
6. Exportar a PDF o Word

## API Endpoints

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/episodes/:id` | Obtener datos clinicos |
| POST | `/api/generate-epicrisis` | Generar epicrisis |
| POST | `/api/regenerate-epicrisis` | Regenerar con correcciones |
| POST | `/api/validate-epicrisis` | Validar texto |
| POST | `/api/export/pdf` | Exportar a PDF |
| POST | `/api/export/word` | Exportar a Word |
| GET | `/api/health` | Health check |

## Configuracion

### Variables de Entorno (Backend)

```env
# Base de datos
DB_USER=usuario_oracle
DB_PASSWORD=password
DB_CONNECT_STRING=localhost:1521/ORCLPDB1

# Servidor
PORT=3000
NODE_ENV=development

# LLM
LLM_MODEL_PATH=../models/llm/tinyllama-1.1b-chat-q4

# Logging
LOG_LEVEL=info
```

## Validacion Clinica

El sistema valida que:

1. Todos los diagnosticos mencionados existan en los datos del paciente
2. Todos los procedimientos correspondan al episodio
3. Todos los medicamentos esten en la lista de tratamiento o alta
4. No se inventen datos (deteccion de alucinaciones)

## Diccionario de Sinonimos

El sistema reconoce sinonimos clinicos chilenos:

- TAC = Tomografia Computada = TC = Scanner
- EV = Endovenoso = Intravenoso = IV
- VO = Via Oral = Oral
- UCI = Unidad de Cuidados Intensivos = UPC
- HTA = Hipertension Arterial
- DM = Diabetes Mellitus

## Seguridad

- Procesamiento 100% local
- Sin almacenamiento de datos sensibles en cache
- Logs de auditoria de todas las generaciones
- Trazabilidad completa

## Metricas de Rendimiento

- SQL + normalizacion: 40ms
- Generacion LLM: 120-300ms
- Validacion: 10ms
- **Total: ~350ms**

## Licencia

Uso interno hospitalario.
