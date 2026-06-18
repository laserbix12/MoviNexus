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

    this.commentService.addComment(this.itemId, this.authorName, this.commentText, this.selectedRating).subscribe({
      next: (newComment) => {
        this.comments.unshift(newComment); // Añadir al inicio de la lista
        this.submitting = false;
        this.showForm = false;
        this.successMessage = '¡Comentario publicado exitosamente!';
        this.authorName = '';
        this.commentText = '';
        this.selectedRating = 5;

        // Ocultar el banner de éxito después de unos segundos
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.error = 'No se pudo publicar el comentario.';
        this.submitting = false;
      }
    });
  }
}
