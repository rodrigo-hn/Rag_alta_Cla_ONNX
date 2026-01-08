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
  private modelType: 'pipeline' | 'causal-lm' | 'image-text-to-text' | null = null;
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
        // Ministral y modelos multimodales
        console.log('[LocalRAG] Cargando modelo image-text-to-text...');

        this.processor = await this.transformers.AutoProcessor.from_pretrained(modelPath, loadOptions);
        this.tokenizer = this.processor.tokenizer;

        this.llm = await this.transformers.AutoModelForImageTextToText.from_pretrained(modelPath, {
          ...loadOptions,
          dtype,
          device
        });
        this.modelType = 'image-text-to-text';

      } else if (modelConfig.type === 'causal-lm') {
        // Llama, Phi, Granite, SmolLM, etc.
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
        labsText += `- ${lab.parametro}: ${lab.valor} (${lab.fecha})\n`;
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
   * Construye el prompt para generar epicrisis
   */
  buildEpicrisisPrompt(chunks: Chunk[]): string {
    let prompt = '';

    // SYSTEM / ROLE
    prompt += 'Eres un médico especialista en medicina interna. ';
    prompt += 'Genera un informe de alta hospitalaria (epicrisis) en español de Chile, siguiendo este formato EXACTO:\n\n';

    // ESTRUCTURA OBLIGATORIA
    prompt += 'ESTRUCTURA OBLIGATORIA (un solo párrafo corrido):\n';
    prompt += '- Motivo y diagnóstico de ingreso (incluye código CIE-10 entre paréntesis)\n';
    prompt += '- Procedimientos y tratamientos relevantes durante hospitalización (incluye códigos entre paréntesis)\n';
    prompt += '- Evolución clínica resumida (por días si corresponde, sin repetir)\n';
    prompt += '- Diagnóstico(s) de egreso (incluye código CIE-10 entre paréntesis)\n';
    prompt += '- Indicaciones post-alta: medicamentos con dosis/vía/frecuencia/duración (incluye código ATC entre paréntesis)\n\n';

    // REGLAS ESTRICTAS
    prompt += 'REGLAS ESTRICTAS:\n';
    prompt += '1. Usa EXCLUSIVAMENTE la información del CONTEXTO proporcionado\n';
    prompt += '2. NO inventes ni agregues información\n';
    prompt += '3. Incluye SIEMPRE los códigos entre paréntesis para dx, procedimientos y medicamentos\n';
    prompt += '4. Si falta información, escribe "No consignado"\n';
    prompt += '5. Escribe en español clínico de Chile\n';
    prompt += '6. Formato: UN SOLO PÁRRAFO continuo, sin bullets ni saltos de línea\n\n';

    // CONTEXTO CLINICO
    prompt += 'CONTEXTO CLINICO:\n';
    chunks.forEach(chunk => {
      const compact = this.compactChunkForPrompt(chunk, 1400);
      prompt += `${compact}\n\n`;
    });

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
        // Llama, Phi, Granite, etc.
        let formattedPrompt = prompt;

        if (this.tokenizer.apply_chat_template) {
          const messages = [
            { role: 'system', content: 'Eres un asistente medico experto en redaccion de informes clinicos.' },
            { role: 'user', content: prompt }
          ];
          formattedPrompt = this.tokenizer.apply_chat_template(messages, {
            tokenize: false,
            add_generation_prompt: true
          });
        }

        const inputs = this.tokenizer(formattedPrompt, { return_tensors: 'pt' });
        const inputLength = inputs.input_ids.dims.at(-1);

        const outputs = await this.llm.generate({
          ...inputs,
          max_new_tokens: config.max_new_tokens,
          temperature: config.temperature,
          top_p: config.top_p,
          repetition_penalty: Math.max(config.repetition_penalty, 1.5),
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

      return output.trim();

    } finally {
      this.isGenerating.set(false);
      this.generationProgress.set('');
    }
  }

  /**
   * Valida que el output no contenga alucinaciones
   */
  validateOutput(output: string, chunks: Chunk[]): LocalValidationResult {
    const warnings: ValidationWarning[] = [];

    // Detectar patrones de basura
    if (/\b\d{3,}(?:-\d{1,4}){4,}\b/.test(output)) {
      warnings.push({
        type: 'invented_number',
        message: 'Patron de numeros repetitivos detectado',
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
        ? 'Validacion correcta'
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

    // 4. Construir prompt
    const prompt = this.buildEpicrisisPrompt(sortedChunks);

    // 5. Generar texto
    const text = await this.generateText(prompt, GENERATION_CONFIGS['resumen_alta']);

    // 6. Validar output
    const validation = this.validateOutput(text, sortedChunks);

    const processingTimeMs = Date.now() - startTime;
    const tokensGenerated = text.split(/\s+/).length;
    const tokensPerSecond = Math.round(tokensGenerated / (processingTimeMs / 1000));

    return {
      text,
      validation,
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
