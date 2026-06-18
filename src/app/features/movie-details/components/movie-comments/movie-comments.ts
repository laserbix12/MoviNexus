import {
  Component,
  inject,
  Input,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../../../core/services/comment.service';
import { Comment } from '../../../../core/models/comment.model';

@Component({
  selector: 'app-movie-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movie-comments.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './movie-comments.css',
})
export class MovieCommentsComponent implements OnInit {
  private commentService = inject(CommentService);
  private cdr = inject(ChangeDetectorRef);

  @Input() movieId!: number; // Recibe el ID desde la pantalla de detalles

  comments: Comment[] = [];
  loading = false;
  error = '';
  submitting = false;

  // Campos del formulario
  authorName = '';
  commentText = '';
  selectedRating = 5;
  showForm = false;
  successMessage = '';

  get itemId(): string {
    return `movie-${this.movieId}`;
  }

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(): void {
    this.loading = true;
    this.error = '';
    this.commentService.getComments(this.itemId).subscribe({
      next: (data) => {
        this.comments = data.sort(
          (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
        );
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar los comentarios. Asegúrate de que la API está activa.';
        this.loading = false;
      },
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.successMessage = '';
  }

  setRating(value: number): void {
    this.selectedRating = value;
  }

  submitComment(): void {
    if (!this.authorName.trim() || !this.commentText.trim()) return;
    this.submitting = true;

    // 1. Crear comentario optimista (fake temporal)
    const optimisticComment: Comment = {
      id: Date.now(), // ID temporal
      appId: '', // No lo necesitamos para la UI
      itemId: this.itemId,
      author: this.authorName,
      text: this.commentText,
      rating: this.selectedRating,
      createdAt: new Date().toISOString(),
    };

    // 2. Actualizar UI de inmediato (Optimistic Update)
    // Usamos spread operator para crear una nueva referencia del arreglo, esto ayuda a la detección de cambios
    this.comments = [optimisticComment, ...this.comments];

    // Guardar valores temporalmente por si falla la petición
    const tempAuthor = this.authorName;
    const tempText = this.commentText;
    const tempRating = this.selectedRating;

    // Resetear formulario al instante para dar sensación de rapidez
    this.showForm = false;
    this.successMessage = '¡Comentario publicado exitosamente!';
    this.authorName = '';
    this.commentText = '';
    this.selectedRating = 5;

    // Forzar la detección de cambios inmediatamente como solicitaste
    this.cdr.detectChanges();

    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 3000);

    // 3. Enviar a la API en segundo plano
    this.commentService.addComment(this.itemId, tempAuthor, tempText, tempRating).subscribe({
      next: (realComment) => {
        // Reemplazar el comentario temporal con el real
        const index = this.comments.findIndex((c) => c.id === optimisticComment.id);
        if (index !== -1) {
          // Actualizamos la referencia nuevamente para que la UI se entere
          const updatedComments = [...this.comments];
          updatedComments[index] = realComment;
          this.comments = updatedComments;
        }
        this.submitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        // Si falla la API, revertimos el comentario optimista
        this.comments = this.comments.filter((c) => c.id !== optimisticComment.id);
        this.error = 'Ocurrió un error al publicar el comentario en el servidor.';
        this.submitting = false;
        this.cdr.detectChanges();

        // Ocultar error después de unos segundos
        setTimeout(() => {
          this.error = '';
          this.cdr.detectChanges();
        }, 5000);
      },
    });
  }
}
