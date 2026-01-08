import {
  pipeline,
  env,
  AutoTokenizer,
  AutoModelForCausalLM,
  AutoProcessor,
  AutoModelForImageTextToText,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm";

// Configurar Transformers.js
// allowLocalModels se configura dinámicamente según config del servidor
env.allowLocalModels = false; // Por defecto false, se activa si modelSource=local
env.allowRemoteModels = true;
env.backends.onnx.wasm.numThreads = window.crossOriginIsolated
  ? navigator.hardwareConcurrency || 4
  : 1;
env.backends.onnx.wasm.proxy = false;

// Modelos que requieren AutoModelForCausalLM en lugar de pipeline
const CAUSAL_LM_MODELS = [
  "onnx-community/Qwen2.5-1.5B-Instruct",
  "onnx-community/Qwen2.5-0.5B-Instruct",
  "onnx-community/Qwen2.5-0.5B-Instruct-ONNX-GQA",
  "onnx-community/TinySwallow-1.5B-Instruct-ONNX",
  "onnx-community/Llama-3.2-1B-Instruct",
  "onnx-community/Llama-3.2-1B-Instruct-ONNX", // Versión FP16 para mayor precisión
  "onnx-community/Llama-3.2-3B-Instruct-onnx-web",
  "onnx-community/Falcon3-1B-Instruct",
  "onnx-community/Phi-3.5-mini-instruct-onnx-web",
  "onnx-community/Phi-4-mini-instruct-web-q4f16",
  "onnx-community/granite-3.0-2b-instruct",
  "HuggingFaceTB/SmolLM2-360M-Instruct",
  "onnx-community/gemma-3-1b-it-ONNX-GQA",
];

// Modelos multimodales que usan AutoProcessor + AutoModelForImageTextToText (para texto)
const IMAGE_TEXT_TO_TEXT_MODELS = [
  "mistralai/Ministral-3-3B-Instruct-2512-ONNX",
  "onnx-community/LFM2-VL-1.6B-ONNX",
];

// Modelos que REQUIEREN WASM (WebGPU no compatible o inestable)
// Estos modelos fallan con WebGPU debido a operadores no soportados o límites de memoria
const WASM_ONLY_MODELS = [
  "onnx-community/Qwen2.5-1.5B-Instruct", // RuntimeError: Aborted() con WebGPU Q4F16
  "onnx-community/gemma-3-1b-it-ONNX-GQA", // Bug overflow fp16/q4f16 en WebGPU - usar WASM+q4
];

// Modelos que REQUIEREN carga remota (archivos .onnx_data externos no funcionan con local)
// Estos modelos usan external_data_format y fallan con "Module.MountedFiles not available"
const REMOTE_ONLY_MODELS = [
  "onnx-community/Llama-3.2-3B-Instruct-onnx-web", // Archivos .onnx_data externos >2GB
  "onnx-community/TinySwallow-1.5B-Instruct-ONNX", // Archivos .onnx_data externos ~1.2GB
  "onnx-community/gemma-3-1b-it-ONNX-GQA", // Archivos .onnx_data externos ~2GB
  "onnx-community/Llama-3.2-1B-Instruct-ONNX", // Archivos .onnx_data externos ~2.5GB (FP16)
];

// Modelos que REQUIEREN FP16 (mayor precisión para respuestas coherentes)
// Q4F16 puede producir respuestas incoherentes en prompts largos/complejos
const FP16_MODELS = [
  "onnx-community/Llama-3.2-1B-Instruct-ONNX", // FP16 para mejor precisión (~2.5GB)
];

// ============================================================================
// CONFIGURACIONES DE GENERACIÓN
// ============================================================================

// Configuración ANTERIOR (deprecada - solo para referencia)
const LEGACY_CONFIG = {
  max_new_tokens: 128,      // ⚠️ MUY LIMITADO - Solo ~100 palabras
  temperature: 0.2,
  top_p: 0.9,
  repetition_penalty: 1.1,
  // Sin min_length
  // Sin do_sample explícito
  // Sin validación de ventana de contexto
};

// Configuraciones NUEVAS (optimizadas por caso de uso)
const GENERATION_CONFIGS = {
  // CONFIG 1: RAG (Retrieval-Augmented Generation) - Por Defecto
  // Uso: Respuestas informativas basadas en documentos recuperados
  // Características: Balanceado entre precisión y completitud
  rag: {
    max_new_tokens: 512,      // 4x mejora vs legacy (512 vs 128)
    min_length: 50,           // ✨ NUEVO: Evita respuestas muy cortas
    temperature: 0.2,         // Baja aleatoriedad = consistencia
    top_p: 0.9,               // Nucleus sampling estándar
    repetition_penalty: 1.1,  // Penalización moderada
    do_sample: true,          // ✨ NUEVO: Habilita sampling
  },

  // CONFIG 2: ANALYSIS (Análisis Extenso)
  // Uso: Análisis detallados, explicaciones complejas, documentación
  // Características: Respuestas más largas y elaboradas
  analysis: {
    max_new_tokens: 1024,     // 8x mejora vs legacy (1024 vs 128)
    min_length: 100,          // ✨ NUEVO: Garantiza respuestas sustanciales
    temperature: 0.3,         // Ligeramente más creativo que RAG
    top_p: 0.95,              // Mayor diversidad de vocabulario
    repetition_penalty: 1.2,  // Mayor penalización (textos largos)
    do_sample: true,          // ✨ NUEVO: Sampling habilitado
  },

  // CONFIG 3: EXTRACTION (Extracción Precisa)
  // Uso: Extraer datos específicos, respuestas factuales cortas
  // Características: Máxima precisión, mínima creatividad
  extraction: {
    max_new_tokens: 256,      // 2x mejora vs legacy (256 vs 128)
    min_length: 20,           // ✨ NUEVO: Mínimo razonable
    temperature: 0.1,         // Casi determinístico (máxima precisión)
    top_p: 0.8,               // Foco en tokens más probables
    repetition_penalty: 1.0,  // Sin penalización (extractivo)
    do_sample: false,         // ✨ NUEVO: Greedy decoding = máxima precisión
  },

  // CONFIG 4: RESUMEN_ALTA (Resumen de Alta / Epicrisis)
  // Uso: Generación de resúmenes de alta extensos en estilo narrativo médico
  // Características: Contexto extenso de entrada, salida larga con holgura
  // Análisis: docs/flow/RESUMEN_ALTA_TOKEN_ANALYSIS.md
  // NOTA: Configuración CONSERVADORA para evitar invención de datos médicos
  // Input real: ~4800 tokens, Output esperado: ~400 tokens
  resumen_alta: {
    max_new_tokens: 600,      // Holgura: salida esperada ~400 tokens + 50% margen
    min_length: 100,          // Mínimo razonable para evitar respuestas muy cortas
    temperature: 0.1,         // Baja creatividad = máxima fidelidad al contexto
    top_p: 0.85,              // Foco en tokens más probables
    repetition_penalty: 1.2,  // Penalización moderada para evitar bucles
    do_sample: true,          // Sampling habilitado pero conservador
  },

  // CONFIG 5: SIMPLE_QUERY (Consultas Simples / Pruebas)
  // Uso: Pruebas directas del modelo sin formato específico de salida
  // Características: Respuestas libres para evaluar capacidad del modelo
  simple_query: {
    max_new_tokens: 256,      // Respuestas moderadas
    min_length: 10,           // Mínimo bajo para respuestas cortas válidas
    temperature: 0.3,         // Algo de variabilidad para creatividad
    top_p: 0.9,               // Nucleus sampling estándar
    repetition_penalty: 1.1,  // Penalización moderada
    do_sample: true,          // Habilita sampling para variedad
  },
};

// Helper: Obtener configuración activa (desde .env o por defecto)
function getActiveGenerationConfig() {
  const configName = state.activeGenerationConfig || 'rag';

  // Validar que existe la configuración
  if (configName === 'legacy') {
    console.warn('⚠️ Usando LEGACY_CONFIG (deprecado). Considera cambiar a "rag", "analysis" o "extraction".');
    return LEGACY_CONFIG;
  }

  if (GENERATION_CONFIGS[configName]) {
    return GENERATION_CONFIGS[configName];
  }

  console.warn(`⚠️ Configuración "${configName}" no encontrada. Usando "rag" por defecto.`);
  return GENERATION_CONFIGS.rag;
}

// Helper: Comparar configuraciones
function logConfigComparison(configName, config) {
  console.log(`\n📋 Configuración Activa: ${configName.toUpperCase()}`);
  console.log(`┌─────────────────────┬─────────┬──────────┬─────────┐`);
  console.log(`│ Parámetro           │ Legacy  │ Actual   │ Cambio  │`);
  console.log(`├─────────────────────┼─────────┼──────────┼─────────┤`);
  console.log(`│ max_new_tokens      │ 128     │ ${config.max_new_tokens.toString().padEnd(8)} │ ${((config.max_new_tokens / 128) * 100).toFixed(0)}%    │`);
  console.log(`│ min_length          │ N/A     │ ${(config.min_length || 'N/A').toString().padEnd(8)} │ ✨ NUEVO │`);
  console.log(`│ temperature         │ 0.2     │ ${config.temperature.toString().padEnd(8)} │ ${config.temperature === 0.2 ? '=' : (config.temperature > 0.2 ? '↑' : '↓')}       │`);
  console.log(`│ top_p               │ 0.9     │ ${config.top_p.toString().padEnd(8)} │ ${config.top_p === 0.9 ? '=' : (config.top_p > 0.9 ? '↑' : '↓')}       │`);
  console.log(`│ repetition_penalty  │ 1.1     │ ${config.repetition_penalty.toString().padEnd(8)} │ ${config.repetition_penalty === 1.1 ? '=' : (config.repetition_penalty > 1.1 ? '↑' : '↓')}       │`);
  console.log(`│ do_sample           │ N/A     │ ${config.do_sample.toString().padEnd(8)} │ ✨ NUEVO │`);
  console.log(`└─────────────────────┴─────────┴──────────┴─────────┘\n`);
}

// Estado global
const state = {
  llm: null,
  tokenizer: null,
  processor: null, // Para modelos image-text-to-text
  modelType: null, // "pipeline", "causal-lm", o "image-text-to-text"
  embedder: null,
  currentFile: null,
  db: null,
  config: null,
  isGenerating: false,
  deviceInfo: null,
  activeGenerationConfig: 'rag', // Configuración activa de generación (se carga desde .env)
};

// ============================================================================
// IndexedDB
// ============================================================================

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

async function putChunk(chunk) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(STORE_CHUNKS, "readwrite");
    const store = tx.objectStore(STORE_CHUNKS);
    store.put(chunk);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () =>
      reject(tx.error || new Error("IndexedDB putChunk failed"));
    tx.onabort = () =>
      reject(tx.error || new Error("IndexedDB putChunk aborted"));
  });
}

