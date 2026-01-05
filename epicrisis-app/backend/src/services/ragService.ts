/**
 * Servicio RAG (Retrieval Augmented Generation) - Opcional
 * Para contexto historico de pacientes
 */
import { logger } from '../config/logger';
import { ClinicalJson } from '../types/clinical.types';

interface EmbeddingResult {
  text: string;
  embedding: number[];
}

interface RetrievalResult {
  text: string;
  score: number;
  source: string;
}

export class RagService {
  private embeddingModelPath: string;
  private isModelLoaded: boolean = false;
  private vectorIndex: Map<string, { embedding: number[]; text: string; metadata: Record<string, unknown> }> = new Map();

  constructor() {
    this.embeddingModelPath = process.env.EMBEDDING_MODEL_PATH || '../models/embeddings/multilingual-e5-small';
  }

  /**
   * Inicializa el modelo de embeddings
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`Inicializando modelo de embeddings desde: ${this.embeddingModelPath}`);
      // En produccion: cargar modelo multilingual-e5-small
      this.isModelLoaded = true;
      logger.info('Modelo de embeddings inicializado');
    } catch (error) {
      logger.error('Error inicializando modelo de embeddings:', error);
      throw error;
    }
  }

  /**
   * Genera embedding para un texto
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isModelLoaded) {
      throw new Error('Modelo de embeddings no inicializado');
    }

    // Mock: en produccion usar modelo real
    // Genera un vector aleatorio de 384 dimensiones (tamano de e5-small)
    const embedding = Array.from({ length: 384 }, () => Math.random() - 0.5);

    // Normalizar
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  }

  /**
   * Indexa datos clinicos para busqueda
   */
  async indexClinicalData(episodeId: string, data: ClinicalJson): Promise<void> {
    const startTime = Date.now();
    const metrics: Record<string, any> = {};

    logger.info('=== RAG INDEXING START ===');
    logger.info('[RAG_METRICS] Iniciando indexación', { episodeId });

    // 1. Chunking semántico
    const chunkingStartTime = Date.now();
    const chunks = this.chunkClinicalData(data);
    metrics.chunking_ms = Date.now() - chunkingStartTime;
    metrics.chunks_count = chunks.length;
    metrics.avg_chunk_length = chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length;

    logger.info('[RAG_METRICS] Chunking completado', {
      time_ms: metrics.chunking_ms,
      chunks_count: metrics.chunks_count,
      avg_chunk_length: Math.round(metrics.avg_chunk_length),
      sections: [...new Set(chunks.map(c => c.section))]
    });

    // 2. Generación de embeddings e indexación
    const embeddingStartTime = Date.now();
    const embeddingTimes: number[] = [];

    for (const chunk of chunks) {
      const embStart = Date.now();
      const embedding = await this.generateEmbedding(chunk.text);
      embeddingTimes.push(Date.now() - embStart);

      const key = `${episodeId}_${chunk.section}_${Date.now()}`;

      this.vectorIndex.set(key, {
        embedding,
        text: chunk.text,
        metadata: {
          episodeId,
          section: chunk.section
        }
      });
    }

    metrics.total_embedding_ms = Date.now() - embeddingStartTime;
    metrics.avg_embedding_ms = embeddingTimes.reduce((a, b) => a + b, 0) / embeddingTimes.length;
    metrics.min_embedding_ms = Math.min(...embeddingTimes);
    metrics.max_embedding_ms = Math.max(...embeddingTimes);

    logger.info('[RAG_METRICS] Embeddings generados', {
      total_time_ms: metrics.total_embedding_ms,
      avg_time_ms: metrics.avg_embedding_ms.toFixed(2),
      min_time_ms: metrics.min_embedding_ms,
      max_time_ms: metrics.max_embedding_ms,
      embeddings_per_second: (chunks.length / (metrics.total_embedding_ms / 1000)).toFixed(2)
    });

    // Métricas totales
    const totalTime = Date.now() - startTime;
    metrics.total_indexing_ms = totalTime;

    logger.info('[RAG_METRICS] === INDEXACIÓN COMPLETADA ===', {
      total_time_ms: metrics.total_indexing_ms,
      breakdown: {
        chunking: `${metrics.chunking_ms}ms (${((metrics.chunking_ms/totalTime)*100).toFixed(1)}%)`,
        embeddings: `${metrics.total_embedding_ms}ms (${((metrics.total_embedding_ms/totalTime)*100).toFixed(1)}%)`
      },
      index_stats: {
        total_vectors: this.vectorIndex.size,
        chunks_indexed: chunks.length
      }
    });
  }

