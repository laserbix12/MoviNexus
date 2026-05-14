import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Movie, MovieResponse } from '../models/movie.model';
import { CreditsResponse } from '../models/cast.model';

@Injectable({ providedIn: 'root' }) // Disponible en toda la app
export class MovieService {
  private http = inject(HttpClient); // Inyectamos el motor HTTP
  private apiUrl = environment.baseUrl;

  getTrendingMovies() {
    // Retornamos un Observable (una promesa de que llegarán datos)
    return this.http.get<MovieResponse>(`${this.apiUrl}/trending/movie/day`);
  }

  // NUEVO MÉTODO
  getPopularMovies() {
    return this.http.get<MovieResponse>(`${this.apiUrl}/movie/popular`);
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
}