async function putVector(vectorData) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(STORE_VECTORS, "readwrite");
    const store = tx.objectStore(STORE_VECTORS);
    store.put(vectorData);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () =>
      reject(tx.error || new Error("IndexedDB putVector failed"));
    tx.onabort = () =>
      reject(tx.error || new Error("IndexedDB putVector aborted"));
  });
}

async function getAllVectors() {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(STORE_VECTORS, "readonly");
    const store = tx.objectStore(STORE_VECTORS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getChunksByKeys(keys) {
  const chunks = [];
  const tx = state.db.transaction(STORE_CHUNKS, "readonly");
  const store = tx.objectStore(STORE_CHUNKS);

  for (const key of keys) {
    const request = store.get(key);
    const chunk = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}

async function clearAll() {
  const clearStore = (storeName) =>
    new Promise((resolve, reject) => {
      const tx = state.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () =>
        reject(tx.error || new Error(`IndexedDB clear failed: ${storeName}`));
      tx.onabort = () =>
        reject(tx.error || new Error(`IndexedDB clear aborted: ${storeName}`));
    });

  await Promise.all([clearStore(STORE_CHUNKS), clearStore(STORE_VECTORS)]);
}

// ============================================================================
// Embedding y normalización
// ============================================================================

async function embed(text) {
  if (!state.embedder) {
    throw new Error("Embedder no está cargado");
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

// ============================================================================
// Chunking del JSON
// ============================================================================

function createChunks(jsonData) {
  const chunks = [];
  const docId = String(
    jsonData.id_atencion || jsonData.atencion?.id || "unknown"
  );

  // ---------- Helpers ----------
  const nonEmpty = (s) => s && String(s).trim().length > 0;

  const listLines = (title, arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return "";
    const lines = arr.map((x) => String(x ?? "").trim()).filter(nonEmpty);
    if (lines.length === 0) return "";
    return `${title}:\n- ${lines.join("\n- ")}\n`;
  };

  const codeNameLines = (title, arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return "";
    const lines = arr
      .map((o) => {
        const codigo = String(o?.codigo ?? "").trim();
        const nombre = String(o?.nombre ?? "").trim();
        if (codigo && nombre) return `- ${codigo}: ${nombre}`;
        return `- ${codigo || nombre}`.trim();
      })
      .filter(nonEmpty);
    if (lines.length === 0) return "";
    return `${title}:\n${lines.join("\n")}\n`;
  };

  const tratamientosLines = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return "";
    const lines = arr
      .map((t) => {
        const codigo = String(t?.codigo ?? "").trim();
        const nombre = String(t?.nombre ?? "").trim();
        const via = String(t?.via ?? "").trim();
        const dosis = String(t?.dosis ?? "").trim();
        const freq = String(t?.frecuencia ?? "").trim();
        const ini = String(t?.inicio ?? "").trim();
        const fin = String(t?.fin ?? "").trim();

        const parts = [
          codigo ? `[${codigo}]` : "",
          nombre,
          via ? `vía ${via}` : "",
          dosis ? `dosis ${dosis}` : "",
          freq ? `freq ${freq}` : "",
          ini || fin ? `(${ini || "?"} → ${fin || "?"})` : "",
        ].filter(nonEmpty);

        return parts.length ? `- ${parts.join(" ")}` : "";
      })
      .filter(nonEmpty);

    if (!lines.length) return "";
    return `Tratamientos intrahospitalarios:\n${lines.join("\n")}\n`;
  };

  const labsLines = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return "";
    const lines = arr
      .map((l) => {
        const prueba = String(l?.prueba ?? "").trim();
        const unidad = String(l?.unidad ?? "").trim();

        const ingreso = l?.ingreso ?? {};
        const valor = ingreso?.valor;
        const fecha = String(ingreso?.fecha ?? "").trim();
        const estado = String(ingreso?.estado ?? "").trim();
        const ri = ingreso?.rango_inferior;
        const rs = ingreso?.rango_superior;

        const periodo = l?.periodo ?? {};
        const pmin = periodo?.min;
        const pmax = periodo?.max;

        const parts = [];
        if (prueba) parts.push(prueba);
        if (valor !== undefined && valor !== null)
          parts.push(`ingreso=${valor}${unidad ? " " + unidad : ""}`);
        if (estado) parts.push(`(${estado})`);
        if (ri !== undefined || rs !== undefined)
          parts.push(`ref=[${ri ?? "?"}..${rs ?? "?"}]`);
        if (fecha) parts.push(`fecha=${fecha}`);
        if (pmin !== undefined || pmax !== undefined)
          parts.push(`periodo[min=${pmin ?? "?"}, max=${pmax ?? "?"}]`);

        return parts.length ? `- ${parts.join(" ")}` : "";
      })
      .filter(nonEmpty);

    if (!lines.length) return "";
    return `Laboratorios resumen:\n${lines.join("\n")}\n`;
  };

  const altaLines = (alta) => {
    if (!alta || typeof alta !== "object") return "";

    const meds = Array.isArray(alta.medicamentos) ? alta.medicamentos : [];
    const medLines = meds
      .map((m) => {
        const codigo = String(m?.codigo ?? "").trim();
        const nombre = String(m?.nombre ?? "").trim();
        const dosis = String(m?.dosis ?? "").trim();
        const via = String(m?.via ?? "").trim();
        const freq = String(m?.frecuencia ?? "").trim();
        const dur = String(m?.duracion ?? "").trim();

        const parts = [
          codigo ? `[${codigo}]` : "",
          nombre,
          dosis ? `dosis ${dosis}` : "",
          via ? `vía ${via}` : "",
          freq ? `freq ${freq}` : "",
          dur ? `duración ${dur}` : "",
        ].filter(nonEmpty);

        return parts.length ? `- ${parts.join(" ")}` : "";
      })
      .filter(nonEmpty);

    let out = "";
    if (medLines.length) out += `Medicamentos:\n${medLines.join("\n")}\n\n`;
    out += listLines("Controles", alta.controles);
    out += listLines("Cuidados", alta.cuidados);
    out += listLines("Signos de alarma", alta.signos_alarma);
    return out.trim();
  };

  // ---------- 1) RESUMEN ----------
  const ingreso = jsonData.atencion?.fecha_ingreso
    ? `[INGRESO] ${jsonData.atencion.fecha_ingreso}\n`
    : "";
  const altaFecha = jsonData.atencion?.fecha_alta
    ? `[ALTA] ${jsonData.atencion.fecha_alta}\n`
    : "";
  const edad =
    jsonData.paciente?.edad !== undefined
      ? `[EDAD] ${jsonData.paciente.edad}\n`
      : "";
  const sexo = jsonData.paciente?.sexo
    ? `[SEXO] ${jsonData.paciente.sexo}\n`
    : "";
  const motivo = jsonData.motivo_ingreso
    ? `[MOTIVO] ${jsonData.motivo_ingreso}\n`
    : "";

  const antecedentes = jsonData.antecedentes ?? {};
  const antText =
    listLines("Antecedentes médicos", antecedentes.medicos) +
    listLines("Antecedentes quirúrgicos", antecedentes.quirurgicos) +
    (nonEmpty(antecedentes.alergias)
      ? `Alergias: ${antecedentes.alergias}\n`
      : "");

  const dxIngreso = codeNameLines(
    "Diagnóstico de ingreso",
    jsonData.diagnostico_ingreso
  );
  const dxEgreso = codeNameLines(
    "Diagnóstico de egreso",
    jsonData.diagnostico_egreso
  );
  const procs = codeNameLines("Procedimientos", jsonData.procedimientos);
  const trats = tratamientosLines(jsonData.tratamientos_intrahosp);

  const resumenText = (
    `[TIPO] Epicrisis\n` +
    ingreso +
    altaFecha +
    edad +
    sexo +
    motivo +
    `\n` +
    antText +
    `\n` +
    dxIngreso +
    `\n` +
    dxEgreso +
    `\n` +
    procs +
    `\n` +
    trats
  ).trim();

  if (nonEmpty(resumenText)) {
    chunks.push({
      chunkKey: `${docId}::resumen`,
      text: resumenText,
      sourceHint: `[DOC ${docId} | resumen]`,
      chunkType: "resumen",
    });
  }

  // ---------- 2) EVOLUCIÓN DIARIA ----------
  if (Array.isArray(jsonData.evolucion_resumen)) {
    jsonData.evolucion_resumen.forEach((ev, idx) => {
      const day = ev?.dia ?? idx + 1;
      const t = String(ev?.texto ?? "").trim();
      if (!nonEmpty(t)) return;

      const evText = (
        `[TIPO] Evolución diaria\n` +
        `[DIA] ${day}\n` +
        ingreso +
        altaFecha +
        `\n` +
        `[TEXTO]\n${t}\n`
      ).trim();

      chunks.push({
        chunkKey: `${docId}::evo:${day}`,
        text: evText,
        sourceHint: `[DOC ${docId} | evolucion_dia | dia=${day}]`,
        chunkType: "evolucion_dia",
        day,
      });
    });
  }

  // ---------- 3) LABORATORIOS ----------
  const labsText = labsLines(jsonData.laboratorios_resumen);
  if (nonEmpty(labsText)) {
    chunks.push({
      chunkKey: `${docId}::labs`,
      text: (
        `[TIPO] Laboratorios\n` +
        ingreso +
        altaFecha +
        `\n` +
        labsText
      ).trim(),
      sourceHint: `[DOC ${docId} | laboratorios]`,
      chunkType: "laboratorios",
    });
  }

  // ---------- 4) ALTA ----------
  const altaText = altaLines(jsonData.indicaciones_alta);
  if (nonEmpty(altaText)) {
    chunks.push({
      chunkKey: `${docId}::alta`,
      text: (
        `[TIPO] Indicaciones de alta\n` +
        altaFecha +
        `\n\n` +
        altaText
      ).trim(),
      sourceHint: `[DOC ${docId} | alta]`,
      chunkType: "alta",
    });
  }

  return chunks;
}

// ============================================================================
// Retrieval (cosine + MMR)
// ============================================================================

function cosine(vec1, vec2) {
  return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
}

function topK(queryVec, allVectors, k) {
  const scored = allVectors.map((item) => {
    const vec = Array.from(new Float32Array(item.vec));
    const score = cosine(queryVec, vec);
    return { chunkKey: item.chunkKey, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

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

// ============================================================================
// Prompt construction
// ============================================================================

function compactChunkForPrompt(chunk, maxChars = 1200) {
  if (!chunk || !chunk.text) return "";
  const txt = String(chunk.text);

  // Prefer only the [TEXTO] section when present (reduces long clinical notes)
  const m = txt.match(/\[TEXTO\]\s*\n([\s\S]*)/i);
  const body = (m ? m[1] : txt).trim();

  // Keep small header lines (TIPO/DIA/INGRESO/ALTA/EDAD/SEXO/MOTIVO)
  const headerLines = txt
    .split(/\r?\n/)
    .filter((l) => /^\[(TIPO|DIA|INGRESO|ALTA|EDAD|SEXO|MOTIVO)\]/i.test(l))
    .slice(0, 10)
    .join("\n");

  const combined = (headerLines ? headerLines + "\n\n" : "") + body;
  if (combined.length <= maxChars) return combined;
  return combined.slice(0, maxChars) + "\n[...TRUNCADO...]";
}

function buildPrompt(chunks, question) {
  let prompt = "";
  prompt += "TAREA: extrae 4 frases EXACTAS del CONTEXTO.\n";
  prompt +=
    "FORMATO: 4 líneas con '- ' y luego una sola línea: 'Fuente: <sourceHint>'.\n";
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

// ============================================================================
// Prompt para Resumen de Alta (Epicrisis) - Estilo narrativo médico clásico
// ============================================================================

function buildPromptAltaResumen(chunks) {
  let prompt = "";

  // SYSTEM / ROLE
  prompt += "Eres un médico redactor clínico.\n";
  prompt += "Debes redactar un RESUMEN DE ALTA (Epicrisis) en español, estilo informe médico clásico.\n";
  prompt += "Usa EXCLUSIVAMENTE la información del CONTEXTO.\n";
  prompt += "NO inventes datos. Si un dato no existe, omítelo o escribe 'No especificado'.\n\n";

  // FORMATO OBLIGATORIO
  prompt += "FORMATO DE SALIDA OBLIGATORIO:\n";
  prompt += "- 1. Título: RESUMEN DE ALTA (Epicrisis)\n";
  prompt += "- 2. Párrafo 1: Identificación del paciente (sexo, edad), fechas ingreso/alta y motivo de ingreso\n";
  prompt += "- 3. Párrafo 2: Antecedentes relevantes y alergias\n";
  prompt += "- 4. Párrafo 3: Diagnósticos de ingreso, procedimientos y tratamientos intrahospitalarios\n";
  prompt += "- 5. Párrafo 4: Evolución clínica resumida y laboratorios relevantes\n";
  prompt += "- 6. Párrafo 5: Diagnósticos de egreso\n";
  prompt += "- 7. Sección final: 'Indicaciones al alta:' con viñetas\n\n";

  // REGLAS DURAS - ENDURECIDAS
  prompt += "REGLAS ESTRICTAS:\n";
  prompt += "- Prohibido inventar, interpretar o suponer información\n";
  prompt += "- No mencionar 'chunks', 'RAG', 'vector', 'JSON'\n";
  prompt += "- Usar tercera persona y redacción clínica\n";
  prompt += "- Prohibido agregar texto genérico no presente en el contexto (ej: 'criterios actualizados', 'reacciones habituales', etc.)\n";
  prompt += "- En Alergias: si el contexto dice 'Sin alergias conocidas', escribir exactamente: 'Alergias: Sin alergias conocidas'\n";
  prompt += "- Si un fármaco aparece incompleto (ej: 'Ibuprofe'), escribir: 'Ibuprofeno: datos incompletos'\n";
  prompt += "- NO completar dosis, frecuencias o duraciones por conocimiento médico\n\n";

  // REGLA CRÍTICA PARA INDICACIONES AL ALTA
  prompt += "REGLA CRÍTICA - INDICACIONES AL ALTA:\n";
  prompt += "- SOLO puedes usar información del bloque [TIPO] Indicaciones de alta\n";
  prompt += "- Si NO existe ese bloque o está vacío, escribir: 'Indicaciones al alta: No especificadas en el registro'\n";
  prompt += "- Prohibido inventar controles, citas, o plazos (ej: '7 días', '10 días') si no están en el contexto\n";
  prompt += "- Prohibido agregar signos de alarma genéricos si no están documentados\n";
  prompt += "- Copiar LITERALMENTE los ítems de Medicamentos/Controles/Cuidados/Signos de alarma tal como aparecen en [TIPO] Indicaciones de alta (sin sinónimos ni calificadores)\n\n";

  // CONTEXTO - usar límite balanceado para evitar overflow en WebGPU
  // Total chunks: ~14, límite por chunk: 1400 chars ≈ ~350 tokens/chunk ≈ ~4900 tokens total
  prompt += "CONTEXTO CLÍNICO:\n";
  chunks.forEach((chunk) => {
    const compact = compactChunkForPrompt(chunk, 1400);
    prompt += `${compact}\n\n`;
  });

  // TAREA
  prompt += "TAREA:\n";
  prompt += "Redacta el RESUMEN DE ALTA (Epicrisis) siguiendo exactamente el formato y reglas indicadas.\n";
  prompt += "Recuerda: en Indicaciones al alta, SOLO lo que está en [TIPO] Indicaciones de alta.\n";

  return prompt;
}

// ============================================================================
// Output post-processing (enforce 4 bullet extraction) + fallback
// ============================================================================

function looksLikeGarbage(output) {
  if (!output) return true;
  const s = String(output);
  // repeated numeric / hyphen patterns like: 1000-15-12-15-...
  if (/\b\d{3,}(?:-\d{1,4}){4,}\b/.test(s)) return true;
  // extremely repetitive short tokens
  if (/(\b\w+\b)(?:\s*\1){10,}/i.test(s)) return true;
  return false;
}

function extractFourSentencesFromChunk(chunkText) {
  // Prefer the [TEXTO] section if present
  const m = chunkText.match(/\[TEXTO\]\s*\n([\s\S]*)/i);
  const body = (m ? m[1] : chunkText).trim();

  // Split by newlines first (clinical notes often use line breaks)
  let parts = body
    .split(/\n+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  // If still too few, split by sentence punctuation.
  if (parts.length < 4) {
    parts = body
      .split(/(?<=[\.!\?])\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  // Take first 4 items, but keep them EXACT as they appear.
  return parts.slice(0, 4);
}

function buildDeterministicExtraction(chunks) {
  // Use the top chunk as the primary source.
  const primary = chunks && chunks.length ? chunks[0] : null;
  if (!primary) return { answer: "No está en el informe.", sources: [] };

  const bullets = extractFourSentencesFromChunk(primary.text);
  // Ensure exactly 4 bullets; if fewer, pad with empty-safe repeats of existing lines.
  while (bullets.length < 4) {
    bullets.push(
      bullets[bullets.length - 1] || primary.text.trim().slice(0, 200)
    );
  }

  const answer =
    bullets.map((b) => `- ${b}`).join("\n") + `\nFuente: ${primary.sourceHint}`;

  return { answer, sources: [primary] };
}

function enforceExtractionFormat(rawOutput, chunks) {
  const out = String(rawOutput || "").trim();

  // Must contain at least 4 bullet lines and a Fuente line.
  const bulletLines = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));

  const hasFuente = /\bFuente\s*:/i.test(out);

  if (looksLikeGarbage(out) || bulletLines.length < 4 || !hasFuente) {
    return buildDeterministicExtraction(chunks);
  }

  // Keep ONLY first 4 bullets and the first Fuente line.
  const first4 = bulletLines.slice(0, 4);
  const fuenteLine = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^Fuente\s*:/i.test(l));

  const answer =
    first4.join("\n") +
    "\n" +
    (fuenteLine || `Fuente: ${chunks?.[0]?.sourceHint || ""}`);
  return { answer, sources: chunks };
}

// ============================================================================
// UI updates
// ============================================================================

function setStatus(elementId, message, type = "info") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = "status-text";
  if (type) el.classList.add(type);
}

function showAnswer(answer, sources) {
  const answerSection = document.getElementById("answer-section");
  const answerText = document.getElementById("answer-text");
  const sourcesSection = document.getElementById("sources-section");
  const sourcesList = document.getElementById("sources-list");

  answerText.textContent = answer;
  answerSection.style.display = "block";

  if (sources && sources.length > 0) {
    sourcesList.innerHTML = "";
    sources.forEach((src) => {
      const li = document.createElement("li");
      li.textContent = src.sourceHint;
      sourcesList.appendChild(li);
    });
    sourcesSection.style.display = "block";
  } else {
    sourcesSection.style.display = "none";
  }
}

// ============================================================================
// Generación de texto (soporta pipeline y CausalLM)
// ============================================================================

async function generateText(prompt, options = {}) {
  // 1. Obtener configuración base desde .env (state.activeGenerationConfig)
  const baseConfig = getActiveGenerationConfig();

  // 2. Sobrescribir con options si se proporcionan
  const config = { ...baseConfig, ...options };

  // 3. Detectar qué configuración se está usando (para logging)
  let configName = state.activeGenerationConfig || 'rag';

  // Si options no está vacío, es una configuración custom
  if (Object.keys(options).length > 0) {
    // Verificar si coincide exactamente con alguna configuración predefinida
    if (JSON.stringify(config) === JSON.stringify(GENERATION_CONFIGS.rag)) {
      configName = 'rag';
    } else if (JSON.stringify(config) === JSON.stringify(GENERATION_CONFIGS.analysis)) {
      configName = 'analysis';
    } else if (JSON.stringify(config) === JSON.stringify(GENERATION_CONFIGS.extraction)) {
      configName = 'extraction';
    } else if (JSON.stringify(config) === JSON.stringify(LEGACY_CONFIG)) {
      configName = 'legacy';
    } else {
      configName = 'custom';
    }
  }

  // 4. Log de comparación con configuración legacy
  logConfigComparison(configName, config);

  const {
    max_new_tokens,
    min_length,
    temperature,
    top_p,
    repetition_penalty,
    do_sample,
  } = config;

  if (state.modelType === "image-text-to-text") {
    // Usar AutoProcessor + AutoModelForImageTextToText (para Ministral-3B)
    // Para texto-only (sin imagen), usar solo el tokenizer del processor

    // Crear mensaje con formato de chat (solo texto, sin imagen)
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
        ],
      },
    ];

    // Aplicar chat template usando el processor
    const chatPrompt = state.processor.apply_chat_template(messages, {
      add_generation_prompt: true,
    });

    // Para texto-only, usar directamente el tokenizer (no el processor completo)
    // El processor requiere una imagen, pero solo queremos procesar texto
    const inputs = state.tokenizer(chatPrompt, {
      return_tensors: "pt",
      add_special_tokens: false,
    });

    // VALIDACIÓN DE LONGITUD - Evitar exceder la ventana de contexto
    const inputLength = inputs.input_ids.dims.at(-1);
    const maxContextLength = 8192;//262144; // Ministral-3-3B soporta hasta 256K tokens

    let adjustedMaxTokens = max_new_tokens;
    if (inputLength + max_new_tokens > maxContextLength) {
      adjustedMaxTokens = Math.max(50, maxContextLength - inputLength);
      console.warn(
        `⚠️ Prompt muy largo (${inputLength} tokens). ` +
        `Reduciendo salida de ${max_new_tokens} a ${adjustedMaxTokens} tokens`
      );
    }

    console.log(`📊 Input: ${inputLength} tokens | Output max: ${adjustedMaxTokens} tokens | Total: ${inputLength + adjustedMaxTokens}/${maxContextLength}`);

    // Generar respuesta
    const outputs = await state.llm.generate({
      ...inputs,
      max_new_tokens: adjustedMaxTokens,
      min_length: Math.min(min_length || 10, adjustedMaxTokens),
      temperature,
      top_p,
      repetition_penalty,
      do_sample: do_sample && temperature > 0,
    });

    // Decodificar solo los tokens nuevos (excluir el prompt)
    const newTokens = outputs.slice(null, [inputLength, null]);
    const decoded = state.tokenizer.batch_decode(newTokens, {
      skip_special_tokens: true,
    });

    return decoded[0] || "";
  } else if (state.modelType === "causal-lm") {
    // Usar AutoModelForCausalLM + AutoTokenizer
    // Aplicar chat template si el tokenizer lo soporta
    let formattedPrompt = prompt;

    if (state.tokenizer.apply_chat_template) {
      const messages = [
        { role: "system", content: "Eres un asistente médico experto. Responde de forma precisa y profesional en español." },
        { role: "user", content: prompt }
      ];
      formattedPrompt = state.tokenizer.apply_chat_template(messages, {
        tokenize: false,
        add_generation_prompt: true,
      });
      console.log("📝 Chat template aplicado para causal-lm");
    }

    const inputs = state.tokenizer(formattedPrompt, { return_tensors: "pt" });

    // Aumentar repetition_penalty para modelos pequeños que tienden a repetir
    const effectiveRepPenalty = Math.max(repetition_penalty, 1.5);

    const outputs = await state.llm.generate({
      ...inputs,
      max_new_tokens,
      temperature,
      top_p,
      repetition_penalty: effectiveRepPenalty,
      no_repeat_ngram_size: 3,  // Evita repetir secuencias de 3 tokens
      do_sample: temperature > 0,
    });

    // Decodificar solo los tokens nuevos (excluir el prompt)
    const inputLength = inputs.input_ids.dims.at(-1);
    const newTokens = outputs.slice(null, [inputLength, null]);
    const decoded = state.tokenizer.batch_decode(newTokens, {
      skip_special_tokens: true,
    });

    return decoded[0] || "";
  } else {
    // Usar pipeline text-generation
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

// ============================================================================
// Handlers
// ============================================================================

async function handleLoadModel() {
  const btn = document.getElementById("load-model-btn");
  const modelSelect = document.getElementById("model-select");
  const selectedModel = modelSelect.value;

  btn.disabled = true;
  modelSelect.disabled = true;
  setStatus("model-status", `Cargando modelo ${selectedModel}...`, "loading");

  try {
    // Obtener configuración del servidor si no está cargada
    if (!state.config) {
      const configResponse = await fetch("/api/config");
      state.config = await configResponse.json();
      console.log("Server config:", state.config);

      // Cargar configuración de generación desde .env
      if (state.config.generationConfig) {
        state.activeGenerationConfig = state.config.generationConfig;
        console.log(`✅ Configuración de generación cargada desde .env: "${state.activeGenerationConfig}"`);
      } else {
        console.log('⚠️ No se encontró GENERATION_CONFIG en .env. Usando "rag" por defecto.');
        state.activeGenerationConfig = 'rag';
      }
    }

    // Configurar Transformers.js según origen de modelos
    // Determinar el modelo a cargar
    let modelId = selectedModel;

    // Forzar carga remota para modelos que no funcionan con local (archivos .onnx_data externos)
    const forceRemote = REMOTE_ONLY_MODELS.includes(selectedModel);
    if (forceRemote && state.config.modelSource === "local") {
      console.log(`⚠️ Modelo ${selectedModel} requiere carga remota (archivos .onnx_data externos)`);
      console.log(`   Ignorando configuración local y cargando desde HuggingFace...`);
    }

    if (state.config.modelSource === "local" && !forceRemote) {
      // Para modelos locales servidos por HTTP localhost:
      // Configuramos un custom remote host que apunta a localhost
      // El template {model} se reemplazará solo con el nombre del modelo (sin usuario/)
      env.allowLocalModels = false;
      env.allowRemoteModels = true;

      // Redirigir peticiones a localhost
      // El {model} se reemplaza con la última parte del modelId (ej: "Ministral-3-3B-Instruct-2512-ONNX")
      env.remoteHost = window.location.origin;
      env.remotePathTemplate = "/models/{model}/";

      console.log(`Loading local model from: ${env.remoteHost}/models/`);
      console.log(`Model ID: ${selectedModel}`);
      console.log(`Template: ${env.remotePathTemplate}`);

      // Para que {model} sea solo el nombre (sin usuario/), ajustamos el modelId
      modelId = selectedModel.split('/').pop();
      console.log(`Adjusted modelId: ${modelId}`);
    } else {
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
      // Restaurar valores por defecto de HuggingFace (NO borrar, asignar explícitamente)
      env.remoteHost = "https://huggingface.co";
      env.remotePathTemplate = "{model}/resolve/{revision}/";
      console.log(`Loading remote model from HuggingFace: ${modelId}`);
    }

    // Progress callback para mostrar progreso
    const progressCallback = (progress) => {
      if (progress.status === "progress") {
        let percent = progress.progress || 0;
        if (percent <= 1) {
          percent = Math.round(percent * 100);
        } else {
          percent = Math.round(percent);
        }
        percent = Math.min(percent, 100);

        const file = progress.file ? progress.file.split("/").pop() : "";
        setStatus(
          "model-status",
          `Cargando: ${file} (${percent}%)`,
          "loading"
        );
      } else if (progress.status === "download") {
        if (progress.loaded && progress.total) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          const file = progress.file ? progress.file.split("/").pop() : "";
          const sizeMB = (progress.total / (1024 * 1024)).toFixed(1);
          setStatus(
            "model-status",
            `Descargando: ${file} (${percent}% de ${sizeMB}MB)`,
            "loading"
          );
        }
      } else if (progress.status === "done") {
        const file = progress.file ? progress.file.split("/").pop() : "";
        setStatus("model-status", `Archivo cargado: ${file}`, "loading");
      } else if (progress.status === "ready") {
        setStatus("model-status", "Modelo listo", "success");
      } else if (progress.status === "initiate") {
        const file = progress.file ? progress.file.split("/").pop() : "";
        setStatus("model-status", `Iniciando descarga: ${file}`, "loading");
      }
    };

    // Detectar si WebGPU está disponible
    let device = "wasm";
    let gpuInfo = null;
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          device = "webgpu";
          try {
            if (typeof adapter.requestAdapterInfo === "function") {
              const adapterInfo = await adapter.requestAdapterInfo();
              gpuInfo = {
                vendor: adapterInfo.vendor || "Unknown",
                architecture: adapterInfo.architecture || "Unknown",
                device: adapterInfo.device || "Unknown",
                description: adapterInfo.description || "Unknown",
              };
            } else if (adapter.info) {
              gpuInfo = {
                vendor: adapter.info.vendor || "Unknown",
                architecture: adapter.info.architecture || "Unknown",
                device: adapter.info.device || "Unknown",
                description: adapter.info.description || "Unknown",
              };
            } else {
              gpuInfo = { vendor: "WebGPU", description: "Adapter disponible" };
            }
          } catch (infoErr) {
            gpuInfo = { vendor: "WebGPU", description: "Adapter disponible" };
          }
          console.log("WebGPU disponible:", gpuInfo);
        }
      } catch (e) {
        console.warn("WebGPU no disponible, usando WASM:", e);
      }
    }

    state.deviceInfo = { device, gpuInfo };

    // Forzar WASM para modelos incompatibles con WebGPU
    const forceWasm = WASM_ONLY_MODELS.includes(selectedModel);
    if (forceWasm && device === "webgpu") {
      console.warn(`⚠️ Modelo ${selectedModel} requiere WASM (incompatible con WebGPU). Forzando WASM...`);
      device = "wasm";
      state.deviceInfo.device = "wasm";
      state.deviceInfo.forcedWasm = true;
    }

    setStatus(
      "model-status",
      `Cargando modelo LLM (${device.toUpperCase()})...`,
      "loading"
    );

    console.log(`Iniciando carga de modelo con device=${device}, dtype=q4`);
    const startTime = performance.now();

    // Determinar qué tipo de modelo usar
    const useImageTextToText = IMAGE_TEXT_TO_TEXT_MODELS.includes(selectedModel);
    const useCausalLM = CAUSAL_LM_MODELS.includes(selectedModel);

    if (useImageTextToText) {
      // Cargar con AutoTokenizer + AutoModelForImageTextToText (para Ministral-3B)
      // Usamos AutoTokenizer para texto-only en lugar de AutoProcessor
      console.log("Usando AutoModelForImageTextToText para:", selectedModel);
      state.modelType = "image-text-to-text";

      // Opciones para modelos locales
      const localOptions = state.config.modelSource === "local" ? {
        local_files_only: false,
      } : {};

      // Para modelos multimodales como Ministral, usar AutoProcessor
      setStatus("model-status", "Cargando processor...", "loading");
      state.processor = await AutoProcessor.from_pretrained(modelId, {
        progress_callback: progressCallback,
        ...localOptions,
      });
      // El processor incluye el tokenizer
      state.tokenizer = state.processor.tokenizer;

      // Intentar cargar con WebGPU, si falla usar WASM como fallback
      // Usamos dtype: "q4" para que busque archivos *_q4.onnx
      let loadSuccess = false;
      let loadError = null;

      // Configurar opciones del modelo
      // Para modelos locales, NO especificar dtype - dejar que Transformers.js detecte automáticamente
      // Para modelos remotos, usar q4f16 (mejor compatibilidad con WebGPU en navegadores)
      const modelOptions = {
        progress_callback: progressCallback,
        ...localOptions,
      };

      // Solo para modelos remotos, especificar dtype
      if (state.config.modelSource !== "local") {
        modelOptions.dtype = "q4f16";
      }

      if (device === "webgpu") {
        try {
          setStatus("model-status", `Cargando modelo (WebGPU)...`, "loading");
          state.llm = await AutoModelForImageTextToText.from_pretrained(modelId, {
            ...modelOptions,
            device: "webgpu",
          });
          loadSuccess = true;
          console.log("Modelo cargado exitosamente con WebGPU");
        } catch (webgpuErr) {
          console.warn("Error cargando con WebGPU, intentando WASM:", webgpuErr);
          loadError = webgpuErr;
          device = "wasm"; // Fallback a WASM
        }
      }

      if (!loadSuccess) {
        try {
          setStatus("model-status", `Cargando modelo (WASM fallback)...`, "loading");
          state.llm = await AutoModelForImageTextToText.from_pretrained(modelId, {
            ...modelOptions,
            device: "wasm",
          });
          loadSuccess = true;
          console.log("Modelo cargado exitosamente con WASM (fallback)");
        } catch (wasmErr) {
          console.error("Error completo cargando con WASM:", wasmErr);
          console.error("Stack trace:", wasmErr.stack);
          const wasmErrorMsg = wasmErr?.message || wasmErr?.toString() || 'Error desconocido';
          const webgpuErrorMsg = loadError?.message || loadError?.toString() || 'N/A';
          throw new Error(`No se pudo cargar el modelo. WebGPU: ${webgpuErrorMsg}. WASM: ${wasmErrorMsg}`);
        }
      }

      state.deviceInfo = { device, gpuInfo };
    } else if (useCausalLM) {
      // Cargar con AutoTokenizer + AutoModelForCausalLM
      console.log("Usando AutoModelForCausalLM para:", selectedModel);
      state.modelType = "causal-lm";

      // Opciones adicionales para modelos locales servidos por HTTP
      const localOptions = state.config.modelSource === "local" ? {
        local_files_only: false,
      } : {};

      setStatus("model-status", "Cargando tokenizer...", "loading");
      state.tokenizer = await AutoTokenizer.from_pretrained(modelId, {
        progress_callback: progressCallback,
        ...localOptions,
      });

      setStatus("model-status", `Cargando modelo (${device.toUpperCase()})...`, "loading");
      // Determinar dtype según modelo y device
      // FP16: mayor precisión para respuestas coherentes (modelos en FP16_MODELS)
      // Q4F16: pesos int4, activaciones float16 - óptimo para WebGPU (otros modelos)
      // Q4: pesos int4, activaciones float32 - compatible con WASM
      const useFP16 = FP16_MODELS.includes(selectedModel);
      let dtype;
      if (useFP16) {
        dtype = "fp16"; // Mayor precisión para respuestas coherentes
        console.log(`⚡ Modelo ${selectedModel} usa FP16 para mayor precisión`);
      } else {
        dtype = device === "webgpu" ? "q4f16" : "q4";
      }
      console.log(`Usando dtype=${dtype} para device=${device}`);
      const modelLoadOptions = {
        device: device,
        dtype: dtype,
        progress_callback: progressCallback,
        ...localOptions,
      };
      state.llm = await AutoModelForCausalLM.from_pretrained(modelId, modelLoadOptions);
      state.processor = null;
    } else {
      // Usar pipeline estándar
      console.log("Usando pipeline text-generation para:", selectedModel);
      state.modelType = "pipeline";
      state.tokenizer = null;
      state.processor = null;

      // SIEMPRE especificar dtype: "q4" para que busque model_q4.onnx
      const pipelineOptions = {
        device: device,
        dtype: "q4",  // Siempre Q4 para consistencia
        progress_callback: progressCallback,
      };
      state.llm = await pipeline("text-generation", modelId, pipelineOptions);
    }

    const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
    const sourceLabel = forceRemote
      ? " (HuggingFace - forzado)"
      : state.config.modelSource === "local" ? " (local)" : " (HuggingFace)";
    const typeLabel = useImageTextToText
      ? " [ImageTextToText]"
      : useCausalLM
        ? " [CausalLM]"
        : " [Pipeline]";

    console.log(`LLM cargado en ${loadTime}s usando ${device.toUpperCase()}`);
    if (gpuInfo) {
      console.log(`GPU: ${gpuInfo.vendor} - ${gpuInfo.architecture}`);
    }

    setStatus(
      "model-status",
      `Modelo LLM cargado${sourceLabel}${typeLabel} [${device.toUpperCase()}] en ${loadTime}s`,
      "success"
    );
    console.log("LLM loaded successfully");

    // Cargar embedder (siempre desde HuggingFace)
    // Restaurar SIEMPRE los valores por defecto de Transformers.js para HuggingFace
    env.remoteHost = "https://huggingface.co";
    env.remotePathTemplate = "{model}/resolve/{revision}/";
    env.allowRemoteModels = true;
    env.allowLocalModels = false;

    console.log("Cargando embedder desde HuggingFace...");
    setStatus("model-status", "Cargando modelo de embeddings...", "loading");
    state.embedder = await pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-small",
      {
        dtype: "q8",
        device: "wasm",
        progress_callback: progressCallback,
      }
    );
    setStatus("model-status", "Modelo LLM y embeddings cargados", "success");
    console.log("Embedder loaded successfully");

    // Habilitar botón de consultas simples (no requiere documento indexado)
    document.getElementById("simple-query-btn").disabled = false;
  } catch (err) {
    console.error("Error completo:", err);
    console.error("Stack:", err.stack);
    setStatus("model-status", `Error cargando modelo: ${err.message}`, "error");
    btn.disabled = false;
    modelSelect.disabled = false;
  }
}

async function handleFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  state.currentFile = file;
  setStatus("index-status", `Archivo cargado: ${file.name}`, "info");
  document.getElementById("index-btn").disabled = false;
}

