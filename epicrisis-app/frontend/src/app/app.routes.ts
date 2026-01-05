/**
 * Rutas de la aplicación
 */
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'epicrisis',
    pathMatch: 'full'
  },
  {
    path: 'epicrisis',
    loadComponent: () => import('./app.component').then(m => m.AppComponent)
  },
  {
    path: '**',
    redirectTo: 'epicrisis'
  }
];
