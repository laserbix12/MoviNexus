import { Component, inject, afterNextRender } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MovieService } from '../../core/services/movie.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  private movieService = inject(MovieService);

  constructor() {
    afterNextRender(() => {
      console.warn('⚠️ VERIFICACIÓN: El nuevo código ya está funcionando en Vercel ⚠️');
      console.log('Home Inicializado. Cargando películas...');
      this.movieService.getTrendingMovies().subscribe({
        next: (response) => {
          console.log('✅ ¡Éxito! Datos recibidos de TMDB:', response.results);
        },
        error: (err) => {
          console.error('❌ Error al conectar con TMDB:', err);
        }
      });
    });
  }
}