async function handleIndex() {
  if (!state.currentFile) {
    setStatus("index-status", "No hay archivo seleccionado", "error");
    return;
  }

  if (!state.embedder) {
    setStatus("index-status", "Debes cargar el modelo primero", "error");
    return;
  }

  const btn = document.getElementById("index-btn");
  btn.disabled = true;
  setStatus("index-status", "Leyendo archivo...", "loading");

  try {
    const text = await state.currentFile.text();
    const jsonData = JSON.parse(text);
    await clearAll();

    setStatus("index-status", "Creando chunks...", "loading");
    const chunks = createChunks(jsonData);
    console.log({ chunks });

    setStatus(
      "index-status",
      `Indexando ${chunks.length} chunks...`,
      "loading"
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      setStatus(
        "index-status",
        `Indexando ${i + 1}/${chunks.length}...`,
        "loading"
      );

      const embeddingText = `passage: ${chunk.text}`;
      let vec = await embed(embeddingText);
      vec = normalizeVector(vec);

      await putChunk(chunk);
      await putVector({
        chunkKey: chunk.chunkKey,
        dim: 384,
        vec: new Float32Array(vec).buffer,
      });
    }

    setStatus(
      "index-status",
      `Indexación completa: ${chunks.length} chunks`,
      "success"
    );
    document.getElementById("ask-btn").disabled = false;
    document.getElementById("generate-resumen-btn").disabled = false;
  } catch (err) {
    console.error(err);
    setStatus("index-status", `Error: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
  }
}

// Deduplicate retrieved chunks by chunkKey
function dedupeByChunkKey(chunks) {
  const seen = new Set();
  return chunks.filter((c) => {
    if (!c || !c.chunkKey) return false;
    if (seen.has(c.chunkKey)) return false;
    seen.add(c.chunkKey);
    return true;
  });
}

async function handleAsk() {
  const question = document.getElementById("question-input").value.trim();
  if (!question) {
    setStatus("answer-status", "Debes escribir una pregunta", "error");
    return;
  }

  if (!state.llm) {
    setStatus("answer-status", "Debes cargar el modelo LLM primero", "error");
    return;
  }

  if (state.isGenerating) {
    setStatus("answer-status", "Ya hay una generación en curso", "error");
    return;
  }

  const btn = document.getElementById("ask-btn");
  btn.disabled = true;
  state.isGenerating = true;
  setStatus(
    "answer-status",
    "Generando embedding de la pregunta...",
    "loading"
  );

  try {
    const queryText = `query: ${question}`;
    let qvec = await embed(queryText);
    qvec = normalizeVector(qvec);

    async function getAllChunks() {
      return new Promise((resolve, reject) => {
        const tx = state.db.transaction(STORE_CHUNKS, "readonly");
        const store = tx.objectStore(STORE_CHUNKS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    function parseQueryFilters(question) {
      const q = question.toLowerCase();

      let day = null;
      const m1 = q.match(/\b(d[ií]a)\s*(\d{1,2})\b/);
      const m2 = q.match(/\bd(\d{1,2})\b/);
      if (m1) day = parseInt(m1[2], 10);
      else if (m2) day = parseInt(m2[1], 10);

      const wantsAlta =
        /\balta\b|\bindicaciones\b|\bmedicamentos\b|\bcontrol(es)?\b|\bcuidados\b|\bsignos de alarma\b/.test(
          q
        );

      const wantsLabs =
        /\blab(oratorio(s)?)?\b|\bhemoglobina\b|\bhematocrito\b|\bleucocit(os)?\b|\bplaquet(as)?\b|\bcreatinina\b|\burea\b|\bsodio\b|\bpotasio\b|\bph\b/.test(
          q
        );

      const wantsResumen =
        /\bmotivo\b|\bantecedentes\b|\bdiagn[oó]stic(o|os)\b|\bprocedimiento(s)?\b|\btratamiento(s)?\b|\bingreso\b|\begreso\b/.test(
          q
        );

      const wantsEvolucion =
        /\bevoluci[oó]n\b|\bpost\s*op\b|\bpostoperator(io|io)\b|\bd[ií]a\b|\bplan\b|\bse sugiere\b|\btorax\b|\bpleurostom[ií]a\b/.test(
          q
        );

      const types = new Set();
      if (wantsAlta) types.add("alta");
      if (wantsLabs) types.add("laboratorios");
      if (wantsResumen) types.add("resumen");
      if (wantsEvolucion || day !== null) types.add("evolucion_dia");

      const hasTypeFilter = types.size > 0;

      return { day, types, hasTypeFilter };
    }

    function prefilterChunkKeys(allChunks, filters) {
      let candidates = allChunks;

      if (filters.hasTypeFilter) {
        candidates = candidates.filter((c) => filters.types.has(c.chunkType));
      }

      if (filters.day !== null) {
        candidates = candidates.filter(
          (c) =>
            c.chunkType === "evolucion_dia" && Number(c.day) === filters.day
        );
      }

      if (candidates.length === 0) return allChunks.map((c) => c.chunkKey);

      return candidates.map((c) => c.chunkKey);
    }

    function filterVectorsByKeys(allVectors, allowedKeys) {
      const allow = new Set(allowedKeys);
      return allVectors.filter((v) => allow.has(v.chunkKey));
    }

    setStatus("answer-status", "Recuperando documentos...", "loading");

    const allChunks = await getAllChunks();
    const filters = parseQueryFilters(question);
    const requestedDay = filters.day;

    const allowedKeys = prefilterChunkKeys(allChunks, filters);

    const allVectors = await getAllVectors();
    const filteredVectors = filterVectorsByKeys(allVectors, allowedKeys);

    const vectorsForSearch = filteredVectors.length
      ? filteredVectors
      : allVectors;

    const top10 = topK(qvec, vectorsForSearch, 10);
    const topN = mmr(qvec, top10, vectorsForSearch, 3, 0.7);

    const chunkKeys = topN.map((item) => item.chunkKey);
    const retrievedChunks = await getChunksByKeys(chunkKeys);
    const uniqueChunks = dedupeByChunkKey(retrievedChunks);

    setStatus("answer-status", "Generando respuesta...", "loading");
    const prompt = buildPrompt(uniqueChunks, question);
    console.log(
      "RAG selected chunks:",
      uniqueChunks.map((c) => ({
        chunkKey: c.chunkKey,
        sourceHint: c.sourceHint,
      }))
    );
    console.log("RAG prompt (first 2000 chars):", prompt.slice(0, 2000));

    const inferenceStart = performance.now();
    const deviceUsed = state.deviceInfo?.device || "unknown";
    console.log(`🚀 Iniciando inferencia con ${deviceUsed.toUpperCase()} [${state.modelType}]...`);

    // Usar la función generateText con configuración RAG optimizada (512 tokens)
    const rawOutput = await generateText(prompt, GENERATION_CONFIGS.analysis);
    //const rawOutput = await generateText(prompt, GENERATION_CONFIGS.rag);
    //const rawOutput = await generateText(prompt, LEGACY_CONFIG);
    //const rawOutput = await generateText(prompt);  // Usa config RAG por defecto

    const inferenceTime = ((performance.now() - inferenceStart) / 1000).toFixed(2);
    const tokensGenerated = rawOutput.split(/\s+/).length || 0;
    const tokensPerSecond = (tokensGenerated / parseFloat(inferenceTime)).toFixed(2);

    console.log(`✅ Inferencia completada en ${inferenceTime}s (${deviceUsed.toUpperCase()})`);
    console.log(`📈 Tokens/segundo: ${tokensPerSecond}`);
    console.log(`🔤 Tokens generados: ${tokensGenerated}`);
    console.log("Raw output:", rawOutput);

    const formatted = enforceExtractionFormat(rawOutput, uniqueChunks);
    const answer = formatted.answer;

    if (requestedDay !== null) {
      const dayMention = answer
        .toLowerCase()
        .match(/\b(d[ií]a)\s*(\d{1,2})\b/g);
      if (dayMention) {
        const mismatched = dayMention.some((m) => {
          const num = parseInt(m.replace(/[^0-9]/g, ""), 10);
          return Number.isFinite(num) && num !== requestedDay;
        });
        if (mismatched) {
          console.warn(
            "Respuesta menciona un día distinto al solicitado. requestedDay=",
            requestedDay,
            "mentions=",
            dayMention
          );
        }
      }
    }
    showAnswer(answer, formatted.sources || uniqueChunks);
    setStatus("answer-status", `Respuesta generada en ${inferenceTime}s`, "success");
  } catch (err) {
    console.error(err);
    setStatus("answer-status", `Error: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    state.isGenerating = false;
  }
}

// ============================================================================
// Handler para Consultas Simples (Pruebas)
// ============================================================================

async function handleSimpleQuery() {
  const queryInput = document.getElementById("simple-query-input");
  const query = queryInput.value.trim();

  if (!query) {
    setStatus("simple-query-status", "Debes escribir un prompt", "error");
    return;
  }

  if (!state.llm) {
    setStatus("simple-query-status", "Debes cargar el modelo LLM primero", "error");
    return;
  }

  if (state.isGenerating) {
    setStatus("simple-query-status", "Ya hay una generación en curso", "error");
    return;
  }

  const btn = document.getElementById("simple-query-btn");
  btn.disabled = true;
  state.isGenerating = true;
  setStatus("simple-query-status", "Generando respuesta...", "loading");

  try {
    const inferenceStart = performance.now();
    const deviceUsed = state.deviceInfo?.device || "unknown";
    console.log(`🚀 Iniciando consulta simple con ${deviceUsed.toUpperCase()} [${state.modelType}]...`);
    console.log(`📝 Prompt: ${query.slice(0, 200)}${query.length > 200 ? '...' : ''}`);
    console.log(`📋 Usando configuración: simple_query (max_new_tokens: ${GENERATION_CONFIGS.simple_query.max_new_tokens})`);

    // Generar respuesta usando configuración simple_query
    const rawOutput = await generateText(query, GENERATION_CONFIGS.simple_query);

    const inferenceTime = ((performance.now() - inferenceStart) / 1000).toFixed(2);
    const wordsGenerated = rawOutput.split(/\s+/).length || 0;
    const charsGenerated = rawOutput.length;
    const tokensPerSecond = (wordsGenerated / parseFloat(inferenceTime)).toFixed(2);

    console.log(`✅ Consulta simple completada en ${inferenceTime}s (${deviceUsed.toUpperCase()})`);
    console.log(`📈 Tokens/segundo: ${tokensPerSecond}`);
    console.log(`🔤 Palabras generadas: ${wordsGenerated}`);
    console.log("Respuesta:", rawOutput);

    // Mostrar resultado
    const outputSection = document.getElementById("simple-query-section");
    const outputTextarea = document.getElementById("simple-query-output");
    const metricsDiv = document.getElementById("simple-query-metrics");

    outputTextarea.value = rawOutput.trim();
    metricsDiv.innerHTML = `
      <small>
        ⏱️ ${inferenceTime}s |
        📊 ${wordsGenerated} palabras |
        📈 ${tokensPerSecond} tokens/s |
        💾 ${deviceUsed.toUpperCase()}
      </small>
    `;
    outputSection.style.display = "block";

    setStatus("simple-query-status", `Respuesta generada en ${inferenceTime}s`, "success");

  } catch (err) {
    console.error("Error en consulta simple:", err);
    setStatus("simple-query-status", `Error: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    state.isGenerating = false;
  }
}

async function handleClearDB() {
  const btn = document.getElementById("clear-db-btn");
  btn.disabled = true;
  setStatus("clear-status", "Limpiando base de datos...", "loading");

  try {
    await clearAll();
    setStatus("clear-status", "Base de datos limpiada", "success");
    document.getElementById("ask-btn").disabled = true;
    document.getElementById("index-btn").disabled = true;
    document.getElementById("generate-resumen-btn").disabled = true;
    document.getElementById("file-input").value = "";
    state.currentFile = null;
  } catch (err) {
    console.error(err);
    setStatus("clear-status", `Error: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
  }
}

// ============================================================================
// Validador de Indicaciones al Alta
// Valida que el modelo no invente medicamentos, dosis o plazos
// ============================================================================

function normalizeText(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^\p{L}\p{N}\s.:/()-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sliceAltaBlockFromContext(contextText) {
  const idx = String(contextText || "").indexOf("[TIPO] Indicaciones de alta");
  if (idx === -1) return "";
  const sub = String(contextText).slice(idx);

  // Defensa: cortar si hubiera otro [TIPO] posterior
  const next = sub.slice(1).indexOf("[TIPO]");
  return next === -1 ? sub : sub.slice(0, next + 1);
}

function extractAltaLinesFromContext(contextText) {
  // Extrae TODAS las viñetas del bloque alta (Medicamentos/Controles/Cuidados/Signos de alarma)
  const altaBlock = sliceAltaBlockFromContext(contextText);
  if (!altaBlock) return [];

  const lines = altaBlock
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("*"));

  return lines.map(normalizeText);
}

function extractAltaLinesFromOutput(modelOutput) {
  // Extrae TODAS las viñetas bajo "Indicaciones al alta" (no solo medicamentos)
  const out = String(modelOutput || "");
  const m = out.match(/\bindicaciones\s+al\s+alta\b[:\s]*([\s\S]*?)($|\n\s*\*\*|\n\s*---)/i);
  if (!m) return [];

  const block = m[1];
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("*"));

  return lines.map(normalizeText);
}

function extractAltaSectionTextFromOutput(modelOutput) {
  const out = String(modelOutput || "");
  const m = out.match(/\bindicaciones\s+al\s+alta\b[\s\S]*$/i);
  return m ? m[0] : "";
}

function extractNumbersFromText(text) {
  // Extrae números con posible decimal
  const matches = text.match(/\b\d+([.,]\d+)?\b/g) || [];
  return matches;
}

function validateAltaIndications(altaChunkText, modelOutput) {
  const allowed = extractAltaLinesFromContext(altaChunkText);
  const produced = extractAltaLinesFromOutput(modelOutput);
  const warnings = [];

  console.log("🔍 Validando indicaciones al alta...");
  console.log("   Líneas permitidas del contexto:", allowed);
  console.log("   Líneas generadas:", produced);

  // Si no hay indicaciones en contexto, output no debería inventar
  if (allowed.length === 0 && produced.length > 0) {
    warnings.push({
      type: "invented_section",
      message: "No hay indicaciones de alta en el contexto, pero el modelo generó indicaciones.",
      severity: "high"
    });
  }

  // Cada línea producida debe tener correspondencia en alguna línea permitida
  for (const line of produced) {
    const hasMatch = allowed.some(a => {
      // Fuzzy match: la línea producida contiene palabras clave de la permitida o viceversa
      const aWords = a.split(/\s+/).filter(w => w.length > 3);
      const matchCount = aWords.filter(w => line.includes(w)).length;
      return matchCount >= Math.min(2, aWords.length);
    });

    if (!hasMatch && line.length > 10) {
      warnings.push({
        type: "unmatched_indication",
        message: `Indicación posiblemente inventada: "${line}"`,
        severity: "medium"
      });
    }
  }

  // Extraer toda la sección de indicaciones del output
  const indicacionesText = extractAltaSectionTextFromOutput(modelOutput);
  if (!indicacionesText) {
    return { ok: true, warnings, summary: "✅ No se encontró sección de indicaciones al alta" };
  }

  const allowedText = allowed.join(" ");

  // Números permitidos del contexto de indicaciones (todos los que aparecen)
  const allowedNums = extractNumbersFromText(allowedText);
  // Agregar números del chunk de alta completo
  const chunkNums = extractNumbersFromText(altaChunkText);

  // Bloqueo de números "nuevos" en sección de indicaciones
  const numsOut = extractNumbersFromText(indicacionesText);

  for (const n of numsOut) {
    const numVal = parseInt(n);
    // Ignorar números muy comunes (1-10) que pueden ser enumeraciones
    if (numVal <= 10) continue;
    // Ignorar años (2020-2030)
    if (numVal >= 2020 && numVal <= 2030) continue;

    // El número debe estar en las indicaciones permitidas O en el chunk de alta
    if (!allowedNums.includes(n) && !chunkNums.includes(n)) {
      warnings.push({
        type: "invented_number",
        message: `Número no respaldado en indicaciones de alta: ${n}`,
        severity: "high"
      });
    }
  }

  // Detectar frases con plazos/duraciones inventados
  // Busca patrones como "> 72 h", "persistente (> X días)", etc.
  const inventedDurationPatterns = [
    />\s*\d+\s*h(oras?)?\b/gi,  // > 72 h, > 24 horas
    /\(\s*>\s*\d+[^)]*\)/gi,    // (> 72 h), (> 24 horas)
    /persistente[^.]*\d+\s*(h|hora|día|semana)/gi,  // persistente ... X días
  ];

  for (const regex of inventedDurationPatterns) {
    const matches = indicacionesText.match(regex) || [];
    for (const match of matches) {
      // Verificar si este patrón exacto está en el contexto de indicaciones
      if (!normalizeText(allowedText).includes(normalizeText(match))) {
        warnings.push({
          type: "invented_duration",
          message: `Duración/plazo inventado: "${match}"`,
          severity: "high"
        });
      }
    }
  }

  // Detectar falta de literalidad en líneas críticas
  // Ej: contexto dice "retiro de puntos en 10 dias" pero output dice "fecha pendiente"
  const literalityChecks = [
    { keyword: "retiro", contextPattern: /retiro\s+de\s+puntos?\s+en\s+\d+\s+d/i },
    { keyword: "sutura", contextPattern: /retiro\s+de\s+puntos?\s+en\s+\d+\s+d/i },
  ];

  for (const check of literalityChecks) {
    // Si el contexto tiene esta información con número específico
    const contextHasLiteral = check.contextPattern.test(allowedText);
    if (contextHasLiteral) {
      // El output menciona el keyword pero sin el número?
      const outputMentionsKeyword = indicacionesText.toLowerCase().includes(check.keyword);
      const outputHasNumber = check.contextPattern.test(indicacionesText);

      if (outputMentionsKeyword && !outputHasNumber) {
        // Buscar si dice "pendiente", "no especificado", etc.
        const degradedPatterns = /pendiente|no especificad|sin fecha|a determinar/i;
        if (degradedPatterns.test(indicacionesText)) {
          warnings.push({
            type: "non_literal",
            message: `Falta literalidad: contexto tiene fecha específica pero output lo omite o degrada`,
            severity: "medium"
          });
        }
      }
    }
  }

  // Detectar signos de alarma con modificadores inventados
  // Ej: contexto dice "dolor abdominal intenso" pero output dice "dolor abdominal intenso persistente (> 72 h)"
  const alarmSignsInContext = allowed.filter(l =>
    l.includes("fiebre") || l.includes("dolor") || l.includes("ictericia")
  );

  for (const sign of alarmSignsInContext) {
    // Buscar en output una versión "ampliada" de este signo
    const signKeyword = sign.split(/\s+/).find(w => w.length > 4) || sign;
    const outputLine = indicacionesText.toLowerCase().split('\n').find(l => l.includes(signKeyword));

    if (outputLine) {
      // Si la línea del output es significativamente más larga, puede tener agregados
      const signWords = sign.split(/\s+/).length;
      const outputWords = outputLine.split(/\s+/).length;

      if (outputWords > signWords + 3) {
        // Verificar si hay paréntesis con contenido nuevo
        const parenthesisContent = outputLine.match(/\([^)]+\)/g) || [];
        for (const paren of parenthesisContent) {
          if (!sign.includes(paren.replace(/[()]/g, ''))) {
            warnings.push({
              type: "expanded_alarm_sign",
              message: `Signo de alarma expandido con datos no en contexto: "${paren}"`,
              severity: "high"
            });
          }
        }
      }
    }
  }

  const highSeverityCount = warnings.filter(w => w.severity === "high").length;
  const isValid = highSeverityCount === 0;

  return {
    ok: isValid,
    warnings,
    summary: warnings.length === 0
      ? "✅ Indicaciones al alta validadas correctamente"
      : `⚠️ ${warnings.length} advertencia(s) encontrada(s) (${highSeverityCount} grave(s))`
  };
}

