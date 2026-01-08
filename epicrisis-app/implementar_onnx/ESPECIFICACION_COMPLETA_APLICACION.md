# ESPECIFICACION TECNICA COMPLETA - Local Chat RAG con ONNX

## Documento de Especificaciones para Reproduccion de Codigo

**Fecha de generacion:** 2026-01-05
**Version:** 1.0.0
**Nombre del Proyecto:** Local Chat - RAG en el Navegador (ONNX)

---

## TABLA DE CONTENIDOS

1. [Vision General del Proyecto](#1-vision-general-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Stack Tecnologico](#3-stack-tecnologico)
4. [Estructura de Archivos](#4-estructura-de-archivos)
5. [Backend - Especificaciones](#5-backend---especificaciones)
6. [Frontend - HTML/CSS](#6-frontend---htmlcss)
7. [Frontend - JavaScript (app.js)](#7-frontend---javascript-appjs)
8. [Configuraciones de Generacion](#8-configuraciones-de-generacion)
9. [Sistema de Chunking](#9-sistema-de-chunking)
10. [Sistema RAG (Retrieval)](#10-sistema-rag-retrieval)
11. [Sistema de Generacion de Texto](#11-sistema-de-generacion-de-texto)
12. [Validadores de Salida](#12-validadores-de-salida)
13. [Formato de Datos de Entrada (JSON)](#13-formato-de-datos-de-entrada-json)
14. [Guia de Implementacion](#14-guia-de-implementacion)

---

## 1. VISION GENERAL DEL PROYECTO

### 1.1 Descripcion
Aplicacion web de RAG (Retrieval-Augmented Generation) que ejecuta modelos de lenguaje (LLM) y embeddings **100% en el navegador** utilizando ONNX Runtime con aceleracion WebGPU/WASM. Especializada para procesamiento de documentos medicos (epicrisis).

### 1.2 Caracteristicas Principales
- **Privacidad total**: Todo el procesamiento ocurre localmente, sin envio de datos a servidores externos
- **Modelos ONNX**: Soporte para multiples modelos de 0.5B a 3B parametros
- **WebGPU/WASM**: Aceleracion por GPU cuando disponible, fallback a WASM
- **IndexedDB**: Almacenamiento vectorial persistente en el navegador
- **RAG completo**: Chunking, embeddings, busqueda semantica y generacion
- **Validacion medica**: Sistema de validacion para evitar alucinaciones en indicaciones de alta

### 1.3 Casos de Uso Implementados
1. **Preguntas sobre documentos (RAG)**: Respuestas basadas en contexto recuperado
2. **Consultas simples**: Prompts directos al modelo sin contexto
3. **Resumen de Alta (Epicrisis)**: Generacion de documentos medicos estructurados

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USUARIO                                      │
│                           │                                          │
│                           ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    INTERFAZ WEB                              │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │    │
│  │  │ Cargar  │ │ Indexar │ │Preguntar│ │ Simple  │ │Resumen │ │    │
│  │  │ Modelo  │ │   Doc   │ │  RAG    │ │ Query   │ │  Alta  │ │    │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬────┘ │    │
│  └───────│──────────│──────────│──────────│─────────────│──────┘    │
│          │          │          │          │             │            │
│          ▼          ▼          ▼          ▼             ▼            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   CAPA DE LOGICA (app.js)                    │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │    │
│  │  │   Model      │  │   Document   │  │    RAG       │       │    │
│  │  │   Manager    │  │   Manager    │  │   Engine     │       │    │
│  │  │              │  │              │  │              │       │    │
│  │  │ - loadModel  │  │ - createChunks│ │ - embed      │       │    │
│  │  │ - getConfig  │  │ - putChunk   │  │ - topK       │       │    │
│  │  │ - progress   │  │ - putVector  │  │ - mmr        │       │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │    │
│  │  │   Prompt     │  │  Generation  │  │  Validators  │       │    │
│  │  │   Builder    │  │   Engine     │  │              │       │    │
│  │  │              │  │              │  │              │       │    │
│  │  │ - buildPrompt│  │ - generateText│ │ - validateAlta│      │    │
│  │  │ - buildAlta  │  │ - postProcess│  │ - validateAlrg│      │    │
│  │  │ - compact    │  │ - enforce4   │  │ - looksGarbage│      │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│          ┌───────────────────┼───────────────────┐                  │
│          ▼                   ▼                   ▼                   │
│  ┌──────────────┐   ┌──────────────┐    ┌──────────────┐            │
│  │ Transformers │   │   IndexedDB  │    │   Express    │            │
│  │     .js      │   │              │    │   Server     │            │
│  │              │   │              │    │              │            │
│  │ - LLM ONNX   │   │ - chunks     │    │ - /api/config│            │
│  │ - Embeddings │   │ - vectors    │    │ - /models/*  │            │
│  │ - WebGPU/WASM│   │              │    │ - static     │            │
│  └──────────────┘   └──────────────┘    └──────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo de Datos RAG

```
DOCUMENTO JSON
      │
      ▼
┌─────────────────┐
│   CHUNKING      │  Divide en: resumen, evolucion_dia, laboratorios, alta
│   (createChunks)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   EMBEDDING     │  Modelo: Xenova/multilingual-e5-small (384 dims)
│   (embed)       │  Prefijo: "passage: " para documentos
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   INDEXDB       │  Almacena: {chunkKey, text, sourceHint, chunkType}
│   Storage       │  Vectores: Float32Array(384)
└────────┬────────┘
         │
         ▼
    [USUARIO PREGUNTA]
         │
         ▼
┌─────────────────┐
│   QUERY EMBED   │  Prefijo: "query: " para preguntas
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   RETRIEVAL     │  1. Top-K cosine similarity (k=10)
│   (topK + MMR)  │  2. MMR para diversidad (lambda=0.7, k=3)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PROMPT BUILD  │  Contexto + Pregunta + Instrucciones
│   (buildPrompt) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   GENERATION    │  LLM ONNX con config segun caso de uso
│   (generateText)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   POST-PROCESS  │  Validacion de formato, fallback deterministico
│   (enforce...)  │
└────────┬────────┘
         │
         ▼
    [RESPUESTA + FUENTES]
```

---

## 3. STACK TECNOLOGICO

### 3.1 Backend

| Componente | Version | Proposito |
|------------|---------|-----------|
| Node.js | 18+ | Runtime JavaScript |
| Express | 4.18.2 | Servidor HTTP |
| TypeScript | 5.3.3 | Tipado estatico |
| dotenv | 17.2.3 | Variables de entorno |

### 3.2 Frontend

| Componente | Version | Proposito |
|------------|---------|-----------|
| HTML5 | - | Estructura |
| CSS3 | - | Estilos |
| JavaScript ES2022 | - | Logica |
| Transformers.js | v3 (CDN) | LLM + Embeddings |
| IndexedDB | Nativo | Almacenamiento |
| WebGPU/WASM | Nativo | Aceleracion |

### 3.3 Modelos ONNX Soportados

| Modelo | Tamano | Estado | Notas |
|--------|--------|--------|-------|
| Llama-3.2-1B-Instruct | ~1.1GB | Funcional | Q4F16, recomendado |
| Llama-3.2-1B-Instruct-ONNX | ~2.5GB | Funcional | FP16, mayor precision |
| Phi-3.5-mini-instruct-onnx-web | ~2.2GB | Funcional | Microsoft |
| Ministral-3-3B-Instruct-2512-ONNX | ~2.4GB | Funcional | Mejor calidad |
| granite-3.0-2b-instruct | ~1.6GB | Funcional | IBM |
| SmolLM2-360M-Instruct | ~200MB | Experimental | Muy rapido |

### 3.4 Modelo de Embeddings

| Modelo | Dimensiones | Backend |
|--------|-------------|---------|
| Xenova/multilingual-e5-small | 384 | WASM (siempre) |

---

## 4. ESTRUCTURA DE ARCHIVOS

```
proyecto/
├── package.json                 # Configuracion raiz
├── .env                         # Variables de entorno (crear)
├── .env.example                 # Plantilla de variables
├── .gitignore                   # Archivos excluidos
│
├── backend/
│   ├── package.json             # Dependencias backend
│   ├── tsconfig.json            # Configuracion TypeScript
│   └── src/
│       └── server.ts            # Servidor Express (117 lineas)
│
├── public/
│   ├── index.html               # Interfaz de usuario
│   ├── app.js                   # Logica principal (~2200 lineas)
│   └── style.css                # Estilos CSS
│
├── models/                      # Modelos ONNX locales (opcional)
│   └── [nombre-modelo]/
│       ├── config.json
│       ├── generation_config.json
│       ├── tokenizer.json
│       ├── tokenizer_config.json
│       ├── special_tokens_map.json
│       └── *.onnx
│
└── scripts/
    └── download-mlc-model.js    # Descargador de modelos
```

---

## 5. BACKEND - ESPECIFICACIONES

### 5.1 Archivo: `backend/src/server.ts`

#### Proposito
Servidor Express minimalista que:
1. Sirve archivos estaticos del frontend
2. Proporciona configuracion via API
3. Opcionalmente sirve modelos ONNX locales
4. Configura headers COOP/COEP/CORP para SharedArrayBuffer

#### Variables de Entorno

```typescript
PORT=3030                        // Puerto del servidor (default: 4040)
MODEL_SOURCE=remote              // "local" o "remote"
DEFAULT_MODEL=...                // Modelo por defecto
GENERATION_CONFIG=rag            // "rag", "analysis", "extraction", "legacy"
```

#### Codigo Completo

```typescript
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env en la raiz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const app = express();
app.disable('etag');

const PORT = parseInt(process.env.PORT || '4040', 10);
const MODEL_SOURCE = process.env.MODEL_SOURCE || 'remote';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'onnx-community/Qwen2.5-0.5B-Instruct';
const GENERATION_CONFIG = process.env.GENERATION_CONFIG || 'rag';

// Validar GENERATION_CONFIG
const VALID_CONFIGS = ['rag', 'analysis', 'extraction', 'legacy'];
if (!VALID_CONFIGS.includes(GENERATION_CONFIG)) {
  console.warn(`GENERATION_CONFIG="${GENERATION_CONFIG}" no valido. Usando "rag" por defecto.`);
}

// Headers COOP/COEP/CORP globales (requeridos para crossOriginIsolated y SharedArrayBuffer)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

// API endpoint para obtener configuracion
app.get('/api/config', (req, res) => {
  res.json({
    modelSource: MODEL_SOURCE,
    defaultModel: DEFAULT_MODEL,
    modelsBaseUrl: MODEL_SOURCE === 'local' ? '/models' : 'https://huggingface.co',
    generationConfig: VALID_CONFIGS.includes(GENERATION_CONFIG) ? GENERATION_CONFIG : 'rag',
  });
});

// Si MODEL_SOURCE=local, servir modelos desde /models
if (MODEL_SOURCE === 'local') {
  const modelsPath = path.join(__dirname, '../../models');

  if (!fs.existsSync(modelsPath)) {
    console.warn(`Warning: Carpeta models/ no existe. Creandola...`);
    fs.mkdirSync(modelsPath, { recursive: true });
  }

  // Servir modelos ONNX con headers apropiados
  app.use('/models', express.static(modelsPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.onnx')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      } else if (filePath.endsWith('.onnx_data')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      } else if (filePath.endsWith('.bin')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
    }
  }));

  console.log(`Serving models from: ${modelsPath}`);

  // Listar modelos disponibles
  try {
    const modelDirs = fs.readdirSync(modelsPath)
      .filter(name => fs.statSync(path.join(modelsPath, name)).isDirectory());

    if (modelDirs.length > 0) {
      console.log(`Available local models:`);
      modelDirs.forEach(dir => console.log(`   - ${dir}`));
    }
  } catch (err) {
    console.error(`Error reading models directory:`, err);
  }
}

// Servir archivos estaticos desde public/
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/models/')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nServer running at http://0.0.0.0:${PORT}`);
  console.log(`Model source: ${MODEL_SOURCE}`);
  console.log(`COOP/COEP/CORP headers enabled for crossOriginIsolated\n`);
});
```

### 5.2 Archivo: `backend/package.json`

```json
{
  "name": "local-chat-backend",
  "version": "1.0.0",
  "description": "Backend Express para local-chat RAG",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsc && node dist/server.js"
  },
  "dependencies": {
    "dotenv": "^17.2.3",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3"
  }
}
```

### 5.3 Archivo: `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## 6. FRONTEND - HTML/CSS

### 6.1 Archivo: `public/index.html`

#### Estructura de Secciones

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Local Chat - RAG en el Navegador (ONNX)</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="container">
      <!-- HEADER -->
      <header>
        <h1>Local Chat - RAG</h1>
        <p class="subtitle">LLM ONNX + Embeddings 100% en el navegador</p>
        <div id="isolation-status" class="status-box">
          <span id="isolation-text">Verificando crossOriginIsolated...</span>
          <span id="webgpu-text" style="margin-left: 15px;">WebGPU: verificando...</span>
        </div>
      </header>

      <main>
        <!-- SECCION 1: CARGAR MODELO LLM -->
        <section class="card">
          <h2>1. Cargar Modelo LLM (ONNX)</h2>
          <div class="model-selector-group">
            <label for="model-select" class="model-label">Seleccionar Modelo:</label>
            <select id="model-select" class="model-select">
              <option value="onnx-community/Llama-3.2-1B-Instruct">
                Llama 3.2 1B Instruct Q4F16 (~1.1GB - Rapido)
              </option>
              <option value="onnx-community/Llama-3.2-1B-Instruct-ONNX">
                Llama 3.2 1B Instruct FP16 (~2.5GB - Mayor Precision)
              </option>
              <option value="onnx-community/Phi-3.5-mini-instruct-onnx-web">
                Phi 3.5 Mini Instruct (~2.2GB - Microsoft)
              </option>
              <option value="mistralai/Ministral-3-3B-Instruct-2512-ONNX">
                Ministral 3 3B Instruct ONNX (~2.4GB - Mejor calidad)
              </option>
              <option value="onnx-community/granite-3.0-2b-instruct">
                Granite 3.0 2B Instruct (~1.6GB - IBM)
              </option>
              <option value="HuggingFaceTB/SmolLM2-360M-Instruct">
                SmolLM2 360M Instruct (~200MB - Experimental)
              </option>
              <!-- Opciones deshabilitadas para modelos no funcionales -->
              <option value="..." disabled>... (NO FUNCIONAL)</option>
            </select>
          </div>
          <p class="model-info">
            Los modelos se descargan desde HuggingFace y se cachean en el navegador.
          </p>
          <button id="load-model-btn" class="btn btn-primary">
            Cargar Modelo LLM
          </button>
          <div id="model-status" class="status-text"></div>
        </section>

        <!-- SECCION 2: SUBIR E INDEXAR DOCUMENTO -->
        <section class="card">
          <h2>2. Subir e Indexar Documento</h2>
          <div class="file-input-group">
            <label for="file-input" class="file-label">Seleccionar Epicrisis JSON:</label>
            <input type="file" id="file-input" accept=".json" />
          </div>
          <button id="index-btn" class="btn btn-secondary" disabled>
            Indexar
          </button>
          <div id="index-status" class="status-text"></div>
        </section>

        <!-- SECCION 3: HACER PREGUNTAS (RAG) -->
        <section class="card">
          <h2>3. Hacer Preguntas</h2>
          <div class="question-group">
            <label for="question-input">Pregunta:</label>
            <input
              type="text"
              id="question-input"
              placeholder="Ej: Cual fue el motivo de ingreso?"
            />
          </div>
          <button id="ask-btn" class="btn btn-primary" disabled>
            Preguntar
          </button>
          <div id="answer-status" class="status-text"></div>

          <div id="answer-section" class="answer-box" style="display: none">
            <h3>Respuesta:</h3>
            <div id="answer-text" class="answer-content"></div>
          </div>

          <div id="sources-section" class="sources-box" style="display: none">
            <h3>Fuentes:</h3>
            <ul id="sources-list"></ul>
          </div>
        </section>

        <!-- SECCION 4: CONSULTAS SIMPLES -->
        <section class="card">
          <h2>4. Consultas Simples (Pruebas)</h2>
          <p class="simple-query-info">
            Envia un prompt directo al modelo sin formato especifico de salida.
          </p>
          <div class="question-group">
            <label for="simple-query-input">Prompt:</label>
            <textarea
              id="simple-query-input"
              rows="4"
              placeholder="Ej: Cual es la capital de Francia?"
            ></textarea>
          </div>
          <button id="simple-query-btn" class="btn btn-secondary" disabled>
            Enviar Consulta
          </button>
          <div id="simple-query-status" class="status-text"></div>

          <div id="simple-query-section" class="answer-box" style="display: none">
            <h3>Respuesta del Modelo:</h3>
            <textarea id="simple-query-output" class="resumen-output" readonly rows="10"></textarea>
            <div class="simple-query-metrics" id="simple-query-metrics"></div>
          </div>
        </section>

        <!-- SECCION 5: RESUMEN DE ALTA -->
        <section class="card">
          <h2>5. Generar Resumen de Alta (Epicrisis)</h2>
          <p class="resumen-info">
            Genera un resumen de alta completo en estilo narrativo medico clasico.
          </p>
          <button id="generate-resumen-btn" class="btn btn-accent" disabled>
            Generar Resumen de Alta
          </button>
          <div id="resumen-status" class="status-text"></div>

          <div id="resumen-section" class="resumen-box" style="display: none">
            <h3>Resumen de Alta (Epicrisis):</h3>
            <textarea id="resumen-output" class="resumen-output" readonly rows="20"></textarea>
            <button id="copy-resumen-btn" class="btn btn-secondary btn-small">
              Copiar al Portapapeles
            </button>
          </div>
        </section>

        <!-- SECCION 6: UTILIDADES -->
        <section class="card">
          <h2>6. Utilidades</h2>
          <button id="clear-db-btn" class="btn btn-danger">
            Limpiar Base de Datos
          </button>
          <div id="clear-status" class="status-text"></div>
        </section>
      </main>

      <footer>
        <p>Powered by Transformers.js (ONNX) + WebGPU</p>
      </footer>
    </div>

    <script type="module" src="app.js"></script>
  </body>
</html>
```

### 6.2 Archivo: `public/style.css`

#### Especificaciones de Diseno

**Paleta de Colores:**
- Primary: `#667eea` (Azul-violeta)
- Secondary: `#48bb78` (Verde)
- Accent: `#9f7aea` (Violeta)
- Danger: `#f56565` (Rojo)
- Background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

**Tipografia:**
- Familia: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`
- Resumen output: `'Georgia', 'Times New Roman', serif`

```css
/* Reset y base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
  color: #333;
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

/* Header */
header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1.1em;
  opacity: 0.9;
  margin-bottom: 15px;
}

.status-box {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 10px 20px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

/* Cards */
main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.card h2 {
  font-size: 1.5em;
  color: #667eea;
  margin-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

/* Botones */
.btn {
  padding: 12px 24px;
  font-size: 1em;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-right: 10px;
  margin-top: 10px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #48bb78;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #38a169;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
}

.btn-accent {
  background: #9f7aea;
  color: white;
}

.btn-accent:hover:not(:disabled) {
  background: #805ad5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(159, 122, 234, 0.4);
}

.btn-danger {
  background: #f56565;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #e53e3e;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 101, 101, 0.4);
}

.btn-small {
  padding: 8px 16px;
  font-size: 0.9em;
  margin-top: 10px;
}

/* Inputs y selects */
.model-selector-group,
.file-input-group,
.question-group {
  margin-bottom: 15px;
}

.model-label,
.file-label,
.question-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
}

.model-select,
#question-input {
  width: 100%;
  padding: 12px;
  font-size: 1em;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  transition: border-color 0.3s ease;
}

.model-select:focus,
#question-input:focus {
  outline: none;
  border-color: #667eea;
}

#file-input {
  padding: 8px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  width: 100%;
  cursor: pointer;
}

#file-input:hover {
  border-color: #667eea;
}

/* Info boxes */
.model-info,
.simple-query-info {
  font-size: 0.9em;
  color: #666;
  margin-top: 10px;
  margin-bottom: 10px;
  padding: 10px;
  background: #f7fafc;
  border-radius: 6px;
  border-left: 3px solid #667eea;
}

.resumen-info {
  font-size: 0.9em;
  color: #666;
  margin-top: 10px;
  margin-bottom: 15px;
  padding: 10px;
  background: #faf5ff;
  border-radius: 6px;
  border-left: 3px solid #9f7aea;
}

/* Status text */
.status-text {
  margin-top: 10px;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.95em;
  min-height: 20px;
}

.status-text.success {
  background: #c6f6d5;
  color: #22543d;
  border-left: 4px solid #48bb78;
}

.status-text.error {
  background: #fed7d7;
  color: #742a2a;
  border-left: 4px solid #f56565;
}

.status-text.info {
  background: #bee3f8;
  color: #2c5282;
  border-left: 4px solid #4299e1;
}

.status-text.loading {
  background: #fefcbf;
  color: #744210;
  border-left: 4px solid #ecc94b;
}

/* Answer boxes */
.answer-box,
.sources-box {
  margin-top: 20px;
  padding: 20px;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.answer-box h3,
.sources-box h3 {
  font-size: 1.2em;
  color: #667eea;
  margin-bottom: 12px;
}

.answer-content {
  line-height: 1.6;
  color: #2d3748;
  white-space: pre-wrap;
}

#sources-list {
  list-style: none;
  padding-left: 0;
}

#sources-list li {
  padding: 8px 12px;
  background: white;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 3px solid #667eea;
  font-size: 0.9em;
  color: #555;
}

/* Resumen boxes */
.resumen-box {
  margin-top: 20px;
  padding: 20px;
  background: #faf5ff;
  border-radius: 8px;
  border: 1px solid #e9d8fd;
}

.resumen-box h3 {
  font-size: 1.2em;
  color: #9f7aea;
  margin-bottom: 12px;
}

.resumen-output {
  width: 100%;
  padding: 15px;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 0.95em;
  line-height: 1.8;
  color: #2d3748;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  resize: vertical;
  min-height: 300px;
}

/* Footer */
footer {
  text-align: center;
  color: white;
  margin-top: 30px;
  padding: 20px;
  opacity: 0.9;
}

/* Loading animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading::after {
  content: ' ';
  animation: spin 1s linear infinite;
}
```

---

## 7. FRONTEND - JAVASCRIPT (app.js)

### 7.1 Estructura General del Archivo

El archivo `app.js` se organiza en las siguientes secciones:

1. **Imports y Configuracion** (lineas 1-70)
2. **Configuraciones de Generacion** (lineas 70-180)
3. **Estado Global** (lineas 180-200)
4. **IndexedDB** (lineas 200-300)
5. **Embedding y Vectores** (lineas 300-320)
6. **Chunking del JSON** (lineas 320-580)
7. **Retrieval (cosine + MMR)** (lineas 580-640)
8. **Prompt Construction** (lineas 640-740)
9. **Output Post-processing** (lineas 740-830)
10. **UI Updates** (lineas 830-860)
11. **Generacion de Texto** (lineas 860-1010)
12. **Event Handlers** (lineas 1010-1720)
13. **Validadores** (lineas 1720-2020)
14. **Handler Resumen Alta** (lineas 2020-2160)
15. **Init** (lineas 2160-2210)

### 7.2 Imports y Configuracion Inicial

```javascript
import {
  pipeline,
  env,
  AutoTokenizer,
  AutoModelForCausalLM,
  AutoProcessor,
  AutoModelForImageTextToText,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm";

// Configurar Transformers.js
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.backends.onnx.wasm.numThreads = window.crossOriginIsolated
  ? navigator.hardwareConcurrency || 4
  : 1;
env.backends.onnx.wasm.proxy = false;
```

### 7.3 Listas de Modelos por Tipo

```javascript
// Modelos que requieren AutoModelForCausalLM
const CAUSAL_LM_MODELS = [
  "onnx-community/Qwen2.5-1.5B-Instruct",
  "onnx-community/Qwen2.5-0.5B-Instruct",
  "onnx-community/Llama-3.2-1B-Instruct",
  "onnx-community/Llama-3.2-1B-Instruct-ONNX",
  "onnx-community/Phi-3.5-mini-instruct-onnx-web",
  "onnx-community/granite-3.0-2b-instruct",
  "HuggingFaceTB/SmolLM2-360M-Instruct",
  // ... otros
];

// Modelos multimodales (AutoProcessor + AutoModelForImageTextToText)
const IMAGE_TEXT_TO_TEXT_MODELS = [
  "mistralai/Ministral-3-3B-Instruct-2512-ONNX",
];

// Modelos que REQUIEREN WASM (WebGPU incompatible)
const WASM_ONLY_MODELS = [
  "onnx-community/Qwen2.5-1.5B-Instruct",
  "onnx-community/gemma-3-1b-it-ONNX-GQA",
];

// Modelos que REQUIEREN carga remota (archivos .onnx_data externos)
const REMOTE_ONLY_MODELS = [
  "onnx-community/Llama-3.2-3B-Instruct-onnx-web",
  "onnx-community/TinySwallow-1.5B-Instruct-ONNX",
  "onnx-community/Llama-3.2-1B-Instruct-ONNX",
];

// Modelos que REQUIEREN FP16 (mayor precision)
const FP16_MODELS = [
  "onnx-community/Llama-3.2-1B-Instruct-ONNX",
];
```

### 7.4 Estado Global

```javascript
const state = {
  llm: null,              // Modelo LLM cargado
  tokenizer: null,        // Tokenizador
  processor: null,        // Para modelos image-text-to-text
  modelType: null,        // "pipeline", "causal-lm", o "image-text-to-text"
  embedder: null,         // Pipeline de embeddings
  currentFile: null,      // Archivo JSON actual
  db: null,               // Conexion IndexedDB
  config: null,           // Configuracion del servidor
  isGenerating: false,    // Flag de generacion en curso
  deviceInfo: null,       // Info de dispositivo (webgpu/wasm)
  activeGenerationConfig: 'rag', // Config activa de generacion
};
```

### 7.5 IndexedDB

```javascript
const DB_NAME = "local-chat-rag";
const DB_VERSION = 1;
const STORE_CHUNKS = "chunks";
const STORE_VECTORS = "vectors";

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      state.db = request.result;
      resolve(state.db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        db.createObjectStore(STORE_CHUNKS, { keyPath: "chunkKey" });
      }
      if (!db.objectStoreNames.contains(STORE_VECTORS)) {
        db.createObjectStore(STORE_VECTORS, { keyPath: "chunkKey" });
      }
    };
  });
}

// Funciones CRUD para IndexedDB
async function putChunk(chunk) { /* ... */ }
async function putVector(vectorData) { /* ... */ }
async function getAllVectors() { /* ... */ }
async function getChunksByKeys(keys) { /* ... */ }
async function clearAll() { /* ... */ }
```

### 7.6 Embedding

```javascript
async function embed(text) {
  if (!state.embedder) {
    throw new Error("Embedder no esta cargado");
  }
  const output = await state.embedder(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}

function normalizeVector(vec) {
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map((val) => val / norm);
}
```

---

## 8. CONFIGURACIONES DE GENERACION

### 8.1 Configuraciones Predefinidas

```javascript
const GENERATION_CONFIGS = {
  // CONFIG 1: RAG - Por Defecto
  rag: {
    max_new_tokens: 512,
    min_length: 50,
    temperature: 0.2,
    top_p: 0.9,
    repetition_penalty: 1.1,
    do_sample: true,
  },

  // CONFIG 2: ANALYSIS - Analisis Extenso
  analysis: {
    max_new_tokens: 1024,
    min_length: 100,
    temperature: 0.3,
    top_p: 0.95,
    repetition_penalty: 1.2,
    do_sample: true,
  },

  // CONFIG 3: EXTRACTION - Extraccion Precisa
  extraction: {
    max_new_tokens: 256,
    min_length: 20,
    temperature: 0.1,
    top_p: 0.8,
    repetition_penalty: 1.0,
    do_sample: false,
  },

  // CONFIG 4: RESUMEN_ALTA - Epicrisis
  resumen_alta: {
    max_new_tokens: 600,
    min_length: 100,
    temperature: 0.1,
    top_p: 0.85,
    repetition_penalty: 1.2,
    do_sample: true,
  },

  // CONFIG 5: SIMPLE_QUERY - Pruebas
  simple_query: {
    max_new_tokens: 256,
    min_length: 10,
    temperature: 0.3,
    top_p: 0.9,
    repetition_penalty: 1.1,
    do_sample: true,
  },
};
```

### 8.2 Configuracion Legacy (Deprecada)

```javascript
const LEGACY_CONFIG = {
  max_new_tokens: 128,
  temperature: 0.2,
  top_p: 0.9,
  repetition_penalty: 1.1,
};
```

---

## 9. SISTEMA DE CHUNKING

### 9.1 Funcion Principal: `createChunks(jsonData)`

La funcion divide el JSON de epicrisis en chunks semanticamente significativos:

```javascript
function createChunks(jsonData) {
  const chunks = [];
  const docId = String(jsonData.id_atencion || jsonData.atencion?.id || "unknown");

  // Helpers para formatear datos
  const nonEmpty = (s) => s && String(s).trim().length > 0;
  const listLines = (title, arr) => { /* ... */ };
  const codeNameLines = (title, arr) => { /* ... */ };
  const tratamientosLines = (arr) => { /* ... */ };
  const labsLines = (arr) => { /* ... */ };
  const altaLines = (alta) => { /* ... */ };

  // 1) CHUNK: RESUMEN
  // Incluye: tipo, ingreso, alta, edad, sexo, motivo, antecedentes,
  // diagnostico ingreso/egreso, procedimientos, tratamientos
  const resumenText = /* ... */;
  if (nonEmpty(resumenText)) {
    chunks.push({
      chunkKey: `${docId}::resumen`,
      text: resumenText,
      sourceHint: `[DOC ${docId} | resumen]`,
      chunkType: "resumen",
    });
  }

  // 2) CHUNKS: EVOLUCION DIARIA (uno por dia)
  if (Array.isArray(jsonData.evolucion_resumen)) {
    jsonData.evolucion_resumen.forEach((ev, idx) => {
      const day = ev?.dia ?? idx + 1;
      const evText = /* ... */;
      chunks.push({
        chunkKey: `${docId}::evo:${day}`,
        text: evText,
        sourceHint: `[DOC ${docId} | evolucion_dia | dia=${day}]`,
        chunkType: "evolucion_dia",
        day,
      });
    });
  }

  // 3) CHUNK: LABORATORIOS
  const labsText = labsLines(jsonData.laboratorios_resumen);
  if (nonEmpty(labsText)) {
    chunks.push({
      chunkKey: `${docId}::labs`,
      text: labsText,
      sourceHint: `[DOC ${docId} | laboratorios]`,
      chunkType: "laboratorios",
    });
  }

  // 4) CHUNK: INDICACIONES DE ALTA
  const altaText = altaLines(jsonData.indicaciones_alta);
  if (nonEmpty(altaText)) {
    chunks.push({
      chunkKey: `${docId}::alta`,
      text: altaText,
      sourceHint: `[DOC ${docId} | alta]`,
      chunkType: "alta",
    });
  }

  return chunks;
}
```

### 9.2 Formato de Cada Chunk

```javascript
{
  chunkKey: "1416169::resumen",           // ID unico
  text: "[TIPO] Epicrisis\n...",          // Contenido textual
  sourceHint: "[DOC 1416169 | resumen]",  // Referencia para citas
  chunkType: "resumen",                   // Tipo de chunk
  day: 1                                  // Solo para evolucion_dia
}
```

### 9.3 Tipos de Chunks

| Tipo | Contenido | Campos Especiales |
|------|-----------|-------------------|
| `resumen` | Datos demograficos, motivo, antecedentes, diagnosticos | - |
| `evolucion_dia` | Notas de evolucion diaria | `day` |
| `laboratorios` | Resultados de laboratorio | - |
| `alta` | Indicaciones de alta | - |

---

## 10. SISTEMA RAG (RETRIEVAL)

### 10.1 Similitud Coseno

```javascript
function cosine(vec1, vec2) {
  return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
}
```

### 10.2 Top-K

```javascript
function topK(queryVec, allVectors, k) {
  const scored = allVectors.map((item) => {
    const vec = Array.from(new Float32Array(item.vec));
    const score = cosine(queryVec, vec);
    return { chunkKey: item.chunkKey, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
```

### 10.3 Maximal Marginal Relevance (MMR)

```javascript
function mmr(queryVec, candidates, allVectors, k, lambda = 0.7) {
  const selected = [];
  const remaining = [...candidates];
  const vectorMap = new Map();

  allVectors.forEach((item) => {
    vectorMap.set(item.chunkKey, Array.from(new Float32Array(item.vec)));
  });

  while (selected.length < k && remaining.length > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const candVec = vectorMap.get(cand.chunkKey);
      const relevance = cosine(queryVec, candVec);

      let maxSim = 0;
      for (const sel of selected) {
        const selVec = vectorMap.get(sel.chunkKey);
        const sim = cosine(candVec, selVec);
        if (sim > maxSim) maxSim = sim;
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    } else {
      break;
    }
  }

  return selected;
}
```

### 10.4 Parametros de Retrieval

| Parametro | Valor | Descripcion |
|-----------|-------|-------------|
| Top-K inicial | 10 | Candidatos por similitud coseno |
| MMR k | 3 | Chunks seleccionados finales |
| MMR lambda | 0.7 | Balance relevancia/diversidad |

### 10.5 Filtros de Query

```javascript
function parseQueryFilters(question) {
  const q = question.toLowerCase();

  // Detectar dia especifico
  let day = null;
  const m1 = q.match(/\b(d[ií]a)\s*(\d{1,2})\b/);
  if (m1) day = parseInt(m1[2], 10);

  // Detectar tipos de chunk buscados
  const wantsAlta = /\balta\b|\bindicaciones\b|\bmedicamentos\b/.test(q);
  const wantsLabs = /\blab(oratorio)?\b|\bhemoglobina\b|\bcreatinina\b/.test(q);
  const wantsResumen = /\bmotivo\b|\bantecedentes\b|\bdiagn[oó]stic/.test(q);
  const wantsEvolucion = /\bevoluci[oó]n\b|\bpost\s*op\b|\bd[ií]a\b/.test(q);

  const types = new Set();
  if (wantsAlta) types.add("alta");
  if (wantsLabs) types.add("laboratorios");
  if (wantsResumen) types.add("resumen");
  if (wantsEvolucion || day !== null) types.add("evolucion_dia");

  return { day, types, hasTypeFilter: types.size > 0 };
}
```

---

## 11. SISTEMA DE GENERACION DE TEXTO

### 11.1 Funcion Principal: `generateText(prompt, options)`

```javascript
async function generateText(prompt, options = {}) {
  // 1. Obtener configuracion base
  const baseConfig = getActiveGenerationConfig();
  const config = { ...baseConfig, ...options };

  const {
    max_new_tokens,
    min_length,
    temperature,
    top_p,
    repetition_penalty,
    do_sample,
  } = config;

  // 2. Generar segun tipo de modelo
  if (state.modelType === "image-text-to-text") {
    // Para Ministral-3B y similares
    const messages = [{ role: "user", content: [{ type: "text", text: prompt }] }];
    const chatPrompt = state.processor.apply_chat_template(messages, {
      add_generation_prompt: true,
    });
    const inputs = state.tokenizer(chatPrompt, {
      return_tensors: "pt",
      add_special_tokens: false,
    });

    // Validar longitud
    const inputLength = inputs.input_ids.dims.at(-1);
    const maxContextLength = 8192;
    let adjustedMaxTokens = max_new_tokens;
    if (inputLength + max_new_tokens > maxContextLength) {
      adjustedMaxTokens = Math.max(50, maxContextLength - inputLength);
    }

    const outputs = await state.llm.generate({
      ...inputs,
      max_new_tokens: adjustedMaxTokens,
      min_length: Math.min(min_length || 10, adjustedMaxTokens),
      temperature,
      top_p,
      repetition_penalty,
      do_sample: do_sample && temperature > 0,
    });

    const newTokens = outputs.slice(null, [inputLength, null]);
    const decoded = state.tokenizer.batch_decode(newTokens, {
      skip_special_tokens: true,
    });
    return decoded[0] || "";

  } else if (state.modelType === "causal-lm") {
    // Para Llama, Phi, Qwen, etc.
    let formattedPrompt = prompt;
    if (state.tokenizer.apply_chat_template) {
      const messages = [
        { role: "system", content: "Eres un asistente medico experto..." },
        { role: "user", content: prompt }
      ];
      formattedPrompt = state.tokenizer.apply_chat_template(messages, {
        tokenize: false,
        add_generation_prompt: true,
      });
    }

    const inputs = state.tokenizer(formattedPrompt, { return_tensors: "pt" });
    const effectiveRepPenalty = Math.max(repetition_penalty, 1.5);

    const outputs = await state.llm.generate({
      ...inputs,
      max_new_tokens,
      temperature,
      top_p,
      repetition_penalty: effectiveRepPenalty,
      no_repeat_ngram_size: 3,
      do_sample: temperature > 0,
    });

    const inputLength = inputs.input_ids.dims.at(-1);
    const newTokens = outputs.slice(null, [inputLength, null]);
    const decoded = state.tokenizer.batch_decode(newTokens, {
      skip_special_tokens: true,
    });
    return decoded[0] || "";

  } else {
    // Pipeline estandar
    const output = await state.llm(prompt, {
      max_new_tokens,
      temperature,
      top_p,
      do_sample: temperature > 0,
      return_full_text: false,
    });
    return output[0]?.generated_text || "";
  }
}
```

### 11.2 Construccion de Prompts

#### Prompt RAG (Preguntas)

```javascript
function buildPrompt(chunks, question) {
  let prompt = "";
  prompt += "TAREA: extrae 4 frases EXACTAS del CONTEXTO.\n";
  prompt += "FORMATO: 4 lineas con '- ' y luego una sola linea: 'Fuente: <sourceHint>'.\n";
  prompt += "PROHIBIDO: inventar, resumir, interpretar.\n\n";

  prompt += "CONTEXTO:\n";
  chunks.forEach((chunk, i) => {
    const compact = compactChunkForPrompt(chunk, 1200);
    prompt += `${i + 1}. ${chunk.sourceHint}\n${compact}\n\n`;
  });

  prompt += `Pregunta: ${question}\n`;
  prompt += "Respuesta:\n";
  return prompt;
}
```

#### Prompt Resumen de Alta

```javascript
function buildPromptAltaResumen(chunks) {
  let prompt = "";

  // SYSTEM / ROLE
  prompt += "Eres un medico redactor clinico.\n";
  prompt += "Debes redactar un RESUMEN DE ALTA (Epicrisis) en espanol...\n";
  prompt += "Usa EXCLUSIVAMENTE la informacion del CONTEXTO.\n";
  prompt += "NO inventes datos. Si un dato no existe, omitelo o escribe 'No especificado'.\n\n";

  // FORMATO OBLIGATORIO
  prompt += "FORMATO DE SALIDA OBLIGATORIO:\n";
  prompt += "- 1. Titulo: RESUMEN DE ALTA (Epicrisis)\n";
  prompt += "- 2. Parrafo 1: Identificacion del paciente...\n";
  prompt += "- 3. Parrafo 2: Antecedentes relevantes y alergias\n";
  prompt += "- 4. Parrafo 3: Diagnosticos de ingreso, procedimientos y tratamientos\n";
  prompt += "- 5. Parrafo 4: Evolucion clinica resumida y laboratorios\n";
  prompt += "- 6. Parrafo 5: Diagnosticos de egreso\n";
  prompt += "- 7. Seccion final: 'Indicaciones al alta:' con vinetas\n\n";

  // REGLAS ESTRICTAS
  prompt += "REGLAS ESTRICTAS:\n";
  prompt += "- Prohibido inventar, interpretar o suponer informacion\n";
  prompt += "- No mencionar 'chunks', 'RAG', 'vector', 'JSON'\n";
  prompt += "- Usar tercera persona y redaccion clinica\n";
  // ... mas reglas

  // REGLA CRITICA PARA INDICACIONES AL ALTA
  prompt += "REGLA CRITICA - INDICACIONES AL ALTA:\n";
  prompt += "- SOLO puedes usar informacion del bloque [TIPO] Indicaciones de alta\n";
  prompt += "- Si NO existe ese bloque, escribir: 'Indicaciones al alta: No especificadas'\n";
  // ... mas reglas

  // CONTEXTO
  prompt += "CONTEXTO CLINICO:\n";
  chunks.forEach((chunk) => {
    const compact = compactChunkForPrompt(chunk, 1400);
    prompt += `${compact}\n\n`;
  });

  // TAREA
  prompt += "TAREA:\n";
  prompt += "Redacta el RESUMEN DE ALTA (Epicrisis) siguiendo el formato y reglas.\n";

  return prompt;
}
```

### 11.3 Compactacion de Chunks

```javascript
function compactChunkForPrompt(chunk, maxChars = 1200) {
  if (!chunk || !chunk.text) return "";
  const txt = String(chunk.text);

  // Preferir solo la seccion [TEXTO] cuando existe
  const m = txt.match(/\[TEXTO\]\s*\n([\s\S]*)/i);
  const body = (m ? m[1] : txt).trim();

  // Mantener lineas de header pequenas
  const headerLines = txt
    .split(/\r?\n/)
    .filter((l) => /^\[(TIPO|DIA|INGRESO|ALTA|EDAD|SEXO|MOTIVO)\]/i.test(l))
    .slice(0, 10)
    .join("\n");

  const combined = (headerLines ? headerLines + "\n\n" : "") + body;
  if (combined.length <= maxChars) return combined;
  return combined.slice(0, maxChars) + "\n[...TRUNCADO...]";
}
```

---

## 12. VALIDADORES DE SALIDA

### 12.1 Deteccion de Basura

```javascript
function looksLikeGarbage(output) {
  if (!output) return true;
  const s = String(output);
  // Patrones repetitivos de numeros
  if (/\b\d{3,}(?:-\d{1,4}){4,}\b/.test(s)) return true;
  // Tokens cortos repetitivos
  if (/(\b\w+\b)(?:\s*\1){10,}/i.test(s)) return true;
  return false;
}
```

### 12.2 Validacion de Formato (4 Bullets)

```javascript
function enforceExtractionFormat(rawOutput, chunks) {
  const out = String(rawOutput || "").trim();

  // Debe contener al menos 4 bullets y linea Fuente
  const bulletLines = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));

  const hasFuente = /\bFuente\s*:/i.test(out);

  if (looksLikeGarbage(out) || bulletLines.length < 4 || !hasFuente) {
    return buildDeterministicExtraction(chunks);
  }

  // Mantener SOLO primeros 4 bullets y primera linea Fuente
  const first4 = bulletLines.slice(0, 4);
  const fuenteLine = out
    .split(/\r?\n/)
    .find((l) => /^Fuente\s*:/i.test(l));

  const answer = first4.join("\n") + "\n" + fuenteLine;
  return { answer, sources: chunks };
}
```

### 12.3 Fallback Deterministico

```javascript
function buildDeterministicExtraction(chunks) {
  const primary = chunks && chunks.length ? chunks[0] : null;
  if (!primary) return { answer: "No esta en el informe.", sources: [] };

  const bullets = extractFourSentencesFromChunk(primary.text);
  while (bullets.length < 4) {
    bullets.push(bullets[bullets.length - 1] || primary.text.trim().slice(0, 200));
  }

  const answer = bullets.map((b) => `- ${b}`).join("\n") + `\nFuente: ${primary.sourceHint}`;
  return { answer, sources: [primary] };
}
```

### 12.4 Validador de Indicaciones al Alta

```javascript
function validateAltaIndications(altaChunkText, modelOutput) {
  const allowed = extractAltaLinesFromContext(altaChunkText);
  const produced = extractAltaLinesFromOutput(modelOutput);
  const warnings = [];

  // Si no hay indicaciones en contexto, output no deberia inventar
  if (allowed.length === 0 && produced.length > 0) {
    warnings.push({
      type: "invented_section",
      message: "No hay indicaciones de alta en el contexto, pero el modelo genero indicaciones.",
      severity: "high"
    });
  }

  // Cada linea producida debe tener correspondencia
  for (const line of produced) {
    const hasMatch = allowed.some(a => {
      const aWords = a.split(/\s+/).filter(w => w.length > 3);
      const matchCount = aWords.filter(w => line.includes(w)).length;
      return matchCount >= Math.min(2, aWords.length);
    });

    if (!hasMatch && line.length > 10) {
      warnings.push({
        type: "unmatched_indication",
        message: `Indicacion posiblemente inventada: "${line}"`,
        severity: "medium"
      });
    }
  }

  // Detectar numeros inventados
  // Detectar duraciones inventadas
  // Detectar signos de alarma expandidos
  // ... (ver codigo completo)

  const highSeverityCount = warnings.filter(w => w.severity === "high").length;
  return {
    ok: highSeverityCount === 0,
    warnings,
    summary: warnings.length === 0
      ? "Indicaciones al alta validadas correctamente"
      : `${warnings.length} advertencia(s) encontrada(s)`
  };
}
```

### 12.5 Validador de Alergias

```javascript
function validateAllergies(contextText, modelOutput) {
  const warnings = [];
  const ctx = normalizeText(contextText);
  const out = normalizeText(modelOutput);

  const noAllergyPatterns = [
    /sin\s+alergias?\s+conocidas?/i,
    /niega\s+alergias?/i,
    /no\s+refiere\s+alergias?/i
  ];

  const contextHasNoAllergies = noAllergyPatterns.some(p => p.test(ctx));

  if (contextHasNoAllergies) {
    // Verificar que no haya inventado alergias
    const inventedAllergyPatterns = [
      /alergia\s+a\s+\w+/i,
      /alergico\s+a\s+\w+/i,
    ];

    const outputInventedAllergy = inventedAllergyPatterns.some(p => {
      const match = out.match(p);
      return match && !ctx.includes(normalizeText(match[0]));
    });

    if (outputInventedAllergy) {
      warnings.push({
        type: "invented_allergy",
        message: "El contexto indica 'sin alergias conocidas' pero el output menciona alergias",
        severity: "high"
      });
    }
  }

  return {
    ok: warnings.filter(w => w.severity === "high").length === 0,
    warnings,
    summary: warnings.length === 0 ? "Alergias validadas" : `${warnings.length} advertencia(s)`
  };
}
```

---

## 13. FORMATO DE DATOS DE ENTRADA (JSON)

### 13.1 Estructura Completa del JSON de Epicrisis

```json
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
    { "codigo": "87.41", "nombre": "TAC de torax" }
  ],
  "tratamientos_intrahosp": [
    {
      "codigo": "ATC:J01CR05",
      "nombre": "Piperacilina/Tazobactam",
      "via": "EV",
      "inicio": "2025-12-15",
      "fin": "2025-12-19"
    },
    {
      "codigo": "ATC:J01DH02",
      "nombre": "Meropenem 1g c/8h",
      "via": "EV",
      "inicio": "2025-12-19",
      "fin": "2025-12-26"
    }
  ],
  "evolucion_resumen": [
    {
      "dia": 1,
      "texto": "TORAX- PLEUROSTOMIA PACIENTE POST OP DE CIRUGIA DE MILES..."
    },
    {
      "dia": 2,
      "texto": "TORAX ESTABLE, PLEUROSTOMIA 1340 CC SEROHEMATICO..."
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
      "periodo": {
        "min": 7.8,
        "max": 7.8
      }
    }
  ],
  "diagnostico_egreso": [
    { "codigo": "C20", "nombre": "Tumor maligno del recto - Post operatorio cirugia de Miles" },
    { "codigo": "J90", "nombre": "Derrame pleural bilateral resuelto" }
  ],
  "indicaciones_alta": {
    "medicamentos": [
      {
        "codigo": "ATC:J01DH02",
        "nombre": "Meropenem",
        "dosis": "1g",
        "via": "EV",
        "frecuencia": "cada 8 horas",
        "duracion": "Completar esquema segun infectologia"
      }
    ],
    "controles": [
      "Control con cirugia de torax en caso de sintomas respiratorios",
      "Control con cirugia digestiva para seguimiento de colostomia",
      "Retiro de puntos de pleurostomia en 5-7 dias"
    ],
    "cuidados": [
      "Curacion de herida perineal con VAC segun indicacion",
      "Curacion de sitio de pleurostomia",
      "Cuidados de colostomia",
      "Kinesioterapia respiratoria y motora"
    ],
    "signos_alarma": [
      "Fiebre mayor a 38C",
      "Disnea o dificultad respiratoria",
      "Dolor toracico",
      "Aumento de volumen o secrecion por heridas"
    ]
  }
}
```

### 13.2 Campos Obligatorios

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id_atencion` | number/string | Identificador unico de la atencion |
| `paciente.sexo` | string | "F" o "M" |
| `paciente.edad` | number | Edad en anos |
| `atencion.fecha_ingreso` | string | Formato ISO (YYYY-MM-DD) |
| `atencion.fecha_alta` | string | Formato ISO (YYYY-MM-DD) |
| `motivo_ingreso` | string | Motivo de hospitalizacion |

### 13.3 Campos Opcionales

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `antecedentes.medicos` | string[] | Lista de antecedentes medicos |
| `antecedentes.quirurgicos` | string[] | Lista de antecedentes quirurgicos |
| `antecedentes.alergias` | string | Texto de alergias |
| `diagnostico_ingreso` | object[] | Lista de {codigo, nombre} |
| `diagnostico_egreso` | object[] | Lista de {codigo, nombre} |
| `procedimientos` | object[] | Lista de {codigo, nombre} |
| `tratamientos_intrahosp` | object[] | Lista de tratamientos |
| `evolucion_resumen` | object[] | Lista de {dia, texto} |
| `laboratorios_resumen` | object[] | Resultados de laboratorio |
| `indicaciones_alta` | object | Indicaciones al alta |

---

## 14. GUIA DE IMPLEMENTACION

### 14.1 Requisitos del Sistema

- **Node.js**: 18.0.0 o superior
- **Navegador**: Chrome 113+, Edge 113+, Safari 16.4+ (con WebGPU)
- **RAM**: 8GB minimo, 16GB recomendado
- **Almacenamiento**: 5GB+ para cache de modelos

### 14.2 Instalacion

```bash
# 1. Clonar/crear estructura de proyecto
mkdir local-chat-rag && cd local-chat-rag

# 2. Crear package.json raiz
npm init -y

# 3. Crear estructura de directorios
mkdir -p backend/src public scripts models docs

# 4. Instalar dependencias del backend
cd backend
npm init -y
npm install express dotenv
npm install -D typescript @types/express @types/node

# 5. Compilar TypeScript
npm run build

# 6. Volver a raiz e iniciar
cd ..
npm start
```

### 14.3 Archivo .env

```bash
# Crear en raiz del proyecto
PORT=3030
MODEL_SOURCE=remote
DEFAULT_MODEL=onnx-community/Llama-3.2-1B-Instruct
GENERATION_CONFIG=rag
```

### 14.4 Scripts de NPM (package.json raiz)

```json
{
  "name": "local-chat-webllm",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "install-backend": "cd backend && npm install",
    "build": "cd backend && npm run build",
    "start": "cd backend && npm start",
    "dev": "cd backend && npm run dev",
    "setup": "npm run install-backend && npm run build"
  }
}
```

### 14.5 Flujo de Uso

1. **Iniciar servidor**: `npm start`
2. **Abrir navegador**: `http://localhost:3030`
3. **Cargar modelo**: Seleccionar modelo y click "Cargar Modelo LLM"
4. **Subir documento**: Seleccionar JSON de epicrisis y click "Indexar"
5. **Hacer preguntas**: Escribir pregunta y click "Preguntar"
6. **Generar resumen**: Click "Generar Resumen de Alta"

### 14.6 Notas de Compatibilidad

- **WebGPU**: Mejor rendimiento, no todos los navegadores lo soportan
- **WASM**: Fallback universal, mas lento
- **crossOriginIsolated**: Requerido para SharedArrayBuffer y multi-threading
- **Cache de navegador**: Los modelos se cachean automaticamente

---

## ANEXOS

### A. Lista de Funciones Principales

| Funcion | Linea | Proposito |
|---------|-------|-----------|
| `initDB()` | 202 | Inicializa IndexedDB |
| `embed(text)` | 298 | Genera embedding |
| `createChunks(jsonData)` | 318 | Divide JSON en chunks |
| `topK(queryVec, allVectors, k)` | 583 | Busqueda Top-K |
| `mmr(queryVec, candidates, ...)` | 593 | Maximal Marginal Relevance |
| `buildPrompt(chunks, question)` | 659 | Construye prompt RAG |
| `buildPromptAltaResumen(chunks)` | 681 | Construye prompt Resumen Alta |
| `generateText(prompt, options)` | 857 | Genera texto con LLM |
| `handleLoadModel()` | 1011 | Handler carga de modelo |
| `handleIndex()` | 1366 | Handler indexacion |
| `handleAsk()` | 1442 | Handler preguntas RAG |
| `handleSimpleQuery()` | 1636 | Handler consultas simples |
| `handleGenerateResumenAlta()` | 2019 | Handler resumen de alta |
| `validateAltaIndications(...)` | 1792 | Valida indicaciones |
| `validateAllergies(...)` | 1959 | Valida alergias |
| `init()` | 2161 | Inicializacion de app |

### B. Mensajes de Estado

| Estado | CSS Class | Color | Uso |
|--------|-----------|-------|-----|
| Info | `.info` | Azul | Informacion general |
| Loading | `.loading` | Amarillo | Proceso en curso |
| Success | `.success` | Verde | Operacion exitosa |
| Error | `.error` | Rojo | Error |

### C. Estructura de Respuesta RAG

```
- [Frase 1 extraida del contexto]
- [Frase 2 extraida del contexto]
- [Frase 3 extraida del contexto]
- [Frase 4 extraida del contexto]
Fuente: [DOC id | tipo | detalles]
```

---

**FIN DEL DOCUMENTO DE ESPECIFICACIONES**

*Este documento contiene toda la informacion necesaria para reproducir completamente la aplicacion Local Chat RAG con ONNX.*
