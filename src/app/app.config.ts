import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './core/interceptors/api.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({
        onViewTransitionCreated: ({ transition, from, to }) => {
          // Si es navegación hacia atrás, cancelamos el view transition
          // y dejamos que nuestra animación CSS tome el control
        }
      }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ), 
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(), // Habilita el uso de la API Fetch moderna (más rápida y compatible con SSR)
      withInterceptors([apiInterceptor, errorInterceptor]) // Registra nuestros interceptores
    )
  ]
};
