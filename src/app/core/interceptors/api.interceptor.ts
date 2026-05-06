import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Verificamos si la petición va dirigida a TMDB
  if (req.url.includes('api.themoviedb.org')) {
    // 2. Clonamos la petición (son inmutables) y le añadimos parámetros
    const apiReq = req.clone({
      setParams: {
        api_key: environment.tmdbApiKey,
        language: 'es-ES' // Configuramos el idioma globalmente
      }
    });
    return next(apiReq); // 3. Enviamos la petición modificada
  }
  return next(req); // Si no es de TMDB, la dejamos pasar normal
};
