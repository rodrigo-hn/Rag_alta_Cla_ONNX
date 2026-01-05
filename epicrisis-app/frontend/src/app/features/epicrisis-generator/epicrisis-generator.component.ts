/**
 * Componente para generar y mostrar epicrisis
 */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EpicrisisService } from '../../core/services/epicrisis.service';

@Component({
  selector: 'app-epicrisis-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule
  ],
  template: `
    <mat-card class="generator-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>auto_awesome</mat-icon>
        <mat-card-title>Epicrisis Generada</mat-card-title>
        <mat-card-subtitle>Informe de alta hospitalaria automatico</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        @if (hasData()) {
          @if (!hasEpicrisis()) {
            <div class="empty-state">
              <mat-icon>article</mat-icon>
              <p>Presione el boton para generar la epicrisis automaticamente</p>
            </div>
          } @else {
            <div class="epicrisis-container">
              @if (isEditing()) {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Editar Epicrisis</mat-label>
                  <textarea
                    matInput
                    [value]="epicrisisText()"
                    (input)="onTextChange($event)"
                    rows="12"
                    placeholder="Edite el texto de la epicrisis..."
                  ></textarea>
                  <mat-hint>Puede editar el texto manualmente. La validacion se actualizara.</mat-hint>
                </mat-form-field>
              } @else {
                <div class="epicrisis-text">
                  {{ epicrisisText() }}
                </div>
              }
            </div>
          }
        } @else {
          <div class="empty-state">
            <mat-icon>info</mat-icon>
            <p>Busque un episodio para comenzar</p>
          </div>
        }
      </mat-card-content>

      <mat-card-actions>
        @if (hasData()) {
          <button
            mat-raised-button
            color="primary"
            (click)="generate()"
            [disabled]="isLoading()"
          >
            @if (isLoading()) {
              <mat-spinner diameter="20"></mat-spinner>
              <span>Generando...</span>
            } @else {
              <ng-container>
                <mat-icon>auto_awesome</mat-icon>
                <span>Generar Epicrisis</span>
              </ng-container>
            }
          </button>

          @if (hasEpicrisis()) {
            <button
              mat-stroked-button
              (click)="regenerate()"
              [disabled]="isLoading()"
              matTooltip="Regenerar con correccion de violaciones"
            >
              <mat-icon>refresh</mat-icon>
              <span>Regenerar</span>
            </button>

            <button
              mat-stroked-button
              (click)="toggleEdit()"
              [class.active]="isEditing()"
            >
              <mat-icon>{{ isEditing() ? 'done' : 'edit' }}</mat-icon>
              <span>{{ isEditing() ? 'Terminar Edicion' : 'Editar' }}</span>
            </button>

            <button
              mat-stroked-button
              (click)="validate()"
              [disabled]="isLoading()"
              matTooltip="Validar texto contra datos clinicos"
            >
              <mat-icon>fact_check</mat-icon>
              <span>Validar</span>
            </button>
          }
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .generator-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    mat-card-content {
      flex: 1;
      overflow: hidden;
    }

    .epicrisis-container {
      height: 100%;
    }

    .epicrisis-text {
      padding: 20px;
      background-color: #fafafa;
      border-radius: 8px;
      line-height: 1.8;
      font-size: 14px;
      min-height: 250px;
      max-height: 400px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      border: 1px solid #e0e0e0;
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

    .empty-state p {
      margin-top: 16px;
      font-size: 16px;
    }

    mat-card-actions {
      display: flex;
      gap: 12px;
      padding: 16px;
      flex-wrap: wrap;
    }

    mat-card-actions button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    mat-card-actions button.active {
      background-color: #e3f2fd;
    }

    .full-width {
      width: 100%;
    }

    textarea {
      font-family: inherit;
      line-height: 1.6;
    }
  `]
})
export class EpicrisisGeneratorComponent {
  private epicrisisService = inject(EpicrisisService);

  clinicalData = this.epicrisisService.clinicalData;
  epicrisisText = this.epicrisisService.epicrisisText;
  isLoading = this.epicrisisService.isLoading;
  hasData = this.epicrisisService.hasData;
  hasEpicrisis = this.epicrisisService.hasEpicrisis;

  // Signal para estado de edición
  isEditing = signal<boolean>(false);

  generate(): void {
    this.epicrisisService.generateEpicrisis().subscribe({
      error: (error) => {
        this.epicrisisService.setError(error.message || 'Error al generar epicrisis');
      }
    });
  }

  regenerate(): void {
    this.epicrisisService.regenerateEpicrisis().subscribe({
      error: (error) => {
        this.epicrisisService.setError(error.message || 'Error al regenerar epicrisis');
      }
    });
  }

  validate(): void {
    this.epicrisisService.validateEpicrisis().subscribe({
      error: (error) => {
        this.epicrisisService.setError(error.message || 'Error al validar epicrisis');
      }
    });
  }

  toggleEdit(): void {
    this.isEditing.update(value => !value);
  }

  onTextChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.epicrisisService.updateEpicrisisText(target.value);
  }
}
