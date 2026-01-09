/**
 * Tipos para el sistema RAG con modelos ONNX
 *
 * MODALIDADES DE CARGA:
 *
 * 1. BACKEND LOCAL (MODEL_SOURCE=local en backend/.env):
 *    - El backend sirve modelos ONNX desde /models via HTTP
 *    - Transformers.js usa env.remoteHost apuntando al backend
 *    - Soporta archivos .onnx_data correctamente
 *    - Requiere descargar modelos con ./scripts/download-models.sh
 *    - Los modelos locales (prefijo 'local/') se cargan desde el backend
 *
 * 2. HUGGINGFACE REMOTO (MODEL_SOURCE=remote o backend no disponible):
 *    - Transformers.js descarga modelos directamente desde HuggingFace
 *    - Los modelos se cachean en IndexedDB del navegador
 *    - No requiere descarga previa
 */

// ============================================================================
// MODELOS LLM
// ============================================================================

// Tipo para dtype - puede ser string simple o objeto para dtype mixto por componente
export type DType = 'q4f16' | 'q4' | 'fp16' | 'q8' | {
  decoder_model_merged?: string;
  embed_tokens?: string;
  vision_encoder?: string;
};

export interface LLMModelConfig {
  id: string;
  name: string;
  size: string;
  // Tipos de modelo:
  // - 'causal-lm': Modelos de texto estándar (Llama, Granite, SmolLM)
  // - 'image-text-to-text': Modelos multimodales con visión (Ministral)
  // - 'text-generation-web': Modelos solo-texto optimizados para WebGPU (Phi-3.5)
  // - 'pipeline': Fallback usando pipeline genérico
  type: 'causal-lm' | 'image-text-to-text' | 'text-generation-web' | 'pipeline';
  dtype: DType;
  remoteOnly: boolean;
  wasmOnly: boolean;
  recommended?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  // Configuracion para modelos locales (servidos desde backend)
  localPath?: string;
}

export const LLM_MODELS: LLMModelConfig[] = [
  // ============================================
  // MODELOS LOCALES (servidos desde backend)
  // Requieren: MODEL_SOURCE=local en backend/.env
  // Descargar con: ./scripts/download-models.sh
  // ============================================
  {
    id: 'local/Ministral-3-3B-Instruct-2512-ONNX',
    name: 'Ministral 3B (Local)',
    size: '~3.6GB',
    type: 'image-text-to-text',
    // Dtype mixto segun config.json del modelo:
    // - decoder usa q4f16 (cuantizado, mas pequeno)
    // - embed_tokens y vision_encoder usan fp16 (precision completa)
    dtype: {
      decoder_model_merged: 'q4f16',
      embed_tokens: 'fp16',
      vision_encoder: 'fp16'
    },
    remoteOnly: false,
    wasmOnly: false,
    recommended: true,
    localPath: 'Ministral-3-3B-Instruct-2512-ONNX'
  },
  {
    id: 'local/Phi-3.5-mini-instruct-onnx-web',
    name: 'Phi 3.5 Mini (Local)',
    size: '~2.2GB',
    type: 'text-generation-web',
    dtype: 'q4f16',
    remoteOnly: false,
    wasmOnly: false,
    localPath: 'Phi-3.5-mini-instruct-onnx-web'
  },
  {
    id: 'local/Qwen3-4B-ONNX',
    name: 'Qwen3 4B (Local) ⭐',
    size: '~2.8GB',
    type: 'causal-lm',
    dtype: 'q4f16',
    remoteOnly: false,
    wasmOnly: false,
    recommended: true,
    localPath: 'Qwen3-4B-ONNX'
  },

  // ============================================
  // MODELOS REMOTOS (HuggingFace CDN)
  // Transformers.js los descarga y cachea en IndexedDB
  // ============================================
  // ============================================
  // QWEN3-4B - Alibaba (Recomendado para calidad)
  // 4B parámetros, excelente seguimiento de instrucciones
  // Mejor calidad que Phi-3.5 para texto estructurado
  // ============================================
  {
    id: 'onnx-community/Qwen3-4B-ONNX',
    name: 'Qwen3 4B (HF) ⭐',
    size: '~2.8GB',
    type: 'causal-lm',
    dtype: 'q4f16',
    remoteOnly: false,
    wasmOnly: false,
    recommended: true
  },
  {
    id: 'onnx-community/Llama-3.2-1B-Instruct',
    name: 'Llama 3.2 1B Instruct (HF)',
    size: '~1.1GB',
    type: 'causal-lm',
    dtype: 'q4f16',
    remoteOnly: false,
    wasmOnly: false
  },
  {
    id: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    name: 'SmolLM2 360M (HF)',
    size: '~200MB',
    type: 'causal-lm',
    dtype: 'q4f16',
    remoteOnly: false,
    wasmOnly: false
  },
  // ============================================
  // PHI-3.5 MINI - Microsoft (Solo texto, optimizado WebGPU)
  // Similar a Ministral 3B pero sin capacidades de visión
  // 3.8B parámetros, 128K contexto, excelente razonamiento
  // ============================================
  {
    id: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
    name: 'Phi 3.5 Mini Microsoft (HF)',
    size: '~2.2GB',
    type: 'text-generation-web',  // Tipo especial para modelos solo-texto optimizados web
    dtype: 'q4f16',
    remoteOnly: false,
    wasmOnly: false
  },
  {
    id: 'onnx-community/Ministral-3B-Instruct-2412-ONNX',
    name: 'Ministral 3B (HF)',
    size: '~2.4GB',
    type: 'image-text-to-text',
    dtype: 'q4f16',
    remoteOnly: false,
    wasmOnly: false
  },
  {
    id: 'onnx-community/granite-3.0-2b-instruct',
    name: 'Granite 3.0 2B IBM (HF)',
    size: '~1.6GB',
    type: 'causal-lm',
    dtype: 'q4f16',
    remoteOnly: false,
    wasmOnly: false
  },
  {
    id: 'onnx-community/Llama-3.2-1B-Instruct-fp16',
    name: 'Llama 3.2 1B FP16 (HF)',
    size: '~2.5GB',
    type: 'causal-lm',
    dtype: 'fp16',
    remoteOnly: true,
    wasmOnly: false
  },

  // ============================================
  // MODELOS DESHABILITADOS
  // ============================================
  {
    id: 'onnx-community/Llama-3.2-3B-Instruct',
    name: 'Llama 3.2 3B Instruct',
    size: '~2.5GB',
    type: 'causal-lm',
    dtype: 'q4f16',
    remoteOnly: true,
    wasmOnly: false,
    disabled: true,
    disabledReason: 'Archivos .onnx_data externos no soportados desde HuggingFace'
  },
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    name: 'Qwen 2.5 0.5B Instruct',
    size: '~350MB',
    type: 'causal-lm',
    dtype: 'q4',
    remoteOnly: false,
    wasmOnly: true,
    disabled: true,
    disabledReason: 'Inestable con WASM'
  }
];

