import { GenerationMode } from '../app/core/models/rag.types';

export const environment = {
  production: true,
  apiUrl: '/api',

  // ============================================
  // Configuracion de modo de generacion
  // ============================================

  // Modo inicial: 'remote' (backend API) o 'local' (ONNX en navegador)
  defaultGenerationMode: 'remote' as GenerationMode,

  // Modelo LLM por defecto para modo local
  defaultLocalModel: 'onnx-community/Llama-3.2-1B-Instruct',

  // Cargar modelos automaticamente al iniciar
  autoLoadModels: false,

  // ============================================
  // Configuracion de modelos ONNX
  // ============================================

  // URL base para modelos
  modelsBaseUrl: 'https://huggingface.co',

  // Modelo de embeddings
  embeddingModel: 'Xenova/multilingual-e5-small',

  // Preferir WebGPU sobre WASM
  preferWebGPU: true,

  // ============================================
  // Configuracion de generacion
  // ============================================

  generationConfig: 'resumen_alta',
  maxNewTokens: 600,
  temperature: 0.1,

  // ============================================
  // Debug
  // ============================================

  debugMode: false
};
