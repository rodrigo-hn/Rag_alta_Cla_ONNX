/**
 * Componente de búsqueda de episodios
 */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { EpicrisisService } from '../../core/services/epicrisis.service';

@Component({
  selector: 'app-episode-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <mat-card class="search-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>search</mat-icon>
        <mat-card-title>Buscar Episodio de Hospitalizacion</mat-card-title>
        <mat-card-subtitle>Ingrese el ID del episodio para cargar los datos clinicos</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="search-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>ID de Episodio</mat-label>
            <input
              matInput
              [(ngModel)]="episodeIdInput"
              placeholder="Ej: 12345"
              (keyup.enter)="searchEpisode()"
              [disabled]="isLoading()"
            />
            <mat-icon matSuffix>badge</mat-icon>
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            (click)="searchEpisode()"
            [disabled]="!episodeIdInput() || isLoading()"
            class="search-button"
          >
            @if (isLoading()) {
              <mat-spinner diameter="20"></mat-spinner>
              <span>Buscando...</span>
            } @else {
              <ng-container>
                <mat-icon>search</mat-icon>
                <span>Buscar Episodio</span>
              </ng-container>
            }
          </button>
        </div>

        @if (errorMessage()) {
          <div class="error-message">
            <mat-icon>error</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        @if (patientInfo()) {
          <div class="patient-info">
            <h3>Datos del Paciente</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Nombre:</span>
                <span class="value">{{ patientInfo()?.nombre }}</span>
              </div>
              <div class="info-item">
                <span class="label">RUT:</span>
                <span class="value">{{ patientInfo()?.rut }}</span>
              </div>
              <div class="info-item">
                <span class="label">Fecha Nacimiento:</span>
                <span class="value">{{ patientInfo()?.fechaNacimiento }}</span>
              </div>
              <div class="info-item">
                <span class="label">N Episodio:</span>
                <span class="value">{{ epicrisisService.episodeId() }}</span>
              </div>
            </div>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .search-card {
      margin-bottom: 24px;
    }

    .search-form {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-top: 16px;
    }

    .full-width {
      flex: 1;
    }

    .search-button {
      height: 56px;
      min-width: 180px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      margin-top: 16px;
      padding: 12px;
      border: 1px solid #f44336;
      border-radius: 4px;
      background-color: #ffebee;
    }

    .patient-info {
      margin-top: 24px;
      padding: 16px;
      background-color: #e3f2fd;
      border-radius: 8px;
      border-left: 4px solid #1976d2;
    }

    .patient-info h3 {
      margin: 0 0 12px 0;
      color: #1565c0;
      font-size: 16px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }

    .info-item .value {
      font-size: 14px;
      font-weight: 500;
    }

    @media (max-width: 600px) {
      .search-form {
        flex-direction: column;
      }

      .search-button {
        width: 100%;
      }
    }
  `]
})
export class EpisodeSearchComponent {
  epicrisisService = inject(EpicrisisService);

  episodeIdInput = signal<string>('');
  isLoading = this.epicrisisService.isLoading;
  errorMessage = this.epicrisisService.errorMessage;
  patientInfo = this.epicrisisService.patientInfo;

  searchEpisode(): void {
    const id = this.episodeIdInput().trim();
    if (!id) return;

    this.epicrisisService.getEpisodeData(id).subscribe({
      next: () => {
        // Datos cargados exitosamente
      },
      error: (error) => {
        this.epicrisisService.setError(error.message || 'Error al buscar el episodio');
      }
    });
  }
}
