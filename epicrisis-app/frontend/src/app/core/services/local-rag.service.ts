/**
 * Servicio RAG Local con modelos ONNX
 * Ejecuta modelos LLM y embeddings directamente en el navegador
 * usando Transformers.js con WebGPU/WASM
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { IndexedDBService } from './indexeddb.service';
import { ClinicalJson } from '../models/clinical.types';
import {
  LLM_MODELS,
  LLMModelConfig,
  GENERATION_CONFIGS,
  GenerationConfig,
  Chunk,
  VectorRecord,
  ScoredChunk,
  ModelStatus,
  EmbedderStatus,
  DeviceType,
  LocalEpicrisisResult,
  LocalValidationResult,
  ValidationWarning,
  RAGAnswer,
  EMBEDDINGS_MODEL
} from '../models/rag.types';
import { environment } from '../../../environments/environment';

// Tipos para Transformers.js (se cargan dinamicamente)
type Pipeline = any;
type AutoTokenizer = any;
type AutoModelForCausalLM = any;
type AutoProcessor = any;
type AutoModelForImageTextToText = any;

@Injectable({
  providedIn: 'root'
})
export class LocalRAGService {
  private indexedDB = inject(IndexedDBService);

  // Transformers.js modules (cargados dinamicamente)
  private transformers: any = null;
  private env: any = null;

  // Estado del modelo LLM
  private llm: any = null;
  private tokenizer: any = null;
  private processor: any = null;
  private modelType: 'pipeline' | 'causal-lm' | 'image-text-to-text' | 'text-generation-web' | null = null;
  private currentModelConfig: LLMModelConfig | null = null;

  // Estado del embedder
  private embedder: Pipeline | null = null;

  // Signals de estado
  modelStatus = signal<ModelStatus>({
    state: 'idle',
    device: null,
    modelId: null,
    progress: 0,
    error: null,
    loadTimeMs: null
  });

  embedderStatus = signal<EmbedderStatus>({
    state: 'idle',
    progress: 0,
    error: null
  });

  isGenerating = signal<boolean>(false);
  generationProgress = signal<string>('');

  // Computed
  isModelReady = computed(() => this.modelStatus().state === 'ready');
  isEmbedderReady = computed(() => this.embedderStatus().state === 'ready');
  isFullyReady = computed(() => this.isModelReady() && this.isEmbedderReady());
  availableModels = computed(() => LLM_MODELS.filter(m => !m.disabled));

  /**
   * Carga Transformers.js desde CDN usando import dinamico
   */
  private async loadTransformersFromCDN(url: string): Promise<any> {
    // Usar Function constructor para evitar errores de TypeScript con import() de URLs
    const importModule = new Function('url', 'return import(url)');
    return importModule(url);
  }

  /**
   * Determina si un modelo es local (descargado) o remoto (HuggingFace)
   */
  private isLocalModel(modelId: string): boolean {
    return modelId.startsWith('local/');
  }

  /**
   * Obtiene la configuracion de un modelo por su ID
   */
  private getModelConfig(modelId: string): LLMModelConfig | undefined {
    return LLM_MODELS.find(m => m.id === modelId);
  }

  /**
   * Construye la ruta completa para un modelo local
   */
  private getLocalModelPath(modelConfig: LLMModelConfig): string {
    const basePath = environment.localModelsPath || '/assets/models';
    return `${basePath}/${modelConfig.localPath}`;
  }

  // Configuracion ONNX del backend
  private onnxConfig: {
    modelSource: 'local' | 'remote';
    modelsBaseUrl: string;
    availableModels: string[];
  } | null = null;

  /**
   * Inicializa el servicio y carga Transformers.js
   */
  async initialize(): Promise<void> {
    try {
      // Cargar Transformers.js dinamicamente usando fetch + eval
      // TypeScript no soporta import() de URLs externas
      const cdnUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm';
      this.transformers = await this.loadTransformersFromCDN(cdnUrl);

      this.env = this.transformers.env;

      // Obtener configuracion del backend (si esta disponible)
      await this.fetchOnnxConfig();

      // Configurar entorno base
      this.env.allowLocalModels = false;
      this.env.allowRemoteModels = true;

      // Configurar WASM threads
      if (typeof window !== 'undefined' && (window as any).crossOriginIsolated) {
        this.env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4;
        console.log('[LocalRAG] crossOriginIsolated: true, threads:', this.env.backends.onnx.wasm.numThreads);
      } else {
        this.env.backends.onnx.wasm.numThreads = 1;
        console.log('[LocalRAG] crossOriginIsolated: false, threads: 1');
      }
      this.env.backends.onnx.wasm.proxy = false;

      // Inicializar IndexedDB
      await this.indexedDB.init();

      console.log('[LocalRAG] Inicializado correctamente');
      console.log('[LocalRAG] Model source:', this.onnxConfig?.modelSource || 'remote');
    } catch (error) {
      console.error('[LocalRAG] Error inicializando:', error);
      throw error;
    }
  }

  /**
   * Obtiene la configuracion ONNX del backend
   */
  private async fetchOnnxConfig(): Promise<void> {
    try {
      const response = await fetch(`${environment.apiUrl.replace('/api', '')}/api/onnx-config`);
      if (response.ok) {
        this.onnxConfig = await response.json();
        console.log('[LocalRAG] Configuracion ONNX del backend:', this.onnxConfig);
      }
    } catch (error) {
      console.log('[LocalRAG] Backend no disponible, usando configuracion remota por defecto');
      this.onnxConfig = null;
    }
  }

  /**
   * Configura Transformers.js para cargar desde backend local
   * Usa el proxy de Angular para redirigir /models al backend
   */
  private configureForLocalBackend(): void {
    // Usar el proxy de Angular (mismo origen) para evitar problemas CORS
    // El proxy redirige /models/* a http://localhost:3000/models/*
    this.env.remoteHost = window.location.origin;  // http://localhost:4200
    this.env.remotePathTemplate = '/models/{model}/';
    this.env.allowLocalModels = false;
    this.env.allowRemoteModels = true;
    console.log(`[LocalRAG] Configurado para backend local via proxy: ${this.env.remoteHost}/models/`);
  }

  /**
   * Configura Transformers.js para cargar desde HuggingFace
   */
  private configureForHuggingFace(): void {
    this.env.remoteHost = 'https://huggingface.co';
    this.env.remotePathTemplate = '{model}/resolve/{revision}/';
    this.env.allowLocalModels = false;
    this.env.allowRemoteModels = true;
    console.log('[LocalRAG] Configurado para HuggingFace');
  }

  /**
   * Carga un modelo LLM (local o remoto)
   */
  async loadModel(modelId: string, onProgress?: (progress: number) => void): Promise<void> {
    if (!this.transformers) {
      throw new Error('Transformers.js no inicializado. Llame a initialize() primero.');
    }

    const startTime = Date.now();
    const modelConfig = this.getModelConfig(modelId);

    if (!modelConfig) {
      throw new Error(`Modelo no encontrado: ${modelId}`);
    }

    this.currentModelConfig = modelConfig;
    const isLocal = this.isLocalModel(modelId);

    this.modelStatus.set({
      state: 'loading',
      device: null,
      modelId,
      progress: 0,
      error: null,
      loadTimeMs: null
    });

    try {
      // Detectar WebGPU
      let device: DeviceType = 'wasm';
      if (typeof navigator !== 'undefined' && 'gpu' in navigator && environment.preferWebGPU) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            device = 'webgpu';
          }
        } catch {
          console.warn('[LocalRAG] WebGPU no disponible, usando WASM');
        }
      }

      // Forzar WASM para modelos incompatibles
      if (modelConfig.wasmOnly && device === 'webgpu') {
        device = 'wasm';
        console.log('[LocalRAG] Forzando WASM para modelo:', modelId);
      }

      // Determinar dtype desde config
      const dtype = modelConfig.dtype;

      // Callback de progreso
      const progressCallback = (info: any) => {
        if (info.progress !== undefined) {
          const progress = Math.round(info.progress);
          this.modelStatus.update(s => ({ ...s, progress }));
          onProgress?.(progress);
        }
      };

      // Determinar si usar backend local o HuggingFace
      const useLocalBackend = isLocal && this.onnxConfig?.modelSource === 'local';
      let modelPath: string;

      if (useLocalBackend && modelConfig.localPath) {
        // Cargar desde backend local
        this.configureForLocalBackend();
        // El modelPath es solo el nombre del directorio (sin prefijo local/)
        modelPath = modelConfig.localPath;
        console.log('[LocalRAG] Cargando modelo desde BACKEND LOCAL:', modelPath);
      } else {
        // Cargar desde HuggingFace
        this.configureForHuggingFace();
        // Para modelos remotos, usar el ID completo de HuggingFace
        modelPath = modelId.replace('local/', '');
        console.log('[LocalRAG] Cargando modelo desde HUGGINGFACE:', modelPath);
      }

      // Opciones comunes - NO usar local_files_only cuando cargamos desde HTTP
      const loadOptions = {
        progress_callback: progressCallback,
        local_files_only: false  // Siempre false porque usamos HTTP (backend o HuggingFace)
      };

      // Cargar segun tipo de modelo
      if (modelConfig.type === 'image-text-to-text') {
        // Ministral y modelos multimodales con visión
        console.log('[LocalRAG] Cargando modelo image-text-to-text (multimodal)...');

        this.processor = await this.transformers.AutoProcessor.from_pretrained(modelPath, loadOptions);
        this.tokenizer = this.processor.tokenizer;

        this.llm = await this.transformers.AutoModelForImageTextToText.from_pretrained(modelPath, {
          ...loadOptions,
          dtype,
          device
        });
        this.modelType = 'image-text-to-text';

      } else if (modelConfig.type === 'text-generation-web') {
        // Phi-3.5 y modelos solo-texto optimizados para WebGPU
        // Usan AutoModelForCausalLM pero con configuración específica para web
        console.log('[LocalRAG] Cargando modelo text-generation-web (Phi-3.5)...');

        this.tokenizer = await this.transformers.AutoTokenizer.from_pretrained(modelPath, loadOptions);

        this.llm = await this.transformers.AutoModelForCausalLM.from_pretrained(modelPath, {
          ...loadOptions,
          dtype,
          device
        });
        this.modelType = 'text-generation-web';

      } else if (modelConfig.type === 'causal-lm') {
        // Llama, Granite, SmolLM, etc. (modelos causal-lm estándar)
        console.log('[LocalRAG] Cargando modelo causal-lm...');

        this.tokenizer = await this.transformers.AutoTokenizer.from_pretrained(modelPath, loadOptions);

        this.llm = await this.transformers.AutoModelForCausalLM.from_pretrained(modelPath, {
          ...loadOptions,
          dtype,
          device
        });
        this.modelType = 'causal-lm';

      } else {
        // Pipeline fallback
        console.log('[LocalRAG] Cargando modelo con pipeline...');

        this.llm = await this.transformers.pipeline('text-generation', modelPath, {
          ...loadOptions,
          dtype,
          device
        });
        this.modelType = 'pipeline';
      }

      const loadTimeMs = Date.now() - startTime;

      this.modelStatus.set({
        state: 'ready',
        device,
        modelId,
        progress: 100,
        error: null,
        loadTimeMs
      });

      console.log(`[LocalRAG] Modelo cargado: ${modelId} [${device}] en ${loadTimeMs}ms`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[LocalRAG] Error cargando modelo:', error);

      this.modelStatus.set({
        state: 'error',
        device: null,
        modelId,
        progress: 0,
        error: errorMessage,
        loadTimeMs: null
      });
      throw error;
    }
  }

  /**
   * Carga el modelo de embeddings (desde backend o HuggingFace)
   * NOTA: El modelo de embeddings local (model_quantized.onnx) es un solo archivo
   * sin .onnx_data, por lo que funciona correctamente via HTTP.
   */
  async loadEmbedder(onProgress?: (progress: number) => void): Promise<void> {
    if (!this.transformers) {
      throw new Error('Transformers.js no inicializado');
    }

    this.embedderStatus.set({
      state: 'loading',
      progress: 0,
      error: null
    });

    try {
      const progressCallback = (info: any) => {
        if (info.progress !== undefined) {
          const progress = Math.round(info.progress);
          this.embedderStatus.update(s => ({ ...s, progress }));
          onProgress?.(progress);
        }
      };

      // Determinar si usar backend local o HuggingFace
      const useBackendLocal = this.onnxConfig?.modelSource === 'local';
      let embeddingModelPath: string;

      if (useBackendLocal) {
        // Usar el modelo de embeddings desde el backend via proxy
        this.configureForLocalBackend();
        embeddingModelPath = EMBEDDINGS_MODEL.localPath;
        console.log('[LocalRAG] Cargando embedder desde BACKEND:', embeddingModelPath);
      } else {
        // Usar HuggingFace
        this.configureForHuggingFace();
        embeddingModelPath = EMBEDDINGS_MODEL.remoteId;
        console.log('[LocalRAG] Cargando embedder desde HUGGINGFACE:', embeddingModelPath);
      }

      // Embeddings siempre con WASM (WebGPU no soportado para feature-extraction)
      // NUNCA usar local_files_only porque siempre cargamos via HTTP
      this.embedder = await this.transformers.pipeline(
        'feature-extraction',
        embeddingModelPath,
        {
          dtype: 'q8',
          device: 'wasm',
          progress_callback: progressCallback,
          local_files_only: false  // Siempre false - cargamos via HTTP (backend o HF)
        }
      );

      this.embedderStatus.set({
        state: 'ready',
        progress: 100,
        error: null
      });

      console.log('[LocalRAG] Embedder cargado:', embeddingModelPath);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[LocalRAG] Error cargando embedder:', error);

      this.embedderStatus.set({
        state: 'error',
        progress: 0,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Genera embedding para un texto
   */
  async embed(text: string): Promise<number[]> {
    if (!this.embedder) {
      throw new Error('Embedder no cargado');
    }

    const output = await this.embedder(text, {
      pooling: 'mean',
      normalize: true
    });

    return Array.from(output.data);
  }

  /**
   * Normaliza un vector (L2)
   */
  private normalizeVector(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return norm > 0 ? vec.map(v => v / norm) : vec;
  }

  /**
   * Crea chunks a partir de datos clinicos
   */
  createChunks(clinicalData: ClinicalJson, episodeId: string): Chunk[] {
    const chunks: Chunk[] = [];
    const docId = episodeId;

    // 1. Chunk RESUMEN
    let resumenText = `[TIPO] Epicrisis\n`;
    resumenText += `[MOTIVO] ${clinicalData.motivo_ingreso || 'No especificado'}\n\n`;

    if (clinicalData.diagnostico_ingreso?.length) {
      resumenText += `Diagnostico de ingreso:\n`;
      clinicalData.diagnostico_ingreso.forEach(dx => {
        resumenText += `- ${dx.codigo}: ${dx.nombre}\n`;
      });
      resumenText += '\n';
    }

    if (clinicalData.diagnostico_egreso?.length) {
      resumenText += `Diagnostico de egreso:\n`;
      clinicalData.diagnostico_egreso.forEach(dx => {
        resumenText += `- ${dx.codigo}: ${dx.nombre}\n`;
      });
      resumenText += '\n';
    }

    if (clinicalData.procedimientos?.length) {
      resumenText += `Procedimientos:\n`;
      clinicalData.procedimientos.forEach(proc => {
        resumenText += `- ${proc.codigo}: ${proc.nombre}\n`;
      });
      resumenText += '\n';
    }

    if (clinicalData.tratamientos_intrahosp?.length) {
      resumenText += `Tratamientos intrahospitalarios:\n`;
      clinicalData.tratamientos_intrahosp.forEach(med => {
        resumenText += `- [${med.codigo}] ${med.nombre} ${med.via} ${med.dosis} ${med.frecuencia}\n`;
      });
    }

    chunks.push({
      chunkKey: `${docId}::resumen`,
      text: resumenText.trim(),
      sourceHint: `[DOC ${docId} | resumen]`,
      chunkType: 'resumen'
    });

    // 2. Chunks EVOLUCION (uno por dia/entrada)
    if (clinicalData.evolucion?.length) {
      clinicalData.evolucion.forEach((ev, index) => {
        const dayNum = index + 1;
        let evoText = `[TIPO] Evolucion diaria\n`;
        evoText += `[DIA] ${dayNum}\n`;
        evoText += `[FECHA] ${ev.fecha || 'No especificada'}\n\n`;
        evoText += `[TEXTO]\n${ev.nota}`;
        if (ev.profesional) {
          evoText += `\n\n[PROFESIONAL] ${ev.profesional}`;
        }

        chunks.push({
          chunkKey: `${docId}::evo:${dayNum}`,
          text: evoText.trim(),
          sourceHint: `[DOC ${docId} | evolucion dia ${dayNum}]`,
          chunkType: 'evolucion_dia',
          day: dayNum
        });
      });
    }

    // 3. Chunk LABORATORIOS
    if (clinicalData.laboratorios_relevantes?.length) {
      let labsText = `[TIPO] Laboratorios\n\n`;
      labsText += `Laboratorios resumen:\n`;
      clinicalData.laboratorios_relevantes.forEach(lab => {
        // Limpiar valor de laboratorio (eliminar unidades duplicadas)
        const cleanedValue = this.cleanLabValue(lab.valor);
        labsText += `- ${lab.parametro}: ${cleanedValue} (${lab.fecha})\n`;
      });

      chunks.push({
        chunkKey: `${docId}::labs`,
        text: labsText.trim(),
        sourceHint: `[DOC ${docId} | laboratorios]`,
        chunkType: 'laboratorios'
      });
    }

    // 4. Chunk INDICACIONES DE ALTA
    if (clinicalData.indicaciones_alta) {
      let altaText = `[TIPO] Indicaciones de alta\n\n`;

      if (clinicalData.indicaciones_alta.medicamentos?.length) {
        altaText += `Medicamentos:\n`;
        clinicalData.indicaciones_alta.medicamentos.forEach(med => {
          altaText += `- [${med.codigo}] ${med.nombre} ${med.dosis} ${med.via} ${med.frecuencia}`;
          if (med.duracion) altaText += ` por ${med.duracion}`;
          altaText += '\n';
        });
        altaText += '\n';
      }

      if (clinicalData.indicaciones_alta.controles?.length) {
        altaText += `Controles:\n`;
        clinicalData.indicaciones_alta.controles.forEach(c => {
          altaText += `- ${c}\n`;
        });
        altaText += '\n';
      }

      if (clinicalData.indicaciones_alta.recomendaciones?.length) {
        altaText += `Recomendaciones:\n`;
        clinicalData.indicaciones_alta.recomendaciones.forEach(r => {
          altaText += `- ${r}\n`;
        });
      }

      chunks.push({
        chunkKey: `${docId}::alta`,
        text: altaText.trim(),
        sourceHint: `[DOC ${docId} | indicaciones alta]`,
        chunkType: 'alta'
      });
    }

    return chunks;
  }

  /**
   * Indexa datos clinicos en la base de datos vectorial
   */
  async indexClinicalData(clinicalData: ClinicalJson, episodeId: string, onProgress?: (current: number, total: number) => void): Promise<number> {
    // Limpiar datos anteriores
    await this.indexedDB.clearAll();

    // Crear chunks
    const chunks = this.createChunks(clinicalData, episodeId);

    // Indexar cada chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Generar embedding con prefijo "passage: "
      const embedding = await this.embed(`passage: ${chunk.text}`);
      const normalizedVec = this.normalizeVector(embedding);

      // Guardar chunk y vector
      await this.indexedDB.putChunk(chunk);
      await this.indexedDB.putVector({
        chunkKey: chunk.chunkKey,
        dim: normalizedVec.length,
        vec: new Float32Array(normalizedVec).buffer
      });

      onProgress?.(i + 1, chunks.length);
    }

    console.log(`[LocalRAG] Indexados ${chunks.length} chunks`);
    return chunks.length;
  }

  /**
   * Calcula similitud coseno entre dos vectores
   */
  private cosine(vec1: number[], vec2: number[]): number {
    return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  }

  /**
   * Obtiene los top-K vectores mas similares
   */
  private topK(queryVec: number[], allVectors: VectorRecord[], k: number): ScoredChunk[] {
    const scored = allVectors.map(item => {
      const vec = Array.from(new Float32Array(item.vec));
      const score = this.cosine(queryVec, vec);
      return { chunkKey: item.chunkKey, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  /**
   * Maximal Marginal Relevance para diversidad
   */
  private mmr(queryVec: number[], candidates: ScoredChunk[], allVectors: VectorRecord[], k: number, lambda: number = 0.7): ScoredChunk[] {
    const selected: ScoredChunk[] = [];
    const remaining = [...candidates];

    // Mapa de vectores
    const vecMap = new Map<string, number[]>();
    allVectors.forEach(v => {
      vecMap.set(v.chunkKey, Array.from(new Float32Array(v.vec)));
    });

    while (selected.length < k && remaining.length > 0) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const candVec = vecMap.get(candidate.chunkKey);
        if (!candVec) continue;

        // Relevancia con query
        const relevance = this.cosine(queryVec, candVec);

        // Maxima similitud con ya seleccionados
        let maxSim = 0;
        for (const sel of selected) {
          const selVec = vecMap.get(sel.chunkKey);
          if (selVec) {
            maxSim = Math.max(maxSim, this.cosine(candVec, selVec));
          }
        }

        // Score MMR
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

  /**
   * Busca chunks relevantes para una pregunta
   */
  async search(question: string, topK: number = 10, finalK: number = 3): Promise<Chunk[]> {
    // Generar embedding de query
    const queryVec = await this.embed(`query: ${question}`);
    const normalizedQuery = this.normalizeVector(queryVec);

    // Obtener todos los vectores
    const allVectors = await this.indexedDB.getAllVectors();

    if (allVectors.length === 0) {
      return [];
    }

    // Top-K inicial
    const candidates = this.topK(normalizedQuery, allVectors, topK);

    // MMR para diversidad
    const selected = this.mmr(normalizedQuery, candidates, allVectors, finalK, 0.7);

    // Obtener chunks completos
    const chunkKeys = selected.map(s => s.chunkKey);
    return this.indexedDB.getChunksByKeys(chunkKeys);
  }

  /**
   * Compacta un chunk para incluirlo en el prompt
   */
  private compactChunkForPrompt(chunk: Chunk, maxChars: number): string {
    let text = chunk.text;
    if (text.length > maxChars) {
      text = text.substring(0, maxChars) + '...';
    }
    return text;
  }

  /**
   * Pre-extrae diagnósticos con códigos CIE-10 del contexto
   */
  private extractDiagnosticos(chunks: Chunk[]): { ingreso: string[], egreso: string[] } {
    const result = { ingreso: [] as string[], egreso: [] as string[] };

    for (const chunk of chunks) {
      if (chunk.chunkType !== 'resumen') continue;

      const lines = chunk.text.split('\n');
      let currentSection = '';

      for (const line of lines) {
        if (line.includes('Diagnostico de ingreso')) {
          currentSection = 'ingreso';
        } else if (line.includes('Diagnostico de egreso')) {
          currentSection = 'egreso';
        } else if (line.startsWith('- ') && currentSection) {
          // Formato: "- J18.9: Neumonía, no especificada"
          const match = line.match(/^-\s*([A-Z]\d+\.?\d*):?\s*(.+)/i);
          if (match) {
            const codigo = match[1];
            const nombre = match[2].trim();
            const formatted = `${nombre} (${codigo})`;
            if (currentSection === 'ingreso') {
              result.ingreso.push(formatted);
            } else {
              result.egreso.push(formatted);
            }
          }
        } else if (!line.startsWith('-') && !line.includes('Diagnostico')) {
          currentSection = '';
        }
      }
    }

    return result;
  }

  /**
   * Pre-extrae procedimientos del contexto
   */
  private extractProcedimientos(chunks: Chunk[]): string[] {
    const result: string[] = [];

    for (const chunk of chunks) {
      if (chunk.chunkType !== 'resumen') continue;

      const lines = chunk.text.split('\n');
      let inProcedimientos = false;

      for (const line of lines) {
        if (line.includes('Procedimientos:')) {
          inProcedimientos = true;
        } else if (line.startsWith('- ') && inProcedimientos) {
          const match = line.match(/^-\s*(.+)/);
          if (match) {
            result.push(match[1].trim());
          }
        } else if (!line.startsWith('-') && inProcedimientos && line.trim()) {
          inProcedimientos = false;
        }
      }
    }

    return result;
  }

  /**
   * Pre-extrae tratamientos intrahospitalarios con códigos ATC
   */
  private extractTratamientosIntrahosp(chunks: Chunk[]): string[] {
    const result: string[] = [];

    for (const chunk of chunks) {
      if (chunk.chunkType !== 'resumen') continue;

      const lines = chunk.text.split('\n');
      let inTratamientos = false;

      for (const line of lines) {
        if (line.includes('Tratamientos intrahospitalarios:')) {
          inTratamientos = true;
        } else if (line.startsWith('- ') && inTratamientos) {
          // Formato: "- [J01CA04] Amoxicilina VO 500mg c/8h"
          const match = line.match(/^-\s*\[([A-Z]\d+[A-Z]?\d*)\]\s*(.+)/i);
          if (match) {
            const codigo = match[1];
            const resto = match[2].trim();
            result.push(`${resto} (${codigo})`);
          } else {
            // Sin código ATC
            result.push(line.replace(/^-\s*/, '').trim());
          }
        } else if (!line.startsWith('-') && inTratamientos && line.trim()) {
          inTratamientos = false;
        }
      }
    }

    return result;
  }

  /**
   * Pre-extrae medicamentos de alta con códigos ATC
   */
  private extractMedicamentosAlta(chunks: Chunk[]): string[] {
    const result: string[] = [];

    for (const chunk of chunks) {
      if (chunk.chunkType !== 'alta') continue;

      const lines = chunk.text.split('\n');
      let inMedicamentos = false;

      for (const line of lines) {
        if (line.includes('Medicamentos:')) {
          inMedicamentos = true;
        } else if (line.startsWith('- ') && inMedicamentos) {
          // Formato: "- [J01CA04] Amoxicilina 500mg VO c/8h por 7 días"
          const match = line.match(/^-\s*\[([A-Z]\d+[A-Z]?\d*)\]\s*(.+)/i);
          if (match) {
            const codigo = match[1];
            const resto = match[2].trim();
            result.push(`${resto} (${codigo})`);
          } else {
            result.push(line.replace(/^-\s*/, '').trim());
          }
        } else if (line.includes('Controles:') || line.includes('Recomendaciones:')) {
          inMedicamentos = false;
        }
      }
    }

    return result;
  }

  /**
   * Extrae motivo de ingreso del contexto
   */
  private extractMotivoIngreso(chunks: Chunk[]): string {
    for (const chunk of chunks) {
      if (chunk.chunkType !== 'resumen') continue;
      const match = chunk.text.match(/\[MOTIVO\]\s*(.+)/);
      if (match && match[1] !== 'No especificado') {
        return match[1].trim();
      }
    }
    return 'No consignado';
  }

  /**
   * Extrae controles y recomendaciones de alta
   */
  private extractControlesYRecomendaciones(chunks: Chunk[]): { controles: string[], recomendaciones: string[] } {
    const result = { controles: [] as string[], recomendaciones: [] as string[] };

    for (const chunk of chunks) {
      if (chunk.chunkType !== 'alta') continue;

      const lines = chunk.text.split('\n');
      let currentSection = '';

      for (const line of lines) {
        if (line.includes('Controles:')) {
          currentSection = 'controles';
        } else if (line.includes('Recomendaciones:')) {
          currentSection = 'recomendaciones';
        } else if (line.startsWith('- ') && currentSection) {
          const texto = line.replace(/^-\s*/, '').trim();
          if (currentSection === 'controles') {
            result.controles.push(texto);
          } else {
            result.recomendaciones.push(texto);
          }
        }
      }
    }

    return result;
  }

  /**
   * Deduplica medicamentos por código ATC
   * Detecta y elimina medicamentos duplicados en la lista
   */
  private deduplicateMedicamentos(medicamentos: string[]): { unique: string[], duplicates: string[] } {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const med of medicamentos) {
      // Extraer código ATC del medicamento
      const match = med.match(/\(([A-Z]\d+[A-Z]?\d*)\)/i);
      const codigo = match ? match[1].toUpperCase() : med.toLowerCase();

      if (seen.has(codigo)) {
        duplicates.push(med);
      } else {
        seen.set(codigo, med);
      }
    }

    return {
      unique: Array.from(seen.values()),
      duplicates
    };
  }

  /**
   * Limpia formato de valores de laboratorio
   * Corrige unidades duplicadas como "7.8 g/dL g/dL" -> "7.8 g/dL"
   */
  private cleanLabValue(value: string): string {
    // Patrón para detectar unidades duplicadas
    // Ejemplo: "7.8 g/dL g/dL" -> "7.8 g/dL"
    const duplicateUnitPattern = /^([\d.,]+\s*)([a-zA-Z%\/\^]+(?:\d+)?(?:\/[a-zA-Z]+)?)\s+\2$/;
    const match = value.match(duplicateUnitPattern);
    if (match) {
      return `${match[1]}${match[2]}`;
    }

    // Patrón alternativo: "23.7% %" -> "23.7%"
    const percentDuplicatePattern = /^([\d.,]+%)\s+%$/;
    const percentMatch = value.match(percentDuplicatePattern);
    if (percentMatch) {
      return percentMatch[1];
    }

    return value.trim();
  }

  /**
   * Valida datos de entrada antes de generar epicrisis
   * Detecta campos vacíos y problemas de calidad
   */
  validateInputData(chunks: Chunk[]): {
    isValid: boolean;
    missingFields: string[];
    warnings: ValidationWarning[];
    duplicates: { medicamentos: string[] };
  } {
    const missingFields: string[] = [];
    const warnings: ValidationWarning[] = [];

    // Extraer datos
    const motivo = this.extractMotivoIngreso(chunks);
    const diagnosticos = this.extractDiagnosticos(chunks);
    const procedimientos = this.extractProcedimientos(chunks);
    const tratamientos = this.extractTratamientosIntrahosp(chunks);
    const medicamentos = this.extractMedicamentosAlta(chunks);
    const altaInfo = this.extractControlesYRecomendaciones(chunks);
    const hospitalizacion = this.calcularDiasHospitalizacion(chunks);

    // Validar campos obligatorios
    if (motivo === 'No consignado') {
      missingFields.push('motivo_ingreso');
      warnings.push({
        type: 'invented_section',
        message: 'Motivo de ingreso no consignado',
        severity: 'medium'
      });
    }

    if (diagnosticos.ingreso.length === 0) {
      missingFields.push('diagnostico_ingreso');
      warnings.push({
        type: 'invented_section',
        message: 'Diagnóstico de ingreso no consignado',
        severity: 'medium'
      });
    }

    if (diagnosticos.egreso.length === 0) {
      missingFields.push('diagnostico_egreso');
      warnings.push({
        type: 'invented_section',
        message: 'Diagnóstico de egreso no consignado',
        severity: 'medium'
      });
    }

    // Validar campos opcionales pero importantes
    if (procedimientos.length === 0) {
      warnings.push({
        type: 'invented_section',
        message: 'Sin procedimientos consignados - se usará frase estándar',
        severity: 'low'
      });
    }

    if (tratamientos.length === 0) {
      warnings.push({
        type: 'invented_section',
        message: 'Sin tratamientos intrahospitalarios consignados - se usará frase estándar',
        severity: 'low'
      });
    }

    if (medicamentos.length === 0) {
      missingFields.push('medicamentos_alta');
      warnings.push({
        type: 'invented_section',
        message: 'Sin medicamentos al alta',
        severity: 'medium'
      });
    }

    // Validar controles y recomendaciones vacíos
    if (altaInfo.controles.length === 0) {
      missingFields.push('controles');
      warnings.push({
        type: 'invented_section',
        message: 'Controles ambulatorios no consignados',
        severity: 'medium'
      });
    }

    if (altaInfo.recomendaciones.length === 0) {
      missingFields.push('recomendaciones');
      warnings.push({
        type: 'invented_section',
        message: 'Recomendaciones al alta no consignadas',
        severity: 'medium'
      });
    }

    // Validar hospitalización
    if (!hospitalizacion) {
      warnings.push({
        type: 'invented_number',
        message: 'No se pudo calcular días de hospitalización',
        severity: 'low'
      });
    }

    // Detectar medicamentos duplicados
    const medDuplicates = this.deduplicateMedicamentos(medicamentos);
    if (medDuplicates.duplicates.length > 0) {
      warnings.push({
        type: 'invented_section',
        message: `Medicamentos duplicados detectados: ${medDuplicates.duplicates.join(', ')}`,
        severity: 'low'
      });
    }

    return {
      isValid: missingFields.filter(f =>
        ['diagnostico_ingreso', 'diagnostico_egreso'].includes(f)
      ).length === 0,
      missingFields,
      warnings,
      duplicates: { medicamentos: medDuplicates.duplicates }
    };
  }

  /**
   * Calcula días de hospitalización desde las fechas de evolución
   */
  private calcularDiasHospitalizacion(chunks: Chunk[]): { dias: number, fechaIngreso: string, fechaAlta: string } | null {
    const fechas: Date[] = [];
    const fechasStr: string[] = [];

    for (const chunk of chunks) {
      if (chunk.chunkType !== 'evolucion_dia') continue;
      const match = chunk.text.match(/\[FECHA\]\s*(\d{4}-\d{2}-\d{2})/);
      if (match) {
        fechas.push(new Date(match[1]));
        fechasStr.push(match[1]);
      }
    }

    if (fechas.length < 2) return null;

    fechas.sort((a, b) => a.getTime() - b.getTime());
    fechasStr.sort();

    const diffTime = Math.abs(fechas[fechas.length - 1].getTime() - fechas[0].getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      dias: diffDays,
      fechaIngreso: fechasStr[0],
      fechaAlta: fechasStr[fechasStr.length - 1]
    };
  }

  /**
   * Construye el prompt para generar epicrisis
   * Usa datos pre-extraídos para reducir alucinaciones del modelo 3B
   */
  buildEpicrisisPrompt(chunks: Chunk[]): string {
    // PRE-EXTRAER datos estructurados del contexto
    const motivo = this.extractMotivoIngreso(chunks);
    const diagnosticos = this.extractDiagnosticos(chunks);
    const procedimientos = this.extractProcedimientos(chunks);
    const tratamientosIntrahosp = this.extractTratamientosIntrahosp(chunks);
    const medicamentosAlta = this.extractMedicamentosAlta(chunks);
    const altaInfo = this.extractControlesYRecomendaciones(chunks);
    const hospitalizacion = this.calcularDiasHospitalizacion(chunks);

    // Extraer evolución (chunks de tipo evolucion_dia)
    const evolucionChunks = chunks.filter(c => c.chunkType === 'evolucion_dia');
    const labsChunk = chunks.find(c => c.chunkType === 'laboratorios');

    let prompt = '';

    // INSTRUCCIÓN DIRECTA Y SIMPLE
    prompt += 'Transcribe estos datos clínicos en UN SOLO PÁRRAFO de texto plano.\n';
    prompt += 'REGLAS:\n';
    prompt += '1. NO inventes datos que no estén listados abajo\n';
    prompt += '2. NO uses formato: nada de ** negritas **, * cursivas *, [ corchetes ], guiones largos —\n';
    prompt += '3. Incluye TODOS los códigos entre paréntesis simples: (J18.9), (J01CA04)\n';
    prompt += '4. NO inventes deterioro clínico, empeoramiento ni urgencias que no estén documentados\n\n';

    // DATOS PRE-EXTRAÍDOS (el modelo solo debe unirlos)
    prompt += '=== DATOS CLÍNICOS ===\n\n';

    // Hospitalización calculada
    if (hospitalizacion) {
      prompt += `HOSPITALIZACIÓN: ${hospitalizacion.dias} días (desde ${hospitalizacion.fechaIngreso} hasta ${hospitalizacion.fechaAlta})\n`;
    }

    // Motivo y diagnóstico de ingreso
    prompt += `MOTIVO DE INGRESO: ${motivo}\n`;
    if (diagnosticos.ingreso.length > 0) {
      prompt += `DIAGNÓSTICO DE INGRESO: ${diagnosticos.ingreso.join(', ')}\n`;
    } else {
      prompt += `DIAGNÓSTICO DE INGRESO: No consignado\n`;
    }

    // Procedimientos - enfatizar frase exacta
    if (procedimientos.length > 0) {
      prompt += `PROCEDIMIENTOS: ${procedimientos.join(', ')}\n`;
    } else {
      prompt += `PROCEDIMIENTOS: "Sin procedimientos consignados" (usar esta frase exacta)\n`;
    }

    // Tratamientos intrahospitalarios - enfatizar frase exacta
    if (tratamientosIntrahosp.length > 0) {
      prompt += `TRATAMIENTOS INTRAHOSPITALARIOS: ${tratamientosIntrahosp.join('; ')}\n`;
    } else {
      prompt += `TRATAMIENTOS INTRAHOSPITALARIOS: "Sin tratamientos intrahospitalarios consignados" (usar esta frase exacta)\n`;
    }

    // Evolución (resumida del contexto)
    if (evolucionChunks.length > 0) {
      prompt += `EVOLUCIÓN:\n`;
      for (const evoChunk of evolucionChunks) {
        const fechaMatch = evoChunk.text.match(/\[FECHA\]\s*(.+)/);
        const textoMatch = evoChunk.text.match(/\[TEXTO\]\s*([\s\S]+?)(?:\[PROFESIONAL\]|$)/);
        if (fechaMatch && textoMatch) {
          const fecha = fechaMatch[1].trim();
          let texto = textoMatch[1].trim().substring(0, 180);
          if (textoMatch[1].trim().length > 180) texto += '...';
          prompt += `- ${fecha}: ${texto}\n`;
        }
      }
    }

    // Laboratorios
    if (labsChunk) {
      const labLines = labsChunk.text.split('\n').filter(l => l.startsWith('-'));
      if (labLines.length > 0) {
        prompt += `LABORATORIOS: ${labLines.map(l => l.replace(/^-\s*/, '')).join('; ')}\n`;
      }
    }

    // Diagnósticos de egreso - CRÍTICO: enfatizar que son DIFERENTES al de ingreso
    if (diagnosticos.egreso.length > 0) {
      prompt += `\n*** DIAGNÓSTICOS DE EGRESO (OBLIGATORIO incluir todos con código CIE-10): ***\n`;
      diagnosticos.egreso.forEach(dx => {
        prompt += `  • ${dx}\n`;
      });
    } else {
      prompt += `DIAGNÓSTICO DE EGRESO: No consignado\n`;
    }

    // Indicaciones al alta - ENFATIZAR CÓDIGOS ATC
    prompt += `\n*** INDICACIONES AL ALTA: ***\n`;

    // Deduplicar medicamentos antes de incluir en prompt
    const medDedupe = this.deduplicateMedicamentos(medicamentosAlta);
    const medicamentosUnicos = medDedupe.unique;

    if (medicamentosUnicos.length > 0) {
      prompt += `MEDICAMENTOS (OBLIGATORIO incluir código ATC entre paréntesis para cada uno):\n`;
      medicamentosUnicos.forEach(med => {
        prompt += `  • ${med}\n`;
      });
    } else {
      prompt += `MEDICAMENTOS: Sin medicamentos al alta\n`;
    }

    // Controles - usar frase estándar si vacío
    if (altaInfo.controles.length > 0) {
      prompt += `CONTROLES: ${altaInfo.controles.join('; ')}\n`;
    } else {
      prompt += `CONTROLES: "No consignado" (usar esta frase exacta)\n`;
    }

    // Recomendaciones - usar frase estándar si vacío
    if (altaInfo.recomendaciones.length > 0) {
      prompt += `RECOMENDACIONES: ${altaInfo.recomendaciones.join('; ')}\n`;
    } else {
      prompt += `RECOMENDACIONES: "No consignadas" (usar esta frase exacta)\n`;
    }

    prompt += '\n=== FIN DATOS ===\n\n';

    // INSTRUCCIÓN FINAL - Más específica sobre diagnósticos de egreso
    prompt += 'Escribe la epicrisis en UN PÁRRAFO CONTINUO de texto plano.\n';
    prompt += 'OBLIGATORIO:\n';
    prompt += '1. Incluir TODOS los diagnósticos de egreso con su código CIE-10: ejemplo "neumonía lobar (J18.1), hipertensión esencial (I10)"\n';
    prompt += '2. Incluir TODOS los medicamentos de alta con su código ATC: ejemplo "amoxicilina 500mg VO c/8h x7d (J01CA04)"\n';
    prompt += '3. NO usar asteriscos, corchetes ni negritas\n';
    prompt += '4. NO inventar empeoramiento ni deterioro clínico\n\n';
    prompt += 'Epicrisis:';

    return prompt;
  }

  /**
   * Genera texto con el modelo LLM
   */
  async generateText(prompt: string, config: GenerationConfig = GENERATION_CONFIGS['resumen_alta']): Promise<string> {
    if (!this.llm) {
      throw new Error('Modelo LLM no cargado');
    }

    this.isGenerating.set(true);
    this.generationProgress.set('Generando texto...');

    try {
      let output = '';

      if (this.modelType === 'image-text-to-text') {
        // Ministral y similares
        const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
        const chatPrompt = this.processor.apply_chat_template(messages, {
          add_generation_prompt: true
        });
        const inputs = this.tokenizer(chatPrompt, { return_tensors: 'pt' });
        const inputLength = inputs.input_ids.dims.at(-1);

        // Validar ventana de contexto
        let adjustedMaxTokens = config.max_new_tokens;
        if (inputLength + config.max_new_tokens > 8192) {
          adjustedMaxTokens = Math.max(50, 8192 - inputLength);
        }

        const outputs = await this.llm.generate({
          ...inputs,
          max_new_tokens: adjustedMaxTokens,
          min_length: config.min_length,
          temperature: config.temperature,
          top_p: config.top_p,
          repetition_penalty: config.repetition_penalty,
          do_sample: config.do_sample && config.temperature > 0
        });

        const newTokens = outputs.slice(null, [inputLength, null]);
        const decoded = this.tokenizer.batch_decode(newTokens, { skip_special_tokens: true });
        output = decoded[0] || '';

      } else if (this.modelType === 'causal-lm') {
        // Llama, Granite, SmolLM, Qwen3, etc.
        let formattedPrompt = prompt;

        // Detectar si es Qwen3 para habilitar modo thinking
        const isQwen3 = this.currentModelConfig?.id?.toLowerCase().includes('qwen3') ||
                        this.currentModelConfig?.id?.toLowerCase().includes('qwen-3');

        // Configuración ajustada para Qwen3 con thinking
        let effectiveConfig = config;
        if (isQwen3) {
          effectiveConfig = GENERATION_CONFIGS['qwen3_thinking'];
          console.log('[LocalRAG] Qwen3 detectado: usando configuración con thinking mode');
          console.log('[LocalRAG] max_new_tokens:', effectiveConfig.max_new_tokens);
        }

        if (this.tokenizer.apply_chat_template) {
          const messages = [
            { role: 'system', content: 'Eres un asistente médico experto en redacción de informes clínicos en español. Genera texto clínico preciso y profesional.' },
            { role: 'user', content: prompt }
          ];

          // Opciones del chat template
          const templateOptions: any = {
            tokenize: false,
            add_generation_prompt: true
          };

          // Habilitar thinking mode para Qwen3 (permite al modelo razonar antes de responder)
          if (isQwen3) {
            templateOptions.enable_thinking = true;
            console.log('[LocalRAG] Qwen3: thinking mode HABILITADO');
          }

          formattedPrompt = this.tokenizer.apply_chat_template(messages, templateOptions);
        }

        const inputs = this.tokenizer(formattedPrompt, { return_tensors: 'pt' });
        const inputLength = inputs.input_ids.dims.at(-1);

        const outputs = await this.llm.generate({
          ...inputs,
          max_new_tokens: effectiveConfig.max_new_tokens,
          temperature: effectiveConfig.temperature,
          top_p: effectiveConfig.top_p,
          repetition_penalty: Math.max(effectiveConfig.repetition_penalty, 1.2),
          no_repeat_ngram_size: 3,
          do_sample: effectiveConfig.temperature > 0
        });

        const newTokens = outputs.slice(null, [inputLength, null]);
        const decoded = this.tokenizer.batch_decode(newTokens, { skip_special_tokens: true });
        output = decoded[0] || '';

      } else if (this.modelType === 'text-generation-web') {
        // Phi-3.5 y modelos solo-texto optimizados para WebGPU
        // Similar a causal-lm pero con formato de chat específico de Phi
        let formattedPrompt = prompt;

        if (this.tokenizer.apply_chat_template) {
          const messages = [
            { role: 'system', content: 'Eres un asistente medico experto en redaccion de informes clinicos. Responde de manera precisa y concisa.' },
            { role: 'user', content: prompt }
          ];
          formattedPrompt = this.tokenizer.apply_chat_template(messages, {
            tokenize: false,
            add_generation_prompt: true
          });
        }

        const inputs = this.tokenizer(formattedPrompt, { return_tensors: 'pt' });
        const inputLength = inputs.input_ids.dims.at(-1);

        // Phi-3.5 tiene ventana de contexto de 128K, pero ajustamos para eficiencia
        let adjustedMaxTokens = config.max_new_tokens;
        const maxContextLength = 8192; // Limitar para eficiencia en navegador
        if (inputLength + config.max_new_tokens > maxContextLength) {
          adjustedMaxTokens = Math.max(50, maxContextLength - inputLength);
          console.log(`[LocalRAG] Phi-3.5: Ajustando max_new_tokens de ${config.max_new_tokens} a ${adjustedMaxTokens}`);
        }

        const outputs = await this.llm.generate({
          ...inputs,
          max_new_tokens: adjustedMaxTokens,
          temperature: config.temperature,
          top_p: config.top_p,
          repetition_penalty: Math.max(config.repetition_penalty, 1.3),
          no_repeat_ngram_size: 3,
          do_sample: config.temperature > 0
        });

        const newTokens = outputs.slice(null, [inputLength, null]);
        const decoded = this.tokenizer.batch_decode(newTokens, { skip_special_tokens: true });
        output = decoded[0] || '';

      } else {
        // Pipeline fallback
        const result = await this.llm(prompt, {
          max_new_tokens: config.max_new_tokens,
          temperature: config.temperature,
          top_p: config.top_p,
          do_sample: config.temperature > 0,
          return_full_text: false
        });
        output = result[0]?.generated_text || '';
      }

      // Post-procesar para limpiar formato no deseado
      output = this.cleanOutputFormat(output);

      return output.trim();

    } finally {
      this.isGenerating.set(false);
      this.generationProgress.set('');
    }
  }

  /**
   * Limpia formato no deseado del output (negritas, corchetes, guiones largos, tags thinking)
   */
  private cleanOutputFormat(text: string): string {
    let cleaned = text;

    // ============================================
    // PROCESAR TAGS DE THINKING (Qwen3 y similares)
    // El modelo genera: <think>razonamiento</think>respuesta
    // Queremos extraer solo la respuesta después del thinking
    // ============================================

    // Caso 1: Bloque completo <think>...</think> seguido de respuesta
    // Extraer solo lo que viene después del </think>
    if (cleaned.includes('<think>') && cleaned.includes('</think>')) {
      const thinkEndIndex = cleaned.indexOf('</think>');
      const afterThink = cleaned.substring(thinkEndIndex + '</think>'.length).trim();
      if (afterThink.length > 0) {
        console.log('[LocalRAG] Thinking detectado, extrayendo respuesta después de </think>');
        console.log('[LocalRAG] Longitud thinking:', thinkEndIndex, 'chars');
        console.log('[LocalRAG] Longitud respuesta:', afterThink.length, 'chars');
        cleaned = afterThink;
      } else {
        // Si no hay nada después del </think>, remover el bloque thinking
        cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
      }
    }

    // Caso 2: Tag <think> huérfano (sin cerrar) - el modelo no terminó de pensar
    // Esto significa que no hay respuesta útil aún
    if (cleaned.includes('<think>') && !cleaned.includes('</think>')) {
      const thinkIndex = cleaned.indexOf('<think>');
      const beforeThink = cleaned.substring(0, thinkIndex).trim();
      if (beforeThink.length > 0) {
        cleaned = beforeThink;
      } else {
        // No hay contenido antes del <think>, el modelo solo generó thinking
        console.warn('[LocalRAG] Modelo no completó thinking - respuesta vacía');
        cleaned = '[El modelo no completó su razonamiento. Intente nuevamente o use otro modelo.]';
      }
    }

    // Remover tags residuales
    cleaned = cleaned.replace(/<\/?think>/gi, '');

    // ============================================
    // LIMPIAR FORMATO MARKDOWN
    // ============================================
    // Remover negritas **texto** -> texto
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

    // Remover cursivas *texto* -> texto
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');

    // Convertir [código] -> (código) para códigos médicos
    cleaned = cleaned.replace(/\[([A-Z]\d+[A-Z]?\d*)\]/gi, '($1)');

    // Remover guiones largos — -> ,
    cleaned = cleaned.replace(/\s*—\s*/g, ', ');

    // Remover dobles paréntesis ((código)) -> (código)
    cleaned = cleaned.replace(/\(\(([^)]+)\)\)/g, '($1)');

    // Agregar paréntesis a códigos ATC/CIE-10 que estén sueltos (sin paréntesis)
    // Patrón: ", C09AA02" o " C09AA02." -> ", (C09AA02)" o " (C09AA02)."
    cleaned = cleaned.replace(/([,\s])([A-Z]\d{2}[A-Z]{2}\d{2})([,.\s]|$)/gi, '$1($2)$3');

    // Patrón para códigos CIE-10 sueltos: " J18.1" -> " (J18.1)"
    cleaned = cleaned.replace(/([,\s])([A-Z]\d+\.\d+)([,.\s]|$)/gi, '$1($2)$3');

    // Normalizar espacios múltiples
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim();
  }

  /**
   * Valida que el output no contenga alucinaciones
   */
  validateOutput(output: string, chunks: Chunk[]): LocalValidationResult {
    const warnings: ValidationWarning[] = [];
    const outputLower = output.toLowerCase();
    const contextText = chunks.map(c => c.text).join(' ').toLowerCase();

    // Validar que los códigos ATC estén presentes
    const codigosATCEsperados = this.extractMedicamentosAlta(chunks)
      .map(med => {
        const match = med.match(/\(([A-Z]\d+[A-Z]?\d*)\)/i);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    for (const codigoATC of codigosATCEsperados) {
      if (!output.includes(codigoATC)) {
        warnings.push({
          type: 'unmatched_indication',
          message: `Código ATC faltante en output: ${codigoATC}`,
          severity: 'medium'
        });
      }
    }

    // Validar que los códigos CIE-10 estén presentes
    const diagnosticos = this.extractDiagnosticos(chunks);
    const codigosCIE10 = [...diagnosticos.ingreso, ...diagnosticos.egreso]
      .map(dx => {
        const match = dx.match(/\(([A-Z]\d+\.?\d*)\)/i);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    for (const codigoCIE of codigosCIE10) {
      if (!output.includes(codigoCIE)) {
        warnings.push({
          type: 'unmatched_indication',
          message: `Código CIE-10 faltante en output: ${codigoCIE}`,
          severity: 'medium'
        });
      }
    }

    // Detectar patrones de basura
    if (/\b\d{3,}(?:-\d{1,4}){4,}\b/.test(output)) {
      warnings.push({
        type: 'invented_number',
        message: 'Patrón de números repetitivos detectado',
        severity: 'high'
      });
    }

    if (/(\b\w+\b)(?:\s*\1){10,}/i.test(output)) {
      warnings.push({
        type: 'invented_section',
        message: 'Tokens repetitivos detectados',
        severity: 'high'
      });
    }

    // Detectar formato no permitido (negritas, corchetes)
    if (/\*\*[^*]+\*\*/.test(output)) {
      warnings.push({
        type: 'invented_section',
        message: 'Formato no permitido: negritas (**texto**)',
        severity: 'medium'
      });
    }
    if (/\[[A-Z]\d+[A-Z]?\d*\]/i.test(output)) {
      warnings.push({
        type: 'invented_section',
        message: 'Formato no permitido: código entre corchetes [código]',
        severity: 'medium'
      });
    }

    // Detectar alucinaciones de deterioro clínico inventado
    const deterioroPatterns = [
      { pattern: /empeoramiento\s*(cl[ií]nico|inicial|progresivo)?/i, name: 'empeoramiento clínico' },
      { pattern: /manejo\s*(respiratorio\s*)?urgente/i, name: 'manejo urgente' },
      { pattern: /deterioro\s*(cl[ií]nico|progresivo|r[aá]pido)?/i, name: 'deterioro clínico' },
      { pattern: /descompensaci[oó]n/i, name: 'descompensación' },
      { pattern: /falla\s*(org[aá]nica|respiratoria|card[ií]aca)/i, name: 'falla orgánica' },
      { pattern: /inestabilidad\s*hemodinámica/i, name: 'inestabilidad hemodinámica' },
    ];

    for (const dp of deterioroPatterns) {
      if (dp.pattern.test(output) && !dp.pattern.test(contextText)) {
        warnings.push({
          type: 'invented_section',
          message: `Posible alucinación de deterioro: "${dp.name}" no documentado`,
          severity: 'high'
        });
      }
    }

    // ALUCINACIONES ESPECÍFICAS DETECTADAS EN PRUEBAS
    const hallucinations = [
      { pattern: /uci\s*(pedi[aá]trica|adulto)?/i, name: 'UCI', checkContext: true },
      { pattern: /unidad\s*de\s*cuidados?\s*intensivos?/i, name: 'Unidad de Cuidados Intensivos', checkContext: true },
      { pattern: /staphylococcus/i, name: 'Staphylococcus', checkContext: true },
      { pattern: /streptococcus/i, name: 'Streptococcus', checkContext: true },
      { pattern: /e\.?\s*coli/i, name: 'E. coli', checkContext: true },
      { pattern: /pseudomonas/i, name: 'Pseudomonas', checkContext: true },
      { pattern: /klebsiella/i, name: 'Klebsiella', checkContext: true },
      { pattern: /amoxicilina\s*(iv|intravenosa|ev)/i, name: 'Amoxicilina IV (no existe)', checkContext: false },
      { pattern: /hemocultivo\s*(positivo|negativo)/i, name: 'Hemocultivo', checkContext: true },
      { pattern: /urocultivo\s*(positivo|negativo)/i, name: 'Urocultivo', checkContext: true },
      { pattern: /cultivo\s*(positivo|negativo)/i, name: 'Cultivo', checkContext: true },
      { pattern: /sepsis/i, name: 'Sepsis', checkContext: true },
      { pattern: /shock\s*s[eé]ptico/i, name: 'Shock séptico', checkContext: true },
      { pattern: /ventilaci[oó]n\s*mec[aá]nica/i, name: 'Ventilación mecánica', checkContext: true },
      { pattern: /intubaci[oó]n/i, name: 'Intubación', checkContext: true },
    ];

    for (const h of hallucinations) {
      if (h.pattern.test(output)) {
        if (h.checkContext) {
          // Solo es alucinación si no está en el contexto
          if (!h.pattern.test(contextText)) {
            warnings.push({
              type: 'invented_section',
              message: `Posible alucinación: "${h.name}" no está en el contexto clínico`,
              severity: 'high'
            });
          }
        } else {
          // Siempre es error (ej: amoxicilina IV no existe)
          warnings.push({
            type: 'invented_section',
            message: `Error clínico: "${h.name}"`,
            severity: 'high'
          });
        }
      }
    }

    // Detectar signos vitales inventados (si no están en el contexto)
    const vitalPatterns = [
      { pattern: /ta\s*[:=]?\s*\d+\/\d+/i, name: 'TA (Tensión arterial)' },
      { pattern: /fc\s*[:=]?\s*\d+/i, name: 'FC (Frecuencia cardíaca)' },
      { pattern: /fr\s*[:=]?\s*\d+/i, name: 'FR (Frecuencia respiratoria)' },
      { pattern: /temperatura\s*[:=]?\s*\d+[.,]?\d*/i, name: 'Temperatura' },
      { pattern: /sato2?\s*[:=]?\s*\d+/i, name: 'Saturación O2' },
    ];

    for (const vp of vitalPatterns) {
      const matchOutput = output.match(vp.pattern);
      if (matchOutput && !vp.pattern.test(contextText)) {
        warnings.push({
          type: 'invented_number',
          message: `Signo vital posiblemente inventado: ${vp.name}`,
          severity: 'medium'
        });
      }
    }

    // Validar indicaciones de alta
    const altaChunk = chunks.find(c => c.chunkType === 'alta');
    if (altaChunk) {
      const altaValidation = this.validateAltaIndications(altaChunk.text, output);
      warnings.push(...altaValidation.warnings);
    }

    const highSeverityCount = warnings.filter(w => w.severity === 'high').length;

    return {
      ok: highSeverityCount === 0,
      warnings,
      summary: warnings.length === 0
        ? 'Validación correcta'
        : `${warnings.length} advertencia(s) encontrada(s)`
    };
  }

  /**
   * Valida indicaciones de alta contra el contexto
   */
  private validateAltaIndications(contextText: string, output: string): { warnings: ValidationWarning[] } {
    const warnings: ValidationWarning[] = [];
    const ctxLower = contextText.toLowerCase();
    const outLower = output.toLowerCase();

    // Detectar numeros no presentes en contexto
    const contextNumbers: string[] = contextText.match(/\d+/g) || [];
    const outputNumbers: string[] = output.match(/\d+/g) || [];

    for (const num of outputNumbers) {
      const numVal = parseInt(num, 10);
      if (numVal > 10 && numVal < 2020 && !contextNumbers.includes(num)) {
        // Ignorar numeros pequenos (enumeraciones) y anos
        warnings.push({
          type: 'invented_number',
          message: `Numero no respaldado: ${num}`,
          severity: 'medium'
        });
      }
    }

    // Detectar duraciones inventadas
    const durationPatterns = [
      />\s*\d+\s*h(oras?)?\b/gi,
      /\(\s*>\s*\d+[^)]*\)/gi
    ];

    for (const regex of durationPatterns) {
      const matches = output.match(regex) || [];
      for (const match of matches) {
        if (!ctxLower.includes(match.toLowerCase())) {
          warnings.push({
            type: 'invented_duration',
            message: `Duracion posiblemente inventada: "${match}"`,
            severity: 'medium'
          });
        }
      }
    }

    return { warnings };
  }

  /**
   * Genera epicrisis completa usando RAG local
   */
  async generateLocalEpicrisis(clinicalData: ClinicalJson, episodeId: string): Promise<LocalEpicrisisResult> {
    const startTime = Date.now();

    // 1. Indexar datos si no estan indexados
    const chunksCount = this.indexedDB.chunksCount();
    if (chunksCount === 0) {
      await this.indexClinicalData(clinicalData, episodeId);
    }

    // 2. Obtener todos los chunks para el resumen
    const allChunks = await this.indexedDB.getAllChunks();

    // 3. Ordenar chunks: resumen primero, luego evolucion, labs, alta
    const sortedChunks = allChunks.sort((a, b) => {
      const order: Record<string, number> = {
        'resumen': 0,
        'evolucion_dia': 1,
        'laboratorios': 2,
        'alta': 3
      };
      return (order[a.chunkType] || 99) - (order[b.chunkType] || 99);
    });

    // 3.5. Validar datos de entrada
    const inputValidation = this.validateInputData(sortedChunks);
    if (inputValidation.warnings.length > 0) {
      console.log('[LocalRAG] Validación de entrada:', {
        missingFields: inputValidation.missingFields,
        warnings: inputValidation.warnings.map(w => w.message),
        duplicates: inputValidation.duplicates
      });
    }

    // 4. Construir prompt
    const prompt = this.buildEpicrisisPrompt(sortedChunks);

    // 5. Generar texto
    const text = await this.generateText(prompt, GENERATION_CONFIGS['resumen_alta']);

    // 6. Validar output
    const outputValidation = this.validateOutput(text, sortedChunks);

    // 7. Combinar warnings de entrada y salida
    const allWarnings = [
      ...inputValidation.warnings.filter(w => w.severity !== 'low'),
      ...outputValidation.warnings
    ];

    const combinedValidation: LocalValidationResult = {
      ok: outputValidation.ok && inputValidation.isValid,
      warnings: allWarnings,
      summary: allWarnings.length === 0
        ? 'Validación correcta'
        : `${allWarnings.length} advertencia(s) encontrada(s)`
    };

    const processingTimeMs = Date.now() - startTime;
    const tokensGenerated = text.split(/\s+/).length;
    const tokensPerSecond = Math.round(tokensGenerated / (processingTimeMs / 1000));

    return {
      text,
      validation: combinedValidation,
      processingTimeMs,
      tokensGenerated,
      tokensPerSecond
    };
  }

  /**
   * Responde una pregunta usando RAG
   */
  async askQuestion(question: string): Promise<RAGAnswer> {
    const startTime = Date.now();

    // Buscar chunks relevantes
    const chunks = await this.search(question, 10, 3);

    if (chunks.length === 0) {
      return {
        answer: 'No se encontro informacion relevante.',
        sources: [],
        processingTimeMs: Date.now() - startTime
      };
    }

    // Construir prompt RAG
    let prompt = 'TAREA: extrae 4 frases EXACTAS del CONTEXTO.\n';
    prompt += 'FORMATO: 4 lineas con "- " y luego una sola linea: "Fuente: <sourceHint>".\n';
    prompt += 'PROHIBIDO: inventar, resumir, interpretar.\n\n';
    prompt += 'CONTEXTO:\n';

    chunks.forEach((chunk, i) => {
      const compact = this.compactChunkForPrompt(chunk, 1200);
      prompt += `${i + 1}. ${chunk.sourceHint}\n${compact}\n\n`;
    });

    prompt += `Pregunta: ${question}\n`;
    prompt += 'Respuesta:\n';

    // Generar respuesta
    const answer = await this.generateText(prompt, GENERATION_CONFIGS['rag']);

    return {
      answer,
      sources: chunks,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Descarga el modelo actual
   */
  unloadModel(): void {
    this.llm = null;
    this.tokenizer = null;
    this.processor = null;
    this.modelType = null;

    this.modelStatus.set({
      state: 'idle',
      device: null,
      modelId: null,
      progress: 0,
      error: null,
      loadTimeMs: null
    });
  }

  /**
   * Descarga el embedder
   */
  unloadEmbedder(): void {
    this.embedder = null;
    this.embedderStatus.set({
      state: 'idle',
      progress: 0,
      error: null
    });
  }

  /**
   * Descarga todos los modelos y limpia la DB
   */
  async cleanup(): Promise<void> {
    this.unloadModel();
    this.unloadEmbedder();
    await this.indexedDB.clearAll();
  }
}