// Modelo de embeddings local
export const EMBEDDINGS_MODEL = {
  id: 'local/multilingual-e5-small',
  name: 'Multilingual E5 Small (Local)',
  size: '~120MB',
  localPath: 'multilingual-e5-small',
  modelFile: 'onnx/model_quantized.onnx',
  remoteId: 'Xenova/multilingual-e5-small'
};

// ============================================================================
// CONFIGURACION DE GENERACION
// ============================================================================

export interface GenerationConfig {
  max_new_tokens: number;
  min_length: number;
  temperature: number;
  top_p: number;
  repetition_penalty: number;
  do_sample: boolean;
}

export const GENERATION_CONFIGS: Record<string, GenerationConfig> = {
  rag: {
    max_new_tokens: 512,
    min_length: 50,
    temperature: 0.2,
    top_p: 0.9,
    repetition_penalty: 1.1,
    do_sample: true
  },
  resumen_alta: {
    max_new_tokens: 600,
    min_length: 100,
    temperature: 0.1,
    top_p: 0.85,
    repetition_penalty: 1.2,
    do_sample: true
  },
  extraction: {
    max_new_tokens: 256,
    min_length: 20,
    temperature: 0.1,
    top_p: 0.8,
    repetition_penalty: 1.0,
    do_sample: false
  },
  simple_query: {
    max_new_tokens: 256,
    min_length: 10,
    temperature: 0.3,
    top_p: 0.9,
    repetition_penalty: 1.1,
    do_sample: true
  },
  // Configuración especial para Qwen3 con modo thinking habilitado
  // El modelo "piensa" antes de responder, necesita más tokens
  qwen3_thinking: {
    max_new_tokens: 2048,  // 1000+ para thinking, 500+ para respuesta
    min_length: 100,
    temperature: 0.6,     // Qwen3 usa 0.6 por defecto
    top_p: 0.95,          // Qwen3 usa 0.95 por defecto
    repetition_penalty: 1.1,
    do_sample: true
  }
};

// ============================================================================
// CHUNKS Y VECTORES
// ============================================================================

export interface Chunk {
  chunkKey: string;
  text: string;
  sourceHint: string;
  chunkType: 'resumen' | 'evolucion_dia' | 'laboratorios' | 'alta';
  day?: number;
}

export interface VectorRecord {
  chunkKey: string;
  dim: number;
  vec: ArrayBuffer;
}

export interface ScoredChunk {
  chunkKey: string;
  score: number;
}

// ============================================================================
// ESTADO DEL MODELO
// ============================================================================

export type ModelState = 'idle' | 'loading' | 'ready' | 'error';
export type DeviceType = 'webgpu' | 'wasm';

export interface ModelStatus {
  state: ModelState;
  device: DeviceType | null;
  modelId: string | null;
  progress: number;
  error: string | null;
  loadTimeMs: number | null;
}

export interface EmbedderStatus {
  state: ModelState;
  progress: number;
  error: string | null;
}

// ============================================================================
// VALIDACION
// ============================================================================

export interface ValidationWarning {
  type: 'invented_section' | 'unmatched_indication' | 'invented_number' | 'invented_duration' | 'expanded_alarm_sign' | 'invented_allergy';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LocalValidationResult {
  ok: boolean;
  warnings: ValidationWarning[];
  summary: string;
}

// ============================================================================
// RESPUESTAS RAG
// ============================================================================

export interface RAGAnswer {
  answer: string;
  sources: Chunk[];
  processingTimeMs: number;
}

export interface LocalEpicrisisResult {
  text: string;
  validation: LocalValidationResult;
  processingTimeMs: number;
  tokensGenerated: number;
  tokensPerSecond: number;
}

// ============================================================================
// MODO DE GENERACION
// ============================================================================

export type GenerationMode = 'remote' | 'local';

export interface GenerationModeConfig {
  mode: GenerationMode;
  modelId: string | null;
}
