import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './core/interceptors/api.interceptor';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()), 
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(), // Habilita el uso de la API Fetch moderna (más rápida y compatible con SSR)
      withInterceptors([apiInterceptor]) // Registra nuestro interceptor (Paso 3)
    )
  ]
};
