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
export type DType = 'q4f16' | 'q4' | 'fp16' | 'fp32' | 'q8' | {
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
  // Configuración para modelos fine-tuned
  isFineTuned?: boolean;           // true si es un modelo fine-tuned para epicrisis
  fineTunedConfig?: {
    // El modelo fine-tuned usa prompt mínimo (solo JSON con dx, proc, tto, evo, dx_alta, med)
    useMinimalPrompt: boolean;
    // El output del modelo empieza con "Ingresa por..." y la app inyecta datos del paciente
    requiresPatientDataInjection: boolean;
    // El output del modelo no incluye controles, la app los agrega al final
    requiresControlsInjection: boolean;
    // Configuración de generación específica para este modelo
    generationConfigKey?: string;
  };
}

export const LLM_MODELS: LLMModelConfig[] = [
  // ============================================
  // MODELOS FINE-TUNED PARA EPICRISIS
  // Entrenados específicamente para generar epicrisis clínicas
  // Usan prompt mínimo y post-procesamiento con datos del paciente
  // ============================================
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    name: 'Qwen2.5 0.5B Instruct ⭐',
    size: '~512MB',
    type: 'causal-lm',
    dtype: 'q8',
    remoteOnly: true,  // Cargar desde HuggingFace
    wasmOnly: false,
    recommended: true
  },
  {
    id: 'local/qwen2.5-1.5b-fp16',
    name: 'Qwen2.5 1.5B Base (fp16)',
    size: '~3GB',
    type: 'causal-lm',
    dtype: 'fp16',
    remoteOnly: false,
    wasmOnly: false,
    recommended: false,
    localPath: 'qwen2.5-1.5b-fp16',
    disabled: true,
    disabledReason: 'Modelo demasiado grande para memoria del navegador (3GB)'
  },
  {
    id: 'local/qwen2.5-1.5b-q8',
    name: 'Qwen2.5 1.5B Base (q8)',
    size: '~1.5GB',
    type: 'causal-lm',
    dtype: 'q8',
    remoteOnly: false,
    wasmOnly: true,
    recommended: false,
    localPath: 'qwen2.5-1.5b-q8',
    disabled: true,
    disabledReason: 'Error de carga ONNX con modelos grandes'
  },
  {
    id: 'local/qwen2.5-1.5b-q4',
    name: 'Qwen2.5 1.5B Base (q4)',
    size: '~1.7GB',
    type: 'causal-lm',
    dtype: 'q4',
    remoteOnly: false,
    wasmOnly: true,
    recommended: false,
    localPath: 'qwen2.5-1.5b-q4',
    disabled: true,
    disabledReason: 'Error de memoria WASM con modelos q4 grandes'
  },
  {
    id: 'local/epicrisis-q4f16-finetuned',
    name: 'Epicrisis Fine-tuned 1.5B (q4f16) ⭐',
    size: '~1.2GB',
    type: 'causal-lm',
    dtype: 'q4f16',
    remoteOnly: false,
    wasmOnly: false,
    recommended: true,
    localPath: 'epicrisis-q4f16-finetuned',
    isFineTuned: true,
    fineTunedConfig: {
      useMinimalPrompt: true,
      requiresPatientDataInjection: true,
      requiresControlsInjection: true,
      generationConfigKey: 'finetuned_epicrisis'
    }
  },
  {
    id: 'local/epicrisis-fp16-finetuned',
    name: 'Epicrisis Fine-tuned 1.5B (fp16)',
    size: '~3.1GB',
    type: 'causal-lm',
    dtype: 'fp16',
    remoteOnly: false,
    wasmOnly: false,
    recommended: false,
    localPath: 'epicrisis-fp16-finetuned',
    isFineTuned: true,
    fineTunedConfig: {
      useMinimalPrompt: true,
      requiresPatientDataInjection: true,
      requiresControlsInjection: true,
      generationConfigKey: 'finetuned_epicrisis'
    },
    disabled: true,
    disabledReason: 'Modelo muy grande para el navegador (3.1GB) - usar q4f16'
  },
  {
    id: 'local/epicrisis-fp32-finetuned',
    name: 'Epicrisis Fine-tuned 1.5B (fp32)',
    size: '~5.8GB',
    type: 'causal-lm',
    dtype: 'fp32',
    remoteOnly: false,
    wasmOnly: false,
    recommended: false,
    localPath: 'epicrisis-fp32-finetuned',
    isFineTuned: true,
    fineTunedConfig: {
      useMinimalPrompt: true,
      requiresPatientDataInjection: true,
      requiresControlsInjection: true,
      generationConfigKey: 'finetuned_epicrisis'
    },
    disabled: true,
    disabledReason: 'Modelo muy grande para el navegador (5.8GB) - usar fp16'
  },
  {
    id: 'local/epicrisis-q8-finetuned',
    name: 'Epicrisis Fine-tuned 1.5B (q8)',
    size: '~1.7GB',
    type: 'causal-lm',
    dtype: 'q8',
    remoteOnly: false,
    wasmOnly: false,
    recommended: false,
    localPath: 'epicrisis-q8-finetuned',
    isFineTuned: true,
    fineTunedConfig: {
      useMinimalPrompt: true,
      requiresPatientDataInjection: true,
      requiresControlsInjection: true,
      generationConfigKey: 'finetuned_epicrisis'
    },
    disabled: true,
    disabledReason: 'Cuantización q8 corrompe pesos del modelo - usar fp16'
  },

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
  },
  // Configuración para modelo fine-tuned de epicrisis
  // El modelo ya está entrenado para el formato, necesita menos tokens y temperatura baja
  finetuned_epicrisis: {
    max_new_tokens: 400,   // Output más corto porque el modelo es preciso
    min_length: 80,
    temperature: 0.3,      // Baja temperatura para output consistente
    top_p: 0.9,
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
