/**
 * Configuración de la aplicación Angular
 * Usando características modernas de Angular 21:
 * - Zoneless change detection
 * - Standalone components
 * - Functional interceptors
 */
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21: Zoneless change detection para mejor rendimiento
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([httpErrorInterceptor])
    ),
    provideAnimations()
  ]
};
