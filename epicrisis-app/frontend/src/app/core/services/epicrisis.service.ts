/**
 * Servicio principal de Epicrisis
 * Gestiona el estado y las operaciones de la aplicación
 * Soporta generacion remota (backend) y local (ONNX en navegador)
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, finalize, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import { GenerationModeService } from './generation-mode.service';
import { LocalRAGService } from './local-rag.service';
import {
  ClinicalJson,
  EpicrisisResponse,
  EpisodeResponse,
  ValidationResult,
  ValidationViolation
} from '../models/clinical.types';

@Injectable({
  providedIn: 'root'
})
export class EpicrisisService {
  private api = inject(ApiService);
  private modeService = inject(GenerationModeService);
  private localRAG = inject(LocalRAGService);

  // Signals para estado reactivo
  clinicalData = signal<ClinicalJson | null>(null);
  patientInfo = signal<EpisodeResponse['patientInfo'] | null>(null);
  episodeId = signal<string>('');
  epicrisisText = signal<string>('');
  validationResult = signal<ValidationResult | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Computed values
  hasData = computed(() => this.clinicalData() !== null);
  hasEpicrisis = computed(() => this.epicrisisText().length > 0);
  isValid = computed(() => this.validationResult()?.ok ?? false);
  violationsCount = computed(() => this.validationResult()?.violations.length ?? 0);

  // Proxies al servicio de modo
  generationMode = this.modeService.currentMode;
  isLocalMode = this.modeService.isLocalMode;
  lastGenerationTimeMs = this.modeService.lastGenerationTimeMs;
  lastTokensPerSecond = this.modeService.lastTokensPerSecond;

  /**
   * Obtiene datos clínicos de un episodio
   */
  getEpisodeData(episodeId: string): Observable<EpisodeResponse> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.clearEpicrisis();

    return this.api.get<EpisodeResponse>(`/episodes/${episodeId}`).pipe(
      tap((response) => {
        this.clinicalData.set(response.clinicalData);
        this.patientInfo.set(response.patientInfo ?? null);
        this.episodeId.set(response.episodeId);

        // ========================================
        // DEBUG: Imprimir clinicalData en consola
        // ========================================
        console.group('%c[EpicrisisService] clinicalData cargado', 'color: #4CAF50; font-weight: bold;');
        console.log('%cEpisode ID:', 'color: #2196F3; font-weight: bold;', response.episodeId);
        console.log('%cPatient Info:', 'color: #2196F3; font-weight: bold;', response.patientInfo);
        console.log('%cclinicalData (objeto completo):', 'color: #FF9800; font-weight: bold;');
        console.log(response.clinicalData);
        console.log('%cclinicalData (JSON formateado):', 'color: #9C27B0; font-weight: bold;');
        console.log(JSON.stringify(response.clinicalData, null, 2));
        console.groupEnd();
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  /**
   * Genera epicrisis a partir de los datos clínicos actuales
   * Usa el modo configurado (remoto o local)
   */
  generateEpicrisis(): Observable<EpicrisisResponse> {
    const data = this.clinicalData();
    const episode = this.episodeId();

    if (!data) {
      throw new Error('No hay datos clínicos cargados');
    }

    const mode = this.modeService.currentMode();

    // ========================================
    // DEBUG: Imprimir clinicalData antes de enviar al LLM
    // ========================================
    console.group(`%c[EpicrisisService] Generando epicrisis [${mode.toUpperCase()}]`, 'color: #E91E63; font-weight: bold;');
    console.log('%cModo:', 'color: #2196F3; font-weight: bold;', mode);
    console.log('%cclinicalData:', 'color: #FF9800; font-weight: bold;');
    console.log(data);
    console.groupEnd();

    this.isLoading.set(true);
    this.errorMessage.set('');

    return this.modeService.generateEpicrisis(data, episode).pipe(
      tap((response) => {
        this.epicrisisText.set(response.text);
        this.validationResult.set(response.validation);

        // ========================================
        // DEBUG: Imprimir respuesta del LLM
        // ========================================
        console.group('%c[EpicrisisService] Respuesta del LLM recibida', 'color: #4CAF50; font-weight: bold;');
        console.log('%cModo:', 'color: #2196F3; font-weight: bold;', mode);
        console.log('%cTexto generado:', 'color: #2196F3; font-weight: bold;');
        console.log(response.text);
        console.log('%cValidacion:', 'color: #FF9800; font-weight: bold;', response.validation);
        console.log('%cTiempo de procesamiento:', 'color: #9C27B0; font-weight: bold;', response.processingTimeMs + 'ms');
        if (mode === 'local') {
          console.log('%cTokens/segundo:', 'color: #4CAF50; font-weight: bold;', this.lastTokensPerSecond());
        }
        console.groupEnd();
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  /**
   * Regenera epicrisis con corrección de violaciones
   */
  regenerateEpicrisis(): Observable<EpicrisisResponse> {
    const data = this.clinicalData();
    const episode = this.episodeId();
    const validation = this.validationResult();

    if (!data) {
      throw new Error('No hay datos clínicos cargados');
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    return this.modeService.regenerateEpicrisis(data, episode, validation?.violations || []).pipe(
      tap((response) => {
        this.epicrisisText.set(response.text);
        this.validationResult.set(response.validation);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  /**
   * Valida el texto de epicrisis actual
   */
  validateEpicrisis(): Observable<ValidationResult> {
    const data = this.clinicalData();
    const text = this.epicrisisText();

    if (!data || !text) {
      throw new Error('No hay datos para validar');
    }

    return this.modeService.validateEpicrisis(text, data).pipe(
      tap((result) => {
        this.validationResult.set(result);
      })
    );
  }

  /**
   * Indexa datos clinicos para RAG local
   */
  async indexForLocalRAG(): Promise<number> {
    const data = this.clinicalData();
    const episode = this.episodeId();

    if (!data) {
      throw new Error('No hay datos clínicos cargados');
    }

    return this.modeService.indexForLocalRAG(data, episode);
  }

  /**
   * Responde una pregunta usando RAG local
   */
  async askLocalQuestion(question: string): Promise<{ answer: string; sources: any[] }> {
    return this.modeService.askQuestion(question);
  }

  /**
   * Actualiza el texto de epicrisis manualmente
   */
  updateEpicrisisText(text: string): void {
    this.epicrisisText.set(text);
    // Limpiar validación al editar
    this.validationResult.set(null);
  }

  /**
   * Exporta a PDF
   */
  exportToPDF(): Observable<Blob> {
    const text = this.epicrisisText();
    const patient = this.patientInfo();
    const episode = this.episodeId();

    return this.api.postBlob('/export/pdf', {
      text,
      patientName: patient?.nombre,
      episodeId: episode
    });
  }

  /**
   * Exporta a Word
   */
  exportToWord(): Observable<Blob> {
    const text = this.epicrisisText();
    const patient = this.patientInfo();
    const episode = this.episodeId();

    return this.api.postBlob('/export/word', {
      text,
      patientName: patient?.nombre,
      episodeId: episode
    });
  }

  /**
   * Limpia el estado de epicrisis
   */
  clearEpicrisis(): void {
    this.epicrisisText.set('');
    this.validationResult.set(null);
  }

  /**
   * Limpia todo el estado
   */
  clearAll(): void {
    this.clinicalData.set(null);
    this.patientInfo.set(null);
    this.episodeId.set('');
    this.epicrisisText.set('');
    this.validationResult.set(null);
    this.errorMessage.set('');
  }

  /**
   * Establece un mensaje de error
   */
  setError(message: string): void {
    this.errorMessage.set(message);
  }
}
