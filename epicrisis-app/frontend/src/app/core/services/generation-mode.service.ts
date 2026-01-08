/**
 * Servicio para gestionar el modo de generacion (remoto vs local)
 * Configurable via environment.ts
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, from, of, switchMap, tap, finalize, catchError } from 'rxjs';
import { ApiService } from './api.service';
import { LocalRAGService } from './local-rag.service';
import {
  ClinicalJson,
  EpicrisisResponse,
  ValidationResult
} from '../models/clinical.types';
import { GenerationMode, LocalEpicrisisResult } from '../models/rag.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GenerationModeService {
  private api = inject(ApiService);
  private localRAG = inject(LocalRAGService);

  // Estado del modo - inicializado desde environment
  currentMode = signal<GenerationMode>(environment.defaultGenerationMode);

  // Estado de generacion
  isGenerating = signal<boolean>(false);
  lastGenerationTimeMs = signal<number>(0);
  lastTokensPerSecond = signal<number>(0);

  // Computed
  isLocalMode = computed(() => this.currentMode() === 'local');
  isRemoteMode = computed(() => this.currentMode() === 'remote');

  /**
   * Cambia el modo de generacion
   */
  setMode(mode: GenerationMode): void {
    // Solo permitir local si los modelos estan cargados
    if (mode === 'local' && !this.localRAG.isFullyReady()) {
      console.warn('[GenerationMode] No se puede cambiar a local: modelos no cargados');
      return;
    }
    this.currentMode.set(mode);
    console.log(`[GenerationMode] Modo cambiado a: ${mode}`);
  }

  /**
   * Genera epicrisis usando el modo actual
   */
  generateEpicrisis(
    clinicalData: ClinicalJson,
    episodeId: string
  ): Observable<EpicrisisResponse> {
    if (this.currentMode() === 'local') {
      return this.generateLocal(clinicalData, episodeId);
    } else {
      return this.generateRemote(clinicalData);
    }
  }

  /**
   * Genera epicrisis usando el backend remoto
   */
  private generateRemote(clinicalData: ClinicalJson): Observable<EpicrisisResponse> {
    this.isGenerating.set(true);

    return this.api.post<EpicrisisResponse>('/generate-epicrisis', { clinicalData }).pipe(
      tap(response => {
        this.lastGenerationTimeMs.set(response.processingTimeMs);
      }),
      finalize(() => this.isGenerating.set(false))
    );
  }

  /**
   * Genera epicrisis usando modelos locales ONNX
   */
  private generateLocal(
    clinicalData: ClinicalJson,
    episodeId: string
  ): Observable<EpicrisisResponse> {
    this.isGenerating.set(true);

    return from(this.localRAG.generateLocalEpicrisis(clinicalData, episodeId)).pipe(
      switchMap((result: LocalEpicrisisResult) => {
        this.lastGenerationTimeMs.set(result.processingTimeMs);
        this.lastTokensPerSecond.set(result.tokensPerSecond);

        // Convertir al formato esperado por la aplicacion
        const response: EpicrisisResponse = {
          text: result.text,
          validation: {
            ok: result.validation.ok,
            violations: result.validation.warnings.map(w => ({
              type: 'med' as const,
              mention: w.message,
              reason: w.type
            })),
            warnings: result.validation.warnings.map(w => w.message)
          },
          generatedAt: new Date().toISOString(),
          processingTimeMs: result.processingTimeMs
        };

        return of(response);
      }),
      catchError(error => {
        console.error('[GenerationMode] Error en generacion local:', error);
        throw error;
      }),
      finalize(() => this.isGenerating.set(false))
    );
  }

  /**
   * Regenera epicrisis con correccion de violaciones
   */
  regenerateEpicrisis(
    clinicalData: ClinicalJson,
    episodeId: string,
    violations: ValidationResult['violations']
  ): Observable<EpicrisisResponse> {
    if (this.currentMode() === 'local') {
      // En modo local, simplemente regeneramos
      return this.generateLocal(clinicalData, episodeId);
    } else {
      // En modo remoto, enviamos las violaciones para correccion
      this.isGenerating.set(true);

      return this.api.post<EpicrisisResponse>('/regenerate-epicrisis', {
        clinicalData,
        violations
      }).pipe(
        tap(response => {
          this.lastGenerationTimeMs.set(response.processingTimeMs);
        }),
        finalize(() => this.isGenerating.set(false))
      );
    }
  }

  /**
   * Valida epicrisis
   */
  validateEpicrisis(
    text: string,
    clinicalData: ClinicalJson
  ): Observable<ValidationResult> {
    if (this.currentMode() === 'local') {
      // Validacion local
      return from(this.localRAG['indexedDB'].getAllChunks()).pipe(
        switchMap(chunks => {
          const localResult = this.localRAG.validateOutput(text, chunks);
          const result: ValidationResult = {
            ok: localResult.ok,
            violations: localResult.warnings.map(w => ({
              type: 'med' as const,
              mention: w.message,
              reason: w.type
            })),
            warnings: localResult.warnings.map(w => w.message)
          };
          return of(result);
        })
      );
    } else {
      // Validacion remota
      return this.api.post<ValidationResult>('/validate-epicrisis', {
        text,
        clinicalData
      });
    }
  }

  /**
   * Indexa datos clinicos para RAG local
   */
  async indexForLocalRAG(clinicalData: ClinicalJson, episodeId: string): Promise<number> {
    if (!this.localRAG.isEmbedderReady()) {
      throw new Error('Embedder no cargado');
    }

    return this.localRAG.indexClinicalData(clinicalData, episodeId);
  }

  /**
   * Responde una pregunta usando RAG
   */
  async askQuestion(question: string): Promise<{ answer: string; sources: any[] }> {
    if (this.currentMode() !== 'local' || !this.localRAG.isFullyReady()) {
      throw new Error('RAG local no disponible');
    }

    return this.localRAG.askQuestion(question);
  }
}
