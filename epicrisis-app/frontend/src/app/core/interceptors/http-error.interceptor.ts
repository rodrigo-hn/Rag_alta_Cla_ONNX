/**
 * Interceptor para manejo global de errores HTTP
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Error desconocido';

      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error de red: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        switch (error.status) {
          case 0:
            errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión.';
            break;
          case 400:
            errorMessage = error.error?.error || 'Solicitud inválida';
            break;
          case 401:
            errorMessage = 'No autorizado';
            break;
          case 403:
            errorMessage = 'Acceso denegado';
            break;
          case 404:
            errorMessage = error.error?.error || 'Recurso no encontrado';
            break;
          case 500:
            errorMessage = 'Error interno del servidor';
            break;
          default:
            errorMessage = `Error ${error.status}: ${error.message}`;
        }
      }

      console.error('HTTP Error:', error);
      return throwError(() => new Error(errorMessage));
    })
  );
};