  /**
   * Divide datos clinicos en chunks semanticos
   */
  private chunkClinicalData(data: ClinicalJson): { section: string; text: string }[] {
    const chunks: { section: string; text: string }[] = [];

    // Motivo de ingreso
    if (data.motivo_ingreso) {
      chunks.push({
        section: 'motivo_ingreso',
        text: `Motivo de ingreso: ${data.motivo_ingreso}`
      });
    }

    // Diagnosticos de ingreso
    if (data.diagnostico_ingreso?.length) {
      const dxText = data.diagnostico_ingreso
        .map((dx) => `${dx.nombre} (${dx.codigo})`)
        .join(', ');
      chunks.push({
        section: 'diagnostico_ingreso',
        text: `Diagnosticos de ingreso: ${dxText}`
      });
    }

    // Procedimientos
    if (data.procedimientos?.length) {
      const procText = data.procedimientos
        .map((p) => `${p.nombre} (${p.codigo}) - ${p.fecha}`)
        .join('; ');
      chunks.push({
        section: 'procedimientos',
        text: `Procedimientos realizados: ${procText}`
      });
    }

    // Evoluciones (cada una como chunk separado si son largas)
    if (data.evolucion?.length) {
      for (const ev of data.evolucion) {
        if (ev.nota.length > 50) {
          chunks.push({
            section: 'evolucion',
            text: `Evolucion ${ev.fecha}: ${ev.nota}`
          });
        }
      }
    }

    // Diagnosticos de egreso
    if (data.diagnostico_egreso?.length) {
      const dxText = data.diagnostico_egreso
        .map((dx) => `${dx.nombre} (${dx.codigo})`)
        .join(', ');
      chunks.push({
        section: 'diagnostico_egreso',
        text: `Diagnosticos de egreso: ${dxText}`
      });
    }

    // Medicamentos de alta
    if (data.indicaciones_alta?.medicamentos?.length) {
      const medText = data.indicaciones_alta.medicamentos
        .map((m) => `${m.nombre} ${m.dosis} ${m.via} ${m.frecuencia}`)
        .join('; ');
      chunks.push({
        section: 'medicamentos_alta',
        text: `Medicamentos al alta: ${medText}`
      });
    }

    return chunks;
  }

  /**
   * Busca contexto relevante usando similitud de coseno
   */
  async retrieve(query: string, topK: number = 5): Promise<RetrievalResult[]> {
    const startTime = Date.now();
    const metrics: Record<string, any> = {};

    logger.info('=== RAG RETRIEVAL START ===');
    logger.info('[RAG_METRICS] Iniciando búsqueda', {
      query_length: query.length,
      topK,
      index_size: this.vectorIndex.size
    });

    if (!this.isModelLoaded) {
      throw new Error('Modelo de embeddings no inicializado');
    }

    // 1. Generar embedding del query
    const queryEmbStartTime = Date.now();
    const queryEmbedding = await this.generateEmbedding(query);
    metrics.query_embedding_ms = Date.now() - queryEmbStartTime;

    logger.info('[RAG_METRICS] Query embedding generado', {
      time_ms: metrics.query_embedding_ms,
      embedding_dim: queryEmbedding.length
    });

    // 2. Calcular similitud de coseno con todos los documentos
    const similarityStartTime = Date.now();
    const results: { key: string; score: number }[] = [];

    for (const [key, doc] of this.vectorIndex) {
      const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({ key, score });
    }

    metrics.similarity_computation_ms = Date.now() - similarityStartTime;
    metrics.docs_compared = results.length;

    logger.info('[RAG_METRICS] Similitud calculada', {
      time_ms: metrics.similarity_computation_ms,
      docs_compared: metrics.docs_compared,
      comparisons_per_second: (metrics.docs_compared / (metrics.similarity_computation_ms / 1000)).toFixed(2)
    });

    // 3. Ordenar por score y tomar top K
    const sortingStartTime = Date.now();
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);
    metrics.sorting_ms = Date.now() - sortingStartTime;

    logger.info('[RAG_METRICS] Resultados ordenados', {
      time_ms: metrics.sorting_ms,
      top_k: topResults.length,
      top_scores: topResults.map(r => r.score.toFixed(4))
    });

    // Construir resultados finales
    const finalResults = topResults.map((r) => {
      const doc = this.vectorIndex.get(r.key)!;
      return {
        text: doc.text,
        score: r.score,
        source: r.key
      };
    });

    // Métricas totales
    const totalTime = Date.now() - startTime;
    metrics.total_retrieval_ms = totalTime;

    logger.info('[RAG_METRICS] === RETRIEVAL COMPLETADO ===', {
      total_time_ms: metrics.total_retrieval_ms,
      breakdown: {
        query_embedding: `${metrics.query_embedding_ms}ms (${((metrics.query_embedding_ms/totalTime)*100).toFixed(1)}%)`,
        similarity_comp: `${metrics.similarity_computation_ms}ms (${((metrics.similarity_computation_ms/totalTime)*100).toFixed(1)}%)`,
        sorting: `${metrics.sorting_ms}ms (${((metrics.sorting_ms/totalTime)*100).toFixed(1)}%)`
      },
      results_stats: {
        returned: finalResults.length,
        avg_score: (finalResults.reduce((sum, r) => sum + r.score, 0) / finalResults.length).toFixed(4),
        min_score: Math.min(...finalResults.map(r => r.score)).toFixed(4),
        max_score: Math.max(...finalResults.map(r => r.score)).toFixed(4)
      }
    });

    return finalResults;
  }

  /**
   * Calcula similitud de coseno entre dos vectores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Obtiene contexto para generacion de epicrisis
   */
  async getContextForEpicrisis(data: ClinicalJson, query?: string): Promise<string> {
    const searchQuery = query || 'resumen de hospitalizacion diagnostico tratamiento evolucion';

    const results = await this.retrieve(searchQuery, 3);

    if (results.length === 0) {
      return '';
    }

    return results.map((r) => r.text).join('\n\n');
  }

  /**
   * Limpia el indice
   */
  clearIndex(): void {
    this.vectorIndex.clear();
    logger.info('Indice de vectores limpiado');
  }

  /**
   * Verifica si el servicio esta listo
   */
  isReady(): boolean {
    return this.isModelLoaded;
  }
}

export const ragService = new RagService();
