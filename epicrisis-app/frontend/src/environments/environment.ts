import { GenerationMode } from '../app/core/models/rag.types';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',

  // ============================================
  // Configuracion de modo de generacion
  // ============================================

  // Modo inicial: 'remote' (backend API) o 'local' (ONNX en navegador)
  defaultGenerationMode: 'local' as GenerationMode,

  // Modelo LLM por defecto para modo local
  // IMPORTANTE: Modelos con archivos .onnx_data externos NO funcionan via HTTP local.
  // Usar modelos remotos de HuggingFace para el LLM (Transformers.js los cachea correctamente).
  //
  // Opciones recomendadas (remotas, descarga automatica):
  //   - 'onnx-community/Llama-3.2-1B-Instruct' (1.1GB, rapido)
  //   - 'HuggingFaceTB/SmolLM2-360M-Instruct' (200MB, ultra rapido)
  //   - 'onnx-community/Phi-3.5-mini-instruct-onnx-web' (2.2GB, buena calidad)
  //   - 'onnx-community/Ministral-3B-Instruct-2412-ONNX' (2.4GB, multimodal)
  defaultLocalModel: 'onnx-community/Llama-3.2-1B-Instruct',

  // Cargar modelos automaticamente al iniciar (solo si modo es 'local')
  autoLoadModels: false,

  // ============================================
  // Configuracion de modelos ONNX
  // ============================================

  // NOTA IMPORTANTE SOBRE MODELOS LOCALES:
  // Los modelos ONNX grandes usan archivos externos (.onnx_data) que NO pueden
  // cargarse via HTTP en el navegador. ONNX Runtime Web no soporta esto.
  //
  // SOLUCION HIBRIDA:
  // - LLM: Usar modelos remotos de HuggingFace (Transformers.js los cachea en IndexedDB)
  // - Embeddings: Usar modelo local (model_quantized.onnx es un solo archivo)

  // Usar embeddings locales (modelo sin .onnx_data funciona bien)
  useLocalEmbeddings: true,

  // Ruta base donde estan los modelos ONNX descargados
  localModelsPath: '/assets/models',

  // ============================================
  // Configuracion de modelos ONNX remotos (HuggingFace)
  // ============================================

  // URL base para modelos remotos (HuggingFace por defecto)
  modelsBaseUrl: 'https://huggingface.co',

  // Modelo de embeddings remoto (fallback si no hay local)
  embeddingModel: 'Xenova/multilingual-e5-small',

  // Preferir WebGPU sobre WASM cuando este disponible
  preferWebGPU: true,

  // ============================================
  // Configuracion de generacion
  // ============================================

  // Configuracion activa para generacion de epicrisis
  generationConfig: 'resumen_alta',

  // Maximo de tokens a generar
  maxNewTokens: 600,

  // Temperatura (0.0 = determinista, 1.0 = creativo)
  temperature: 0.1,

  // ============================================
  // Debug
  // ============================================

  // Mostrar logs de debug en consola
  debugMode: true
};
