import {
  Component,
  inject,
  Input,
  OnInit,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { MovieService } from '../../core/services/movie.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Movie, CountryProviders } from '../../core/models/movie.model';
import { CastCard } from '../../shared/components/cast-card/cast-card';
import { MovieTrailerComponent } from './components/movie-trailer/movie-trailer';
import { MovieCommentsComponent } from './components/movie-comments/movie-comments';
import { Observable, forkJoin, map } from 'rxjs';
import { CreditsResponse } from '../../core/models/cast.model';
import { Location } from '@angular/common';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [CommonModule, CastCard, MovieTrailerComponent, MovieCommentsComponent],
  templateUrl: './movie-details.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './movie-details.css',
})
export class MovieDetails implements OnInit {
  private movieService = inject(MovieService);
  public favoritesService = inject(FavoritesService);
  private location = inject(Location);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  @Input() id!: string;

  // Declaramos un Observable que contendrá TODOS los datos que necesitamos
  movieData$!: Observable<{ details: Movie; credits: CreditsResponse; providers: CountryProviders | null }>;

  ngOnInit(): void {
    if (this.id) {
      // forkJoin dispara ambas peticiones al mismo tiempo y crea un objeto con los dos resultados
      this.movieData$ = forkJoin({
        details: this.movieService.getMovieById(this.id),
        credits: this.movieService.getMovieCredits(this.id),
        providersRaw: this.movieService.getWatchProviders(this.id),
      }).pipe(
        map((res) => {
          // Extraer la región del usuario (ej. "es-CO" -> "CO")
          let region = 'US'; // Por defecto Estados Unidos
          if (isPlatformBrowser(this.platformId) && typeof navigator !== 'undefined' && navigator.language) {
            const parts = navigator.language.split('-');
            if (parts.length > 1) {
              region = parts[1].toUpperCase();
            } else {
              // Algunos navegadores solo dan el idioma (ej: "es" en vez de "es-ES"), lo intentamos mapear.
              region = parts[0] === 'es' ? 'ES' : parts[0].toUpperCase();
            }
          }
          
          // Buscar proveedores para la región del usuario, sino cae en US, o nulo.
          const countryData = res.providersRaw.results[region] || res.providersRaw.results['US'] || null;

          return {
            details: res.details,
            credits: res.credits,
            providers: countryData
          };
        })
      );
    }
  }

  getBackdropUrl(path: string | null | undefined): string {
    return path ? `https://image.tmdb.org/t/p/original${path}` : '';
  }

  goBack(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Añadimos la clase ANTES de navegar para que la animación inicie a tiempo
      this.document.documentElement.classList.add('back-transition');
      // La limpiamos después de que la animación termina (0.8s)
      setTimeout(() => {
        this.document.documentElement.classList.remove('back-transition');
      }, 1000);
    }
    this.location.back();
  }

  toggleFavorite(movie: Movie): void {
    this.favoritesService.toggleFavorite(movie);
  }
}
