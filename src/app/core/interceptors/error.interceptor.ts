import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ha ocurrido un error inesperado.';
      
      // Analizamos si es error de red (cliente) o de servidor (404, 500, 401)
      if (typeof ErrorEvent !== 'undefined' && error.error instanceof ErrorEvent) {
        errorMessage = `Error de red: ${error.error.message}`;
      } else {
        switch (error.status) {
          case 400:
            errorMessage = 'Petición incorrecta (400).';
            break;
          case 401:
            errorMessage = 'No autorizado (401). Verifica tu API Key.';
            break;
          case 403:
            errorMessage = 'Acceso denegado (403).';
            break;
          case 404:
            errorMessage = 'Recurso no encontrado (404).';
            break;
          case 500:
            errorMessage = 'Error interno del servidor (500).';
            break;
          default:
            errorMessage = `Error del servidor (${error.status}): ${error.message}`;
        }
      }
      
      console.error('Error Interceptado:', errorMessage);
      return throwError(() => new Error(errorMessage));
    })
  );
};
