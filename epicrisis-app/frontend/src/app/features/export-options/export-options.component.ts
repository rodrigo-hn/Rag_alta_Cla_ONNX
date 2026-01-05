/**
 * Componente para opciones de exportación
 */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EpicrisisService } from '../../core/services/epicrisis.service';

@Component({
  selector: 'app-export-options',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <mat-card class="export-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>download</mat-icon>
        <mat-card-title>Exportar Documento</mat-card-title>
        <mat-card-subtitle>Descargue la epicrisis en formato PDF o Word</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        @if (hasEpicrisis()) {
          <div class="export-buttons">
            <button
              mat-raised-button
              color="primary"
              (click)="exportToPDF()"
              [disabled]="isExporting()"
            >
              @if (isExporting() && exportType() === 'pdf') {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>picture_as_pdf</mat-icon>
              }
              <span>Exportar a PDF</span>
            </button>

            <button
              mat-raised-button
              color="accent"
              (click)="exportToWord()"
              [disabled]="isExporting()"
            >
              @if (isExporting() && exportType() === 'word') {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>description</mat-icon>
              }
              <span>Exportar a Word</span>
            </button>

            <button
              mat-stroked-button
              (click)="copyToClipboard()"
            >
              <mat-icon>content_copy</mat-icon>
              <span>Copiar al Portapapeles</span>
            </button>
          </div>

          <div class="export-info">
            <mat-icon>info</mat-icon>
            <span>
              Los documentos exportados incluyen la informacion del paciente,
              fecha de generacion y el texto completo de la epicrisis.
            </span>
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon>cloud_download</mat-icon>
            <p>Genere una epicrisis para poder exportarla</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .export-card {
      margin-bottom: 24px;
    }

    .export-buttons {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      padding: 16px 0;
    }

    .export-buttons button {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 180px;
    }

    .export-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background-color: #e3f2fd;
      border-radius: 8px;
      margin-top: 16px;
    }

    .export-info mat-icon {
      color: #1976d2;
      flex-shrink: 0;
    }

    .export-info span {
      font-size: 13px;
      color: #1565c0;
      line-height: 1.5;
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

    @media (max-width: 600px) {
      .export-buttons {
        flex-direction: column;
      }

      .export-buttons button {
        width: 100%;
      }
    }
  `]
})
export class ExportOptionsComponent {
  private epicrisisService = inject(EpicrisisService);
  private snackBar = inject(MatSnackBar);

  hasEpicrisis = this.epicrisisService.hasEpicrisis;
  epicrisisText = this.epicrisisService.epicrisisText;

  isExporting = signal<boolean>(false);
  exportType = signal<'pdf' | 'word' | null>(null);

  exportToPDF(): void {
    this.isExporting.set(true);
    this.exportType.set('pdf');

    this.epicrisisService.exportToPDF().subscribe({
      next: (blob) => {
        this.downloadFile(blob, 'epicrisis.pdf', 'application/pdf');
        this.showSuccess('PDF exportado correctamente');
      },
      error: (error) => {
        this.showError(error.message || 'Error al exportar PDF');
      },
      complete: () => {
        this.isExporting.set(false);
        this.exportType.set(null);
      }
    });
  }

  exportToWord(): void {
    this.isExporting.set(true);
    this.exportType.set('word');

    this.epicrisisService.exportToWord().subscribe({
      next: (blob) => {
        this.downloadFile(
          blob,
          'epicrisis.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        this.showSuccess('Documento Word exportado correctamente');
      },
      error: (error) => {
        this.showError(error.message || 'Error al exportar Word');
      },
      complete: () => {
        this.isExporting.set(false);
        this.exportType.set(null);
      }
    });
  }

  copyToClipboard(): void {
    const text = this.epicrisisText();
    if (!text) return;

    navigator.clipboard.writeText(text).then(
      () => {
        this.showSuccess('Texto copiado al portapapeles');
      },
      () => {
        this.showError('Error al copiar al portapapeles');
      }
    );
  }

  private downloadFile(blob: Blob, filename: string, mimeType: string): void {
    const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
