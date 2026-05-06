import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MovieResponse } from '../models/movie.model';

@Injectable({ providedIn: 'root' }) // Disponible en toda la app
export class MovieService {
  private http = inject(HttpClient); // Inyectamos el motor HTTP
  private apiUrl = environment.baseUrl;

  getTrendingMovies() {
    // Retornamos un Observable (una promesa de que llegarán datos)
    return this.http.get<MovieResponse>(`${this.apiUrl}/trending/movie/day`);
  }
}
