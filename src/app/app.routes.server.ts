// src/app/app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'movie/:id',
    renderMode: RenderMode.Server, // SSR: Renderizar bajo demanda en el servidor
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender, // Pre-renderizar el resto (como la Home)
  },
];
