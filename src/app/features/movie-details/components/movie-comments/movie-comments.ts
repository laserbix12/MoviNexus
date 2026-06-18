import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../../../core/services/comment.service';
import { Comment } from '../../../../core/models/comment.model';

@Component({
  selector: 'app-movie-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movie-comments.html',
  styleUrl: './movie-comments.css',
})
export class MovieCommentsComponent implements OnInit {
  private commentService = inject(CommentService);

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
          (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar los comentarios. Asegúrate de que la API está activa.';
        this.loading = false;
      }
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
      createdAt: new Date().toISOString()
    };

    // 2. Actualizar UI de inmediato (Optimistic Update)
    this.comments.unshift(optimisticComment);
    
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
    setTimeout(() => this.successMessage = '', 3000);

    // 3. Enviar a la API en segundo plano
    this.commentService.addComment(this.itemId, tempAuthor, tempText, tempRating).subscribe({
      next: (realComment) => {
        // Reemplazar el comentario temporal con el real (que tiene el ID definitivo de la base de datos)
        const index = this.comments.findIndex(c => c.id === optimisticComment.id);
        if (index !== -1) {
          this.comments[index] = realComment;
        }
        this.submitting = false;
      },
      error: (err) => {
        // Si falla la API, revertimos el comentario optimista
        this.comments = this.comments.filter(c => c.id !== optimisticComment.id);
        this.error = 'Ocurrió un error al publicar el comentario en el servidor.';
        this.submitting = false;
        
        // Ocultar error después de unos segundos
        setTimeout(() => this.error = '', 5000);
      }
    });
  }
}
