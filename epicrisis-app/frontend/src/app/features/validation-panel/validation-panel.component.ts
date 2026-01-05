/**
 * Componente para mostrar resultados de validación
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { EpicrisisService } from '../../core/services/epicrisis.service';

@Component({
  selector: 'app-validation-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatDividerModule
  ],
  template: `
    <mat-card class="validation-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>fact_check</mat-icon>
        <mat-card-title>Validacion Clinica</mat-card-title>
        <mat-card-subtitle>Verificacion de datos y deteccion de alucinaciones</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        @if (validationResult(); as validation) {
          <div class="validation-status">
            @if (validation.ok) {
              <div class="status-badge success">
                <mat-icon>check_circle</mat-icon>
                <span>Validacion exitosa</span>
              </div>
              <p class="status-message">
                El texto de la epicrisis cumple con todos los criterios de validacion.
                Todos los diagnosticos, procedimientos y medicamentos mencionados
                corresponden a los datos clinicos del paciente.
              </p>
            } @else {
              <div class="status-badge error">
                <mat-icon>error</mat-icon>
                <span>{{ validation.violations.length }} violacion(es) detectada(s)</span>
              </div>
              <p class="status-message">
                Se detectaron menciones que no corresponden a los datos clinicos registrados.
                Se recomienda regenerar la epicrisis o corregir manualmente.
              </p>
            }
          </div>

          @if (!validation.ok && validation.violations.length > 0) {
            <mat-divider></mat-divider>

            <div class="violations-section">
              <h4>Violaciones Detectadas</h4>
              <mat-list>
                @for (violation of validation.violations; track violation.mention) {
                  <mat-list-item class="violation-item">
                    <mat-icon matListItemIcon color="warn">warning</mat-icon>
                    <div matListItemTitle class="violation-title">
                      <span class="violation-type">{{ getViolationType(violation.type) }}:</span>
                      <code class="violation-mention">{{ violation.mention }}</code>
                    </div>
                    <div matListItemLine class="violation-reason">
                      {{ violation.reason }}
                    </div>
                  </mat-list-item>
                }
              </mat-list>
            </div>
          }

          @if (validation.warnings && validation.warnings.length > 0) {
            <mat-divider></mat-divider>

            <div class="warnings-section">
              <h4>Advertencias</h4>
              <mat-list>
                @for (warning of validation.warnings; track warning) {
                  <mat-list-item class="warning-item">
                    <mat-icon matListItemIcon color="accent">info</mat-icon>
                    <div matListItemTitle>{{ warning }}</div>
                  </mat-list-item>
                }
              </mat-list>
            </div>
          }
        } @else {
          <div class="empty-state">
            <mat-icon>rule</mat-icon>
            <p>La validacion se ejecutara automaticamente al generar la epicrisis</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .validation-card {
      margin-bottom: 24px;
    }

    .validation-status {
      padding: 16px 0;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 500;
      font-size: 14px;
    }

    .status-badge.success {
      background-color: #4caf50;
      color: white;
    }

    .status-badge.error {
      background-color: #f44336;
      color: white;
    }

    .status-badge mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .status-message {
      margin-top: 12px;
      color: #666;
      line-height: 1.5;
    }

    .violations-section,
    .warnings-section {
      padding-top: 16px;
    }

    .violations-section h4,
    .warnings-section h4 {
      color: #f44336;
      margin-bottom: 8px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .warnings-section h4 {
      color: #ff9800;
    }

    .violation-item {
      border-left: 4px solid #f44336;
      background-color: rgba(244, 67, 54, 0.05);
      margin-bottom: 8px;
      border-radius: 0 4px 4px 0;
    }

    .warning-item {
      border-left: 4px solid #ff9800;
      background-color: rgba(255, 152, 0, 0.05);
      margin-bottom: 8px;
      border-radius: 0 4px 4px 0;
    }

    .violation-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .violation-type {
      font-weight: 500;
      color: #f44336;
    }

    .violation-mention {
      font-family: 'Consolas', 'Monaco', monospace;
      background-color: rgba(0, 0, 0, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .violation-reason {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: #757575;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #bdbdbd;
    }

    .empty-state p {
      margin-top: 12px;
    }

    mat-divider {
      margin: 16px 0;
    }
  `]
})
export class ValidationPanelComponent {
  private epicrisisService = inject(EpicrisisService);

  validationResult = this.epicrisisService.validationResult;

  getViolationType(type: string): string {
    const types: Record<string, string> = {
      'dx': 'Diagnostico',
      'proc': 'Procedimiento',
      'med': 'Medicamento'
    };
    return types[type] || type;
  }
}
