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
      console.log('Home Inicializado. Cargando películas...');
      this.movieService.getTrendingMovies().subscribe(response => {
        console.log('✅ ¡Éxito! Datos recibidos de TMDB:', response.results);
      });
    });
  }
}
