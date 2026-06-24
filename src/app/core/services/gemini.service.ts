import { Injectable, inject, signal, computed, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MovieService } from './movie.service';
import { Movie } from '../models/movie.model';
import { environment } from '../../../environments/environment';

// ─── Tipos del chat ────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;               // Texto con Markdown
  movies?: Movie[];              // Películas encontradas en TMDB para el carrusel
  timestamp: Date;
  isError?: boolean;             // Flag para identificar mensajes de error
}

interface GeminiResponse {
  text: string;
  movies: string[];              // Títulos exactos que la IA menciona
}

// ─── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private http        = inject(HttpClient);
  private movieSvc    = inject(MovieService);

  /** Historial completo del chat (incluye mensajes de usuario y asistente) */
  readonly messages   = signal<ChatMessage[]>([]);

  /** true mientras se espera respuesta de la IA */
  readonly isLoading  = signal(false);

  /** true si hubo un error en la última llamada */
  readonly hasError   = signal(false);

  /** Cantidad de mensajes — útil para la badge del botón FAB */
  readonly messageCount = computed(() => this.messages().length);

  // ── Mensaje de bienvenida ──────────────────────────────────────────────────

  constructor() {
    this.messages.set([
      {
        role: 'assistant',
        content:
          '¡Hola! Soy **Nexus AI**, tu asistente cinematográfico 🎬\n\n' +
          'Puedo recomendarte películas, contarte sobre directores, géneros, ' +
          'o simplemente charlar de cine. ¿De qué quieres hablar hoy?',
        movies: [],
        timestamp: new Date(),
      },
    ]);
  }

  // ── Enviar mensaje ─────────────────────────────────────────────────────────

  async sendMessage(userText: string): Promise<void> {
    if (!userText.trim() || this.isLoading()) return;

    // 1. Agregar el mensaje del usuario al historial
    const userMessage: ChatMessage = {
      role: 'user',
      content: userText.trim(),
      timestamp: new Date(),
    };
    this.messages.update(msgs => [...msgs, userMessage]);
    this.isLoading.set(true);
    this.hasError.set(false);

    // 2. Preparar el historial para el backend (sin el mensaje de bienvenida)
    const history = this.messages()
      .slice(1)                            // Omitir bienvenida
      .slice(0, -1)                        // Omitir el mensaje recién agregado
      .map(m => ({ role: m.role, content: m.content }));

    try {
      let geminiResp: GeminiResponse;

      // 3. En desarrollo local (ng serve) saltamos el proxy y llamamos directo
      if (isDevMode()) {
        const apiKey = environment.geminiApiKey;
        if (!apiKey) throw new Error('API Key faltante en environment.development.ts');

        const SYSTEM_INSTRUCTION = `Eres Nexus AI, el asistente cinematográfico de MovieNexus.
Tu personalidad es la de un crítico de cine apasionado, culto y amigable.
Conoces el cine mundial a profundidad: clásicos, blockbusters, cine de autor, series y documentales.

REGLAS ESTRICTAS:
1. Siempre responde en el mismo idioma que el usuario te escriba (español o inglés).
2. Cuando menciones o recomiendes películas, SIEMPRE incluye sus títulos exactos en el campo "movies".
3. Tu respuesta DEBE ser un JSON válido con exactamente este formato:
{
  "text": "Tu respuesta en texto con formato Markdown (usa **negritas**, *cursivas*, listas con - )",
  "movies": ["Título Exacto 1", "Título Exacto 2"]
}
4. Si no mencionas películas, devuelve "movies": [].
5. El campo "text" puede contener Markdown pero NO etiquetas HTML.
6. Nunca salgas del rol cinematográfico.
7. Limita tus recomendaciones a máximo 5 películas por respuesta para no saturar al usuario.`;

        const contents = [
          ...history.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          })),
          { role: 'user', parts: [{ text: userText.trim() }] }
        ];

        const payload = {
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig: { temperature: 0.8, topP: 0.95, maxOutputTokens: 1500, responseMimeType: 'application/json' },
        };

        const res = await firstValueFrom(
          this.http.post<any>(
            `/gemini-api/v1beta/models/gemini-3.1-pro:generateContent?key=${apiKey}`,
            payload
          )
        );

        const rawText = res?.candidates?.[0]?.content?.parts?.[0]?.text;
        try {
          geminiResp = JSON.parse(rawText || '{}');
          if (!geminiResp.text) geminiResp = { text: rawText, movies: [] };
        } catch {
          geminiResp = { text: rawText || '', movies: [] };
        }
      } else {
        // En producción (Vercel), usamos el proxy seguro /api/chat
        geminiResp = await firstValueFrom(
          this.http.post<GeminiResponse>('/api/chat', {
            history,
            message: userText.trim(),
          })
        );
      }

      // 4. Buscar cada película mencionada en TMDB
      const movies = await this.fetchMoviesFromTmdb(geminiResp.movies ?? []);

      // 5. Agregar respuesta de la IA al historial
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: geminiResp.text ?? '(Sin respuesta)',
        movies,
        timestamp: new Date(),
      };
      this.messages.update(msgs => [...msgs, assistantMessage]);

    } catch (err: any) {
      console.error('[GeminiService] Error de API:', err);
      this.hasError.set(true);
      
      const errorDetail = err?.error?.error?.message || err?.message || 'Error desconocido';

      this.messages.update(msgs => [
        ...msgs,
        {
          role: 'assistant',
          content: '❌ Ocurrió un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
          movies: [],
          timestamp: new Date(),
          isError: true
        },
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Limpiar historial ──────────────────────────────────────────────────────

  clearHistory(): void {
    this.messages.set([
      {
        role: 'assistant',
        content:
          '¡Conversación reiniciada! Soy **Nexus AI** 🎬 ¿De qué película quieres hablar?',
        movies: [],
        timestamp: new Date(),
      },
    ]);
    this.hasError.set(false);
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  /**
   * Para cada título de película que Gemini menciona,
   * busca en TMDB y retorna el primer resultado (con poster_path).
   */
  private async fetchMoviesFromTmdb(titles: string[]): Promise<Movie[]> {
    if (!titles || titles.length === 0) return [];

    const results: Movie[] = [];

    for (const title of titles.slice(0, 5)) {
      try {
        const resp = await firstValueFrom(this.movieSvc.searchMovies(title));
        const found = resp.results?.find(m => m.poster_path);
        if (found) results.push(found);
      } catch {
        // Si falla la búsqueda de una película, simplemente la omitimos
      }
    }

    return results;
  }
}
