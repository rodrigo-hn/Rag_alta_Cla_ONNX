/**
 * Componente para visualizar JSON clínico
 */
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { EpicrisisService } from '../../core/services/epicrisis.service';

@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatExpansionModule
  ],
  template: `
    <mat-card class="json-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>description</mat-icon>
        <mat-card-title>Datos Clinicos</mat-card-title>
        <mat-card-subtitle>Informacion del episodio de hospitalizacion</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        @if (hasData()) {
          <mat-tab-group>
            <!-- Tab Resumen -->
            <mat-tab label="Resumen">
              <div class="tab-content">
                <!-- Motivo de ingreso -->
                <div class="section">
                  <h4>Motivo de Ingreso</h4>
                  <p>{{ clinicalData()?.motivo_ingreso || 'No consignado' }}</p>
                </div>

                <!-- Diagnósticos de ingreso -->
                <div class="section">
                  <h4>Diagnosticos de Ingreso</h4>
                  @if (clinicalData()?.diagnostico_ingreso?.length) {
                    <div class="chips-container">
                      @for (dx of clinicalData()?.diagnostico_ingreso; track $index) {
                        <mat-chip>{{ dx.nombre }} ({{ dx.codigo }})</mat-chip>
                      }
                    </div>
                  } @else {
                    <p class="no-data">No consignado</p>
                  }
                </div>

                <!-- Diagnósticos de egreso -->
                <div class="section">
                  <h4>Diagnosticos de Egreso</h4>
                  @if (clinicalData()?.diagnostico_egreso?.length) {
                    <div class="chips-container">
                      @for (dx of clinicalData()?.diagnostico_egreso; track $index) {
                        <mat-chip color="primary" highlighted>{{ dx.nombre }} ({{ dx.codigo }})</mat-chip>
                      }
                    </div>
                  } @else {
                    <p class="no-data">No consignado</p>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- Tab Procedimientos -->
            <mat-tab label="Procedimientos">
              <div class="tab-content">
                @if (clinicalData()?.procedimientos?.length) {
                  <mat-accordion>
                    @for (proc of clinicalData()?.procedimientos; track $index) {
                      <mat-expansion-panel>
                        <mat-expansion-panel-header>
                          <mat-panel-title>{{ proc.nombre }}</mat-panel-title>
                          <mat-panel-description>{{ proc.fecha }}</mat-panel-description>
                        </mat-expansion-panel-header>
                        <p><strong>Codigo:</strong> {{ proc.codigo }}</p>
                      </mat-expansion-panel>
                    }
                  </mat-accordion>
                } @else {
                  <div class="empty-state">
                    <mat-icon>medical_services</mat-icon>
                    <p>No hay procedimientos registrados</p>
                  </div>
                }
              </div>
            </mat-tab>

            <!-- Tab Medicamentos -->
            <mat-tab label="Medicamentos">
              <div class="tab-content">
                <h4>Tratamientos Intrahospitalarios</h4>
                @if (clinicalData()?.tratamientos_intrahosp?.length) {
                  <div class="med-list">
                    @for (med of clinicalData()?.tratamientos_intrahosp; track $index) {
                      <div class="med-item">
                        <span class="med-name">{{ med.nombre }}</span>
                        <span class="med-details">{{ med.dosis }} {{ med.via }} {{ med.frecuencia }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="no-data">No consignado</p>
                }

                <h4>Medicamentos al Alta</h4>
                @if (clinicalData()?.indicaciones_alta?.medicamentos?.length) {
                  <div class="med-list">
                    @for (med of clinicalData()?.indicaciones_alta?.medicamentos; track $index) {
                      <div class="med-item highlighted">
                        <span class="med-name">{{ med.nombre }} ({{ med.codigo }})</span>
                        <span class="med-details">
                          {{ med.dosis }} {{ med.via }} {{ med.frecuencia }}
                          @if (med.duracion) {
                            por {{ med.duracion }}
                          }
                        </span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="no-data">No consignado</p>
                }
              </div>
            </mat-tab>

            <!-- Tab Evolución -->
            <mat-tab label="Evolucion">
              <div class="tab-content">
                @if (clinicalData()?.evolucion?.length) {
                  <div class="timeline">
                    @for (ev of clinicalData()?.evolucion; track $index) {
                      <div class="timeline-item">
                        <div class="timeline-date">{{ ev.fecha }}</div>
                        <div class="timeline-content">
                          <p>{{ ev.nota }}</p>
                          @if (ev.profesional) {
                            <span class="professional">- {{ ev.profesional }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="empty-state">
                    <mat-icon>history</mat-icon>
                    <p>No hay notas de evolucion</p>
                  </div>
                }
              </div>
            </mat-tab>

            <!-- Tab Laboratorios -->
            <mat-tab label="Laboratorios">
              <div class="tab-content">
                @if (clinicalData()?.laboratorios_relevantes?.length) {
                  <table class="labs-table">
                    <thead>
                      <tr>
                        <th>Parametro</th>
                        <th>Valor</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (lab of clinicalData()?.laboratorios_relevantes; track $index) {
                        <tr>
                          <td>{{ lab.parametro }}</td>
                          <td>{{ lab.valor }}</td>
                          <td>{{ lab.fecha }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else {
                  <div class="empty-state">
                    <mat-icon>science</mat-icon>
                    <p>No hay laboratorios relevantes</p>
                  </div>
                }
              </div>
            </mat-tab>

            <!-- Tab JSON Raw -->
            <mat-tab label="JSON">
              <div class="tab-content">
                <pre class="json-raw">{{ jsonPretty() }}</pre>
              </div>
            </mat-tab>
          </mat-tab-group>
        } @else {
          <div class="empty-state">
            <mat-icon>folder_open</mat-icon>
            <p>Busque un episodio para ver los datos clinicos</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .json-card {
      height: 100%;
    }

    .tab-content {
      padding: 16px 0;
      max-height: 500px;
      overflow-y: auto;
    }

    .section {
      margin-bottom: 20px;
    }

    .section h4 {
      color: #1976d2;
      margin-bottom: 8px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .no-data {
      color: #757575;
      font-style: italic;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #757575;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bdbdbd;
    }

    .med-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
    }

    .med-item {
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
      border-left: 3px solid #9e9e9e;
    }

    .med-item.highlighted {
      background-color: #e3f2fd;
      border-left-color: #1976d2;
    }

    .med-name {
      display: block;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .med-details {
      font-size: 12px;
      color: #666;
    }

    .timeline {
      position: relative;
      padding-left: 24px;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: #e0e0e0;
    }

    .timeline-item {
      position: relative;
      padding-bottom: 20px;
    }

    .timeline-item::before {
      content: '';
      position: absolute;
      left: -21px;
      top: 6px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: #1976d2;
    }

    .timeline-date {
      font-size: 12px;
      color: #1976d2;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .timeline-content p {
      margin: 0;
      line-height: 1.5;
    }

    .professional {
      font-size: 12px;
      color: #666;
      font-style: italic;
    }

    .labs-table {
      width: 100%;
      border-collapse: collapse;
    }

    .labs-table th,
    .labs-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    .labs-table th {
      background-color: #f5f5f5;
      font-weight: 500;
      color: #333;
    }

    .labs-table tr:hover {
      background-color: #fafafa;
    }

    .json-raw {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11px;
      background-color: #263238;
      color: #aabbc3;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      max-height: 400px;
    }
  `]
})
export class JsonViewerComponent {
  private epicrisisService = inject(EpicrisisService);

  clinicalData = this.epicrisisService.clinicalData;
  hasData = this.epicrisisService.hasData;

  jsonPretty = computed(() => {
    const data = this.clinicalData();
    return data ? JSON.stringify(data, null, 2) : '';
  });
}