/**
 * Valida que las alergias en el output coincidan con el contexto
 */
function validateAllergies(contextText, modelOutput) {
  const warnings = [];
  const ctx = normalizeText(contextText);
  const out = normalizeText(modelOutput);

  // Detectar si contexto dice "sin alergias conocidas"
  const noAllergyPatterns = [
    /sin\s+alergias?\s+conocidas?/i,
    /niega\s+alergias?/i,
    /no\s+refiere\s+alergias?/i
  ];

  const contextHasNoAllergies = noAllergyPatterns.some(p => p.test(ctx));

  if (contextHasNoAllergies) {
    // El output debe decir exactamente "Sin alergias conocidas" o similar
    const outputHasNoAllergies = noAllergyPatterns.some(p => p.test(out));

    // Verificar que no haya inventado alergias
    const inventedAllergyPatterns = [
      /alergia\s+a\s+\w+/i,
      /alergico\s+a\s+\w+/i,
      /intolerancia\s+a\s+\w+/i
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

    if (!outputHasNoAllergies && !outputInventedAllergy) {
      warnings.push({
        type: "missing_allergy_statement",
        message: "Contexto tiene 'sin alergias conocidas' pero el output no lo refleja",
        severity: "low"
      });
    }
  }

  return {
    ok: warnings.filter(w => w.severity === "high").length === 0,
    warnings,
    summary: warnings.length === 0
      ? "✅ Alergias validadas correctamente"
      : `⚠️ ${warnings.length} advertencia(s) de alergias`
  };
}

// ============================================================================
// Handler para generar Resumen de Alta (Epicrisis)
// ============================================================================

async function handleGenerateResumenAlta() {
  if (!state.llm) {
    setStatus("resumen-status", "Debes cargar el modelo LLM primero", "error");
    return;
  }

  if (state.isGenerating) {
    setStatus("resumen-status", "Ya hay una generación en curso", "error");
    return;
  }

  const btn = document.getElementById("generate-resumen-btn");
  btn.disabled = true;
  state.isGenerating = true;
  setStatus("resumen-status", "Recuperando todos los chunks...", "loading");

  try {
    // Obtener todos los chunks de la base de datos
    const allChunks = await new Promise((resolve, reject) => {
      const tx = state.db.transaction(STORE_CHUNKS, "readonly");
      const store = tx.objectStore(STORE_CHUNKS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!allChunks || allChunks.length === 0) {
      setStatus("resumen-status", "No hay documentos indexados. Indexa un documento primero.", "error");
      btn.disabled = false;
      state.isGenerating = false;
      return;
    }

    // Ordenar chunks para el resumen: resumen primero, luego evolución, labs, y alta al final
    const chunkOrder = { resumen: 0, evolucion_dia: 1, laboratorios: 2, alta: 3 };
    const sortedChunks = [...allChunks].sort((a, b) => {
      const orderA = chunkOrder[a.chunkType] ?? 99;
      const orderB = chunkOrder[b.chunkType] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      // Para evolución diaria, ordenar por día
      if (a.chunkType === "evolucion_dia" && b.chunkType === "evolucion_dia") {
        return (a.day || 0) - (b.day || 0);
      }
      return 0;
    });

    console.log("Chunks para resumen de alta:", sortedChunks.map(c => ({
      chunkKey: c.chunkKey,
      chunkType: c.chunkType,
      day: c.day
    })));

    setStatus("resumen-status", "Construyendo prompt para resumen de alta...", "loading");
    const prompt = buildPromptAltaResumen(sortedChunks);

    console.log("Prompt para resumen de alta (primeros 3000 chars):", prompt.slice(0, 3000));
    console.log("Longitud total del prompt:", prompt.length, "caracteres");

    setStatus("resumen-status", "Generando resumen de alta... (esto puede tomar varios minutos)", "loading");

    const inferenceStart = performance.now();
    const deviceUsed = state.deviceInfo?.device || "unknown";
    console.log(`🚀 Iniciando generación de resumen de alta con ${deviceUsed.toUpperCase()} [${state.modelType}]...`);
    console.log(`📋 Usando configuración: resumen_alta (max_new_tokens: ${GENERATION_CONFIGS.resumen_alta.max_new_tokens})`);

    // Generar usando la configuración resumen_alta
    const rawOutput = await generateText(prompt, GENERATION_CONFIGS.resumen_alta);

    const inferenceTime = ((performance.now() - inferenceStart) / 1000).toFixed(2);
    const tokensGenerated = rawOutput.split(/\s+/).length || 0;
    const tokensPerSecond = (tokensGenerated / parseFloat(inferenceTime)).toFixed(2);

    console.log(`✅ Resumen de alta generado en ${inferenceTime}s (${deviceUsed.toUpperCase()})`);
    console.log(`📈 Tokens/segundo: ${tokensPerSecond}`);
    console.log(`🔤 Palabras generadas: ${tokensGenerated}`);
    console.log("Resumen generado:", rawOutput);

    // Obtener el chunk de alta para validación específica
    const altaChunk = sortedChunks.find(c => c.chunkType === "alta");
    const altaChunkText = altaChunk ? altaChunk.text : "";

    // Validar indicaciones al alta usando el chunk específico
    const altaValidation = validateAltaIndications(altaChunkText, rawOutput);
    console.log(altaValidation.summary);
    if (altaValidation.warnings.length > 0) {
      console.warn("⚠️ Advertencias de indicaciones al alta:");
      altaValidation.warnings.forEach(w => {
        console.warn(`   [${w.severity.toUpperCase()}] ${w.type}: ${w.message}`);
      });
    }

    // Validar alergias usando todo el prompt (puede estar en resumen de ingreso)
    const allergyValidation = validateAllergies(prompt, rawOutput);
    console.log(allergyValidation.summary);
    if (allergyValidation.warnings.length > 0) {
      console.warn("⚠️ Advertencias de alergias:");
      allergyValidation.warnings.forEach(w => {
        console.warn(`   [${w.severity.toUpperCase()}] ${w.type}: ${w.message}`);
      });
    }

    // Combinar validaciones
    const allWarnings = [...altaValidation.warnings, ...allergyValidation.warnings];
    const hasHighSeverity = allWarnings.some(w => w.severity === "high");
    const validationOk = !hasHighSeverity;

    // Mostrar resultado en el cuadro de texto
    const resumenOutput = document.getElementById("resumen-output");
    const resumenSection = document.getElementById("resumen-section");

    // Agregar nota de validación si hay advertencias graves
    let outputText = rawOutput.trim();
    if (!validationOk) {
      outputText += "\n\n---\n⚠️ ADVERTENCIA DE VALIDACIÓN:\n";
      outputText += "Se detectaron posibles datos inventados.\n";
      allWarnings
        .filter(w => w.severity === "high")
        .forEach(w => {
          outputText += `• ${w.message}\n`;
        });
      outputText += "\nPor favor, verifique manualmente el resumen.";
    }

    resumenOutput.value = outputText;
    resumenSection.style.display = "block";

    const validationStatus = validationOk ? "" : " ⚠️ Revisar resumen";
    setStatus("resumen-status", `Resumen generado en ${inferenceTime}s (~${tokensGenerated} palabras)${validationStatus}`, validationOk ? "success" : "warning");

  } catch (err) {
    console.error("Error generando resumen de alta:", err);
    setStatus("resumen-status", `Error: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    state.isGenerating = false;
  }
}

// ============================================================================
// Init
// ============================================================================

async function init() {
  const isolated = window.crossOriginIsolated;
  const statusText = document.getElementById("isolation-text");
  statusText.textContent = isolated
    ? "crossOriginIsolated: true"
    : "crossOriginIsolated: false";
  statusText.style.color = isolated ? "#48bb78" : "#f56565";

  // Verificar WebGPU
  let webgpuStatus = "No disponible";
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        webgpuStatus = "Disponible";
      }
    } catch (e) {
      webgpuStatus = "Error: " + e.message;
    }
  }

  const webgpuText = document.getElementById("webgpu-text");
  if (webgpuText) {
    webgpuText.textContent = `WebGPU: ${webgpuStatus}`;
    webgpuText.style.color = webgpuStatus === "Disponible" ? "#48bb78" : "#f56565";
  }

  await initDB();

  document
    .getElementById("load-model-btn")
    .addEventListener("click", handleLoadModel);
  document
    .getElementById("file-input")
    .addEventListener("change", handleFileChange);
  document.getElementById("index-btn").addEventListener("click", handleIndex);
  document.getElementById("ask-btn").addEventListener("click", handleAsk);
  document
    .getElementById("generate-resumen-btn")
    .addEventListener("click", handleGenerateResumenAlta);
  document
    .getElementById("simple-query-btn")
    .addEventListener("click", handleSimpleQuery);
  document
    .getElementById("clear-db-btn")
    .addEventListener("click", handleClearDB);
}

init();
