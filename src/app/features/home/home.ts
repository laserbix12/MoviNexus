import { Component, inject, OnInit, signal, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MovieService } from '../../core/services/movie.service';
import { Hero } from './components/hero/hero';
import { MovieSlider } from '../../shared/components/movie-slider/movie-slider';
import { MovieCard } from '../../shared/components/movie-card/movie-card';
import { Movie } from '../../core/models/movie.model';
import { SkeletonHero } from '../../shared/components/skeleton-hero/skeleton-hero';
import { SkeletonCard } from '../../shared/components/skeleton-card/skeleton-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Hero, MovieSlider, MovieCard, SkeletonHero, SkeletonCard], // Agregamos MovieSlider, SkeletonHero y SkeletonCard a las importaciones
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit {
  private movieService = inject(MovieService);
  private platformId = inject(PLATFORM_ID);

  // Declaramos nuestras Signals para almacenar el estado de forma reactiva
  featuredMovie = signal<Movie | null>(null);
  trendingMovies = signal<Movie[]>([]);
  popularMovies = signal<Movie[]>([]);

  @ViewChild('infiniteAnchor') infiniteAnchor!: ElementRef;

  catalogMovies = signal<Movie[]>([]);
  currentPage = signal(1);
  isFetchingNextPage = signal(false);

  ngOnInit(): void {
    // 1. Pedimos las tendencias (usando caché si existe)
    const cachedTrending = this.movieService.getTrendingMoviesCache();
    if (cachedTrending.length > 0) {
      this.featuredMovie.set(cachedTrending[0]);
      this.trendingMovies.set(cachedTrending);
    } else {
      this.movieService.getTrendingMovies().subscribe({
        next: (data) => {
          if (data.results.length > 0) {
            this.featuredMovie.set(data.results[0]);
            this.trendingMovies.set(data.results);
            this.movieService.setTrendingMoviesCache(data.results);
          }
        }
      });
    }

    // 2. Pedimos las populares (usando caché si existe)
    const cachedPopular = this.movieService.getPopularMoviesCache();
    if (cachedPopular.length > 0) {
      this.popularMovies.set(cachedPopular);
    } else {
      this.movieService.getPopularMovies().subscribe({
        next: (data) => {
          this.popularMovies.set(data.results);
          this.movieService.setPopularMoviesCache(data.results);
        }
      });
    }

    // 3. Restauramos catálogo de scroll infinito si ya fue cargado
    const cachedCatalog = this.movieService.getCatalogMoviesCache();
    if (cachedCatalog.length > 0) {
      this.catalogMovies.set(cachedCatalog);
      this.currentPage.set(this.movieService.getCatalogCurrentPageCache());
    }
  }

  ngAfterViewInit(): void {
    // 3. Solo configuramos el observador en el navegador (SSR Safety)
    if (isPlatformBrowser(this.platformId)) {
      this.initInfiniteScroll();
    }
  }

  private initInfiniteScroll(): void {
    const observer = new IntersectionObserver((entries) => {
      // 4. Si el ancla entra en el campo de visión y no estamos cargando...
      if (entries[0].isIntersecting && !this.isFetchingNextPage()) {
        this.loadMoreMovies();
      }
    }, { rootMargin: '200px' }); // 'rootMargin' permite cargar 200px antes de llegar al final

    if (this.infiniteAnchor) {
      observer.observe(this.infiniteAnchor.nativeElement);
    }
  }

  loadMoreMovies(): void {
    this.isFetchingNextPage.set(true);
    this.movieService.getPopularMovies(this.currentPage()).subscribe({
      next: (data) => {
        // 5. Inmutabilidad: Concatenamos los resultados usando el operador spread [...] y actualizamos caché
        const updatedCatalog = [...this.catalogMovies(), ...data.results];
        this.catalogMovies.set(updatedCatalog);
        this.movieService.setCatalogMoviesCache(updatedCatalog);

        const nextPage = this.currentPage() + 1;
        this.currentPage.set(nextPage);
        this.movieService.setCatalogCurrentPageCache(nextPage);

        this.isFetchingNextPage.set(false);
      }
    });
  }
}
