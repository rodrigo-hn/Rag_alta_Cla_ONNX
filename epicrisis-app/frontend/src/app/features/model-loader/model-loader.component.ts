/**
 * Componente para cargar modelos ONNX locales
 * Permite seleccionar y cargar modelos LLM y embeddings en el navegador
 */
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { LocalRAGService } from '../../core/services/local-rag.service';
import { LLM_MODELS, LLMModelConfig, EMBEDDINGS_MODEL } from '../../core/models/rag.types';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-model-loader',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <mat-card class="model-loader-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>memory</mat-icon>
        <mat-card-title>Modelos Locales ONNX</mat-card-title>
        <mat-card-subtitle>Ejecutar LLM directamente en el navegador</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <!-- Status del sistema -->
        <div class="system-status">
          <div class="status-item" [class.available]="crossOriginIsolated">
            <mat-icon>{{ crossOriginIsolated ? 'check_circle' : 'cancel' }}</mat-icon>
            <span>CrossOriginIsolated</span>
          </div>
          <div class="status-item" [class.available]="webGPUAvailable()">
            <mat-icon>{{ webGPUAvailable() ? 'check_circle' : 'cancel' }}</mat-icon>
            <span>WebGPU</span>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Selector de modelo LLM -->
        <div class="model-section">
          <h4>Modelo LLM</h4>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Seleccionar modelo</mat-label>
            <mat-select [(value)]="selectedModelId" [disabled]="isModelLoading()">
              <!-- Modelos Locales -->
              <mat-optgroup label="Modelos Locales (descargados)">
                @for (model of localModels(); track model.id) {
                  <mat-option [value]="model.id" [disabled]="model.disabled">
                    <div class="model-option">
                      <mat-icon class="local-icon">folder</mat-icon>
                      <span class="model-name">{{ model.name }}</span>
                      <span class="model-size">{{ model.size }}</span>
                      @if (model.recommended) {
                        <mat-icon class="recommended-icon" matTooltip="Recomendado">star</mat-icon>
                      }
                    </div>
                  </mat-option>
                }
              </mat-optgroup>
              <!-- Modelos Remotos -->
              <mat-optgroup label="Modelos Remotos (HuggingFace)">
                @for (model of remoteModels(); track model.id) {
                  <mat-option [value]="model.id" [disabled]="model.disabled">
                    <div class="model-option">
                      <mat-icon class="remote-icon">cloud</mat-icon>
                      <span class="model-name">{{ model.name }}</span>
                      <span class="model-size">{{ model.size }}</span>
                    </div>
                  </mat-option>
                }
              </mat-optgroup>
            </mat-select>
          </mat-form-field>

          @if (modelStatus().state === 'loading') {
            <div class="progress-section">
              <mat-progress-bar mode="determinate" [value]="modelStatus().progress"></mat-progress-bar>
              <span class="progress-text">Cargando modelo... {{ modelStatus().progress }}%</span>
            </div>
          }

          @if (modelStatus().state === 'ready') {
            <div class="status-ready">
              <mat-icon>check_circle</mat-icon>
              <span>
                Modelo cargado [{{ modelStatus().device?.toUpperCase() }}]
                en {{ (modelStatus().loadTimeMs || 0) / 1000 | number:'1.1-1' }}s
              </span>
            </div>
          }

          @if (modelStatus().state === 'error') {
            <div class="status-error">
              <mat-icon>error</mat-icon>
              <span>{{ modelStatus().error }}</span>
            </div>
          }

          <div class="button-group">
            <button
              mat-raised-button
              color="primary"
              (click)="loadModel()"
              [disabled]="!selectedModelId || isModelLoading() || modelStatus().state === 'ready'"
            >
              <mat-icon>download</mat-icon>
              Cargar Modelo LLM
            </button>

            @if (modelStatus().state === 'ready') {
              <button mat-stroked-button color="warn" (click)="unloadModel()">
                <mat-icon>delete</mat-icon>
                Descargar
              </button>
            }
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Embedder -->
        <div class="model-section">
          <h4>Modelo de Embeddings</h4>
          <p class="model-info">
            @if (useLocalEmbeddings) {
              <mat-icon class="local-icon-small">folder</mat-icon>
              {{ embeddingsModelName }} (Local)
            } @else {
              <mat-icon class="remote-icon-small">cloud</mat-icon>
              {{ embeddingsModelName }} (HuggingFace)
            }
          </p>

          @if (embedderStatus().state === 'loading') {
            <div class="progress-section">
              <mat-progress-bar mode="determinate" [value]="embedderStatus().progress"></mat-progress-bar>
              <span class="progress-text">Cargando embedder... {{ embedderStatus().progress }}%</span>
            </div>
          }

          @if (embedderStatus().state === 'ready') {
            <div class="status-ready">
              <mat-icon>check_circle</mat-icon>
              <span>Embedder listo</span>
            </div>
          }

          @if (embedderStatus().state === 'error') {
            <div class="status-error">
              <mat-icon>error</mat-icon>
              <span>{{ embedderStatus().error }}</span>
            </div>
          }

          <div class="button-group">
            <button
              mat-raised-button
              color="accent"
              (click)="loadEmbedder()"
              [disabled]="isEmbedderLoading() || embedderStatus().state === 'ready'"
            >
              <mat-icon>insights</mat-icon>
              Cargar Embedder
            </button>

            @if (embedderStatus().state === 'ready') {
              <button mat-stroked-button color="warn" (click)="unloadEmbedder()">
                <mat-icon>delete</mat-icon>
                Descargar
              </button>
            }
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Estado general -->
        <div class="overall-status">
          @if (isFullyReady()) {
            <mat-chip color="primary" highlighted>
              <mat-icon>rocket_launch</mat-icon>
              Sistema RAG Local Listo
            </mat-chip>
          } @else {
            <mat-chip>
              <mat-icon>hourglass_empty</mat-icon>
              Cargue ambos modelos para usar RAG local
            </mat-chip>
          }

          @if (chunksCount() > 0) {
            <mat-chip color="accent" highlighted>
              <mat-icon>storage</mat-icon>
              {{ chunksCount() }} chunks indexados
            </mat-chip>
          }
        </div>
      </mat-card-content>

      <mat-card-actions>
        <button
          mat-button
          color="warn"
          (click)="clearDatabase()"
          [disabled]="chunksCount() === 0"
          matTooltip="Limpiar base de datos vectorial"
        >
          <mat-icon>delete_sweep</mat-icon>
          Limpiar Base de Datos
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .model-loader-card {
      height: 100%;
    }

    .system-status {
      display: flex;
      gap: 16px;
      padding: 12px 0;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #9e9e9e;
    }

    .status-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-item.available {
      color: #4caf50;
    }

    .model-section {
      padding: 16px 0;
    }

    .model-section h4 {
      margin: 0 0 12px 0;
      color: #1976d2;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .model-info {
      font-size: 12px;
      color: #666;
      margin-bottom: 12px;
    }

    .full-width {
      width: 100%;
    }

    .model-option {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-width: 0;
    }

    .model-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .model-size {
      font-size: 11px;
      color: #666;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .recommended-icon {
      color: #ffc107;
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .local-icon {
      color: #4caf50;
      font-size: 18px;
      margin-right: 4px;
    }

    .remote-icon {
      color: #2196f3;
      font-size: 18px;
      margin-right: 4px;
    }

    .local-icon-small, .remote-icon-small {
      font-size: 14px;
      vertical-align: middle;
      margin-right: 4px;
    }

    .local-icon-small {
      color: #4caf50;
    }

    .remote-icon-small {
      color: #2196f3;
    }

    .progress-section {
      margin: 12px 0;
    }

    .progress-text {
      display: block;
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .status-ready {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4caf50;
      font-size: 13px;
      margin: 12px 0;
    }

    .status-error {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      font-size: 13px;
      margin: 12px 0;
    }

    .button-group {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .button-group button {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .overall-status {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 16px 0;
    }

    .overall-status mat-chip mat-icon {
      font-size: 16px;
    }

    mat-card-actions {
      padding: 8px 16px;
    }

    mat-divider {
      margin: 8px 0;
    }

    /* Hacer el select panel más ancho para mostrar nombres completos */
    ::ng-deep .mat-mdc-select-panel {
      min-width: 320px !important;
      max-width: 400px !important;
    }

    ::ng-deep .mat-mdc-option {
      min-height: 42px;
    }
  `]
})
export class ModelLoaderComponent implements OnInit {
  private localRAG = inject(LocalRAGService);

  // Estado
  selectedModelId: string = environment.defaultLocalModel;
  crossOriginIsolated = typeof window !== 'undefined' ? (window as any).crossOriginIsolated : false;
  webGPUAvailable = signal<boolean>(false);

  // Configuracion
  useLocalEmbeddings = (environment as any).useLocalEmbeddings ?? false;
  embeddingsModelName = EMBEDDINGS_MODEL.name;

  // Signals del servicio
  modelStatus = this.localRAG.modelStatus;
  embedderStatus = this.localRAG.embedderStatus;
  isFullyReady = this.localRAG.isFullyReady;
  availableModels = this.localRAG.availableModels;

  // Computed - separar modelos locales y remotos
  localModels = computed(() =>
    this.availableModels().filter(m => m.id.startsWith('local/'))
  );
  remoteModels = computed(() =>
    this.availableModels().filter(m => !m.id.startsWith('local/'))
  );
  isModelLoading = computed(() => this.modelStatus().state === 'loading');
  isEmbedderLoading = computed(() => this.embedderStatus().state === 'loading');
  chunksCount = inject(LocalRAGService)['indexedDB'].chunksCount;

  async ngOnInit(): Promise<void> {
    // Inicializar servicio RAG
    try {
      await this.localRAG.initialize();
    } catch (error) {
      console.error('Error inicializando LocalRAG:', error);
    }

    // Detectar WebGPU
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        this.webGPUAvailable.set(!!adapter);
      } catch {
        this.webGPUAvailable.set(false);
      }
    }
  }

  async loadModel(): Promise<void> {
    if (!this.selectedModelId) return;

    try {
      await this.localRAG.loadModel(this.selectedModelId);
    } catch (error) {
      console.error('Error cargando modelo:', error);
    }
  }

  async loadEmbedder(): Promise<void> {
    try {
      await this.localRAG.loadEmbedder();
    } catch (error) {
      console.error('Error cargando embedder:', error);
    }
  }

  unloadModel(): void {
    this.localRAG.unloadModel();
  }

  unloadEmbedder(): void {
    this.localRAG.unloadEmbedder();
  }

  async clearDatabase(): Promise<void> {
    try {
      await this.localRAG['indexedDB'].clearAll();
    } catch (error) {
      console.error('Error limpiando base de datos:', error);
    }
  }
}
