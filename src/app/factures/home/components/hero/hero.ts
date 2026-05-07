import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie } from '../../../../core/models/movie.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.html',
  styleUrl: './hero.css'
})
export class HeroComponent {
  // Recibimos la película desde el componente padre (Home)
  @Input() movie!: Movie;

  // Construimos la URL completa para la imagen de fondo
  get backdropUrl(): string {
    return `${environment.imgPath}${this.movie.backdrop_path}`;
  }
}