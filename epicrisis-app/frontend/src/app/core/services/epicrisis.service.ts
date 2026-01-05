/**
 * Servicio principal de Epicrisis
 * Gestiona el estado y las operaciones de la aplicación
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, finalize } from 'rxjs';
import { ApiService } from './api.service';
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
   */
  generateEpicrisis(): Observable<EpicrisisResponse> {
    const data = this.clinicalData();
    if (!data) {
      throw new Error('No hay datos clínicos cargados');
    }

    // ========================================
    // DEBUG: Imprimir clinicalData antes de enviar al LLM
    // ========================================
    console.group('%c[EpicrisisService] Generando epicrisis con LLM', 'color: #E91E63; font-weight: bold;');
    console.log('%cclinicalData enviado al backend:', 'color: #FF9800; font-weight: bold;');
    console.log(data);
    console.log('%cRequest body:', 'color: #9C27B0; font-weight: bold;');
    console.log(JSON.stringify({ clinicalData: data }, null, 2));
    console.groupEnd();

    this.isLoading.set(true);
    this.errorMessage.set('');

    return this.api.post<EpicrisisResponse>('/generate-epicrisis', { clinicalData: data }).pipe(
      tap((response) => {
        this.epicrisisText.set(response.text);
        this.validationResult.set(response.validation);

        // ========================================
        // DEBUG: Imprimir respuesta del LLM
        // ========================================
        console.group('%c[EpicrisisService] Respuesta del LLM recibida', 'color: #4CAF50; font-weight: bold;');
        console.log('%cTexto generado:', 'color: #2196F3; font-weight: bold;');
        console.log(response.text);
        console.log('%cValidacion:', 'color: #FF9800; font-weight: bold;', response.validation);
        console.log('%cTiempo de procesamiento:', 'color: #9C27B0; font-weight: bold;', response.processingTimeMs + 'ms');
        console.log('%cRespuesta completa:', 'color: #607D8B; font-weight: bold;');
        console.log(response);
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
    const validation = this.validationResult();

    if (!data) {
      throw new Error('No hay datos clínicos cargados');
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    return this.api.post<EpicrisisResponse>('/regenerate-epicrisis', {
      clinicalData: data,
      violations: validation?.violations || []
    }).pipe(
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

    return this.api.post<ValidationResult>('/validate-epicrisis', {
      text,
      clinicalData: data
    }).pipe(
      tap((result) => {
        this.validationResult.set(result);
      })
    );
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
