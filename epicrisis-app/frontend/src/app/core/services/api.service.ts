/**
 * Servicio base para comunicación con API
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * Realiza una petición GET
   */
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Realiza una petición POST
   */
  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Realiza una petición POST que retorna Blob (para exportar)
   */
  postBlob(endpoint: string, body: unknown): Observable<Blob> {
    return this.http.post(`${this.baseUrl}${endpoint}`, body, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Maneja errores de HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor';
      } else if (error.status === 404) {
        errorMessage = 'Recurso no encontrado';
      } else if (error.status === 500) {
        errorMessage = 'Error interno del servidor';
      } else {
        errorMessage = error.error?.error || `Error ${error.status}`;
      }
    }

    console.error('API Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
