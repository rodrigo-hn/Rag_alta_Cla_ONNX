/**
 * Componente para alternar entre generacion remota y local
 */
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { GenerationModeService } from '../../core/services/generation-mode.service';
import { LocalRAGService } from '../../core/services/local-rag.service';
import { GenerationMode } from '../../core/models/rag.types';

@Component({
  selector: 'app-generation-mode',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
    <div class="generation-mode-container">
      <mat-button-toggle-group
        [value]="currentMode()"
        (change)="onModeChange($event.value)"
        [disabled]="!canSwitchToLocal() && currentMode() === 'remote'"
      >
        <mat-button-toggle
          value="remote"
          matTooltip="Usar servidor backend con LLM remoto"
        >
          <mat-icon>cloud</mat-icon>
          <span>Remoto</span>
        </mat-button-toggle>

        <mat-button-toggle
          value="local"
          [disabled]="!canSwitchToLocal()"
          [matTooltip]="!canSwitchToLocal() ? 'Cargue los modelos ONNX primero' : 'Usar modelos ONNX en el navegador'"
        >
          <mat-icon>computer</mat-icon>
          <span>Local</span>
        </mat-button-toggle>
      </mat-button-toggle-group>

      <div class="mode-info">
        @if (currentMode() === 'remote') {
          <mat-chip>
            <mat-icon>cloud_done</mat-icon>
            Backend API
          </mat-chip>
        } @else {
          <mat-chip color="accent" highlighted>
            <mat-icon>memory</mat-icon>
            {{ modelName() }}
          </mat-chip>
        }
      </div>
    </div>
  `,
  styles: [`
    .generation-mode-container {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }

    mat-button-toggle-group {
      border-radius: 8px;
    }

    mat-button-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    mat-button-toggle mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .mode-info {
      display: flex;
      align-items: center;
    }

    .mode-info mat-chip mat-icon {
      font-size: 14px;
    }
  `]
})
export class GenerationModeComponent {
  private modeService = inject(GenerationModeService);
  private localRAG = inject(LocalRAGService);

  currentMode = this.modeService.currentMode;
  canSwitchToLocal = this.localRAG.isFullyReady;

  modelName = computed(() => {
    const status = this.localRAG.modelStatus();
    if (status.modelId) {
      // Extraer nombre corto del modelo
      const parts = status.modelId.split('/');
      return parts[parts.length - 1] || 'Modelo Local';
    }
    return 'Modelo Local';
  });

  onModeChange(mode: GenerationMode): void {
    this.modeService.setMode(mode);
  }
}
