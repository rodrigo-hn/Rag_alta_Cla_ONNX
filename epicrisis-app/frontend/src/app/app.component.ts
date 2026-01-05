/**
 * Componente principal de la aplicación
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { EpisodeSearchComponent } from './features/episode-search/episode-search.component';
import { JsonViewerComponent } from './features/json-viewer/json-viewer.component';
import { EpicrisisGeneratorComponent } from './features/epicrisis-generator/epicrisis-generator.component';
import { ValidationPanelComponent } from './features/validation-panel/validation-panel.component';
import { ExportOptionsComponent } from './features/export-options/export-options.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    EpisodeSearchComponent,
    JsonViewerComponent,
    EpicrisisGeneratorComponent,
    ValidationPanelComponent,
    ExportOptionsComponent
  ],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <mat-icon class="app-logo">local_hospital</mat-icon>
      <span class="app-title">Sistema de Epicrisis Automatica</span>
      <span class="spacer"></span>
      <button mat-icon-button aria-label="Ayuda">
        <mat-icon>help_outline</mat-icon>
      </button>
    </mat-toolbar>

    <div class="app-container">
      <main class="main-content">
        <!-- Búsqueda de episodio -->
        <app-episode-search></app-episode-search>

        <!-- Grid de dos columnas -->
        <div class="two-column-grid">
          <!-- Columna izquierda: Datos clínicos -->
          <app-json-viewer></app-json-viewer>

          <!-- Columna derecha: Epicrisis generada -->
          <app-epicrisis-generator></app-epicrisis-generator>
        </div>

        <!-- Panel de validación -->
        <app-validation-panel></app-validation-panel>

        <!-- Opciones de exportación -->
        <app-export-options></app-export-options>
      </main>

      <footer class="app-footer">
        <p>Sistema de Epicrisis Automatica - Procesamiento 100% Local</p>
        <p class="footer-note">Los datos clinicos nunca salen del servidor local</p>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .app-logo {
      margin-right: 12px;
    }

    .app-title {
      font-size: 20px;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .app-container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .main-content {
      flex: 1;
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      width: 100%;
      box-sizing: border-box;
    }

    .two-column-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .app-footer {
      background-color: #263238;
      color: white;
      text-align: center;
      padding: 24px;
      margin-top: auto;
    }

    .app-footer p {
      margin: 0;
      font-size: 14px;
    }

    .footer-note {
      margin-top: 8px !important;
      font-size: 12px !important;
      color: rgba(255, 255, 255, 0.7);
    }

    @media (max-width: 1024px) {
      .two-column-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .main-content {
        padding: 16px;
      }

      .app-title {
        font-size: 16px;
      }
    }
  `]
})
export class AppComponent {
  title = 'Sistema de Epicrisis Automatica';
}
