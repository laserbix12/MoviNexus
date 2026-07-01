import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Movie, MovieResponse, WatchProvidersResponse } from '../models/movie.model';
import { CreditsResponse } from '../models/cast.model';
import { delay, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' }) // Disponible en toda la app
export class MovieService {
  private http = inject(HttpClient); // Inyectamos el motor HTTP
  private apiUrl = environment.baseUrl;

  // Caché para evitar mostrar el esqueleto al volver a la pantalla de inicio
  private trendingMoviesCache: Movie[] = [];
  private popularMoviesCache: Movie[] = [];
  private catalogMoviesCache: Movie[] = [];
  private catalogCurrentPageCache = 1;

  getTrendingMoviesCache(): Movie[] {
    return this.trendingMoviesCache;
  }

  setTrendingMoviesCache(movies: Movie[]): void {
    this.trendingMoviesCache = movies;
  }

  getPopularMoviesCache(): Movie[] {
    return this.popularMoviesCache;
  }

  setPopularMoviesCache(movies: Movie[]): void {
    this.popularMoviesCache = movies;
  }

  getCatalogMoviesCache(): Movie[] {
    return this.catalogMoviesCache;
  }

  setCatalogMoviesCache(movies: Movie[]): void {
    this.catalogMoviesCache = movies;
  }

  getCatalogCurrentPageCache(): number {
    return this.catalogCurrentPageCache;
  }

  setCatalogCurrentPageCache(page: number): void {
    this.catalogCurrentPageCache = page;
  }

  getTrendingMovies() {
    // Retornamos un Observable (una promesa de que llegarán datos)
    return this.http.get<MovieResponse>(`${this.apiUrl}/trending/movie/day`).pipe(
      delay(2000),
      catchError((error) => {
        console.error('Error fetching trending movies:', error);
        return of({ page: 1, results: [], total_pages: 1, total_results: 0 } as MovieResponse);
      })
    );
  }

  // NUEVO MÉTODO
  getPopularMovies(page: number = 1) {
    return this.http.get<MovieResponse>(`${this.apiUrl}/movie/popular`, {
      params: { page: page.toString() }
    }).pipe(
      delay(2000),
      catchError((error) => {
        console.error('Error fetching popular movies:', error);
        return of({ page: 1, results: [], total_pages: 1, total_results: 0 } as MovieResponse);
      })
    );
  }

  getMovieById(id: string | number) {
    return this.http.get<Movie>(`${this.apiUrl}/movie/${id}`);
  }

  getMovieCredits(id: string | number) {
    return this.http.get<CreditsResponse>(`${this.apiUrl}/movie/${id}/credits`);
  }

  /**
   * Busca películas por término de búsqueda.
   * @param query Texto a buscar
   */
  searchMovies(query: string) {
    return this.http.get<MovieResponse>(
      `${this.apiUrl}/search/movie`, {
        params: { query } // Angular convierte esto en ?query=Batman automáticamente
      }
    );
  }

  /**
   * Obtiene los videos (tráilers, teasers, etc.) de una película.
   * @param id ID de la película en TMDB
   */
  getMovieVideos(id: string | number) {
    return this.http.get<{ results: Array<{ key: string; site: string; type: string; name: string }> }>(
      `${this.apiUrl}/movie/${id}/videos`
    );
  }

  /**
   * Obtiene los proveedores de streaming para una película.
   * @param id ID de la película en TMDB
   */
  getWatchProviders(id: string | number) {
    return this.http.get<WatchProvidersResponse>(
      `${this.apiUrl}/movie/${id}/watch/providers`
    );
  }
}
