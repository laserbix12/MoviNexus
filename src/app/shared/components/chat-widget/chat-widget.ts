import {
  Component,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GeminiService, ChatMessage } from '../../../core/services/gemini.service';
import { Movie } from '../../../core/models/movie.model';

declare var window: any;

// ─── Función local de Markdown ─────────────────────────────────────────────────
// Evitamos librerías externas para no afectar el bundle size ni el build.
function parseMarkdown(text: string): string {
  if (!text) return '';
  return text
    // Negritas **texto**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Cursivas *texto*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Código inline `codigo`
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Listas con guión "- item"
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // Saltos de línea dobles → párrafos
    .replace(/\n\n/g, '</p><p>')
    // Saltos de línea simples → <br>
    .replace(/\n/g, '<br>')
    // Envolver en párrafo
    .replace(/^(.+)$/, '<p>$1</p>');
}

// ─── Componente ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ChatWidget implements AfterViewChecked, OnInit {
  protected gemini   = inject(GeminiService);
  protected cdr      = inject(ChangeDetectorRef);

  /** Controla si el panel está abierto */
  isOpen             = signal(false);

  /** Controla si el micrófono está escuchando */
  isListening        = signal(false);
  hasRecognition     = signal(false);
  private recognition: any = null;
  private speechTimeout: any;

  /** Texto del input del usuario */
  inputText          = '';

  /** Preguntas sugeridas — se muestran solo cuando hay 1 mensaje (bienvenida) */
  readonly suggestedQuestions = [
    { emoji: '🎬', text: 'Recomiéndame 3 películas de ciencia ficción imperdibles' },
    { emoji: '🎭', text: '¿Qué películas de Nolan debo ver primero?' },
    { emoji: '😱', text: 'Dame las mejores películas de terror psicológico' },
    { emoji: '🏆', text: '¿Cuáles son las películas más premiadas de la historia?' },
    { emoji: '❤️', text: 'Películas románticas que no sean cursis' },
    { emoji: '🤔', text: '¿Cuál es la diferencia entre cine de autor y cine comercial?' },
  ];

  /** Para auto-scroll al último mensaje */
  @ViewChild('messagesContainer') private messagesRef!: ElementRef<HTMLDivElement>;

  private shouldScroll = false;

  ngOnInit(): void {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.hasRecognition.set(true);
      this.recognition.lang = 'es-ES'; // Español
      this.recognition.interimResults = true;
      this.recognition.continuous = false;

      this.recognition.onstart = () => {
        this.isListening.set(true);
      };

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          // Agregar el texto final al input actual
          const currentText = this.inputText.trim();
          this.inputText = currentText ? `${currentText} ${finalTranscript}` : finalTranscript;
          this.cdr.detectChanges();

          // Auto-envío inteligente tras 600ms
          clearTimeout(this.speechTimeout);
          this.speechTimeout = setTimeout(() => {
            this.onSubmit();
          }, 600);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz', event.error);
        this.isListening.set(false);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };
    } else {
      console.warn('La API de reconocimiento de voz no está soportada en este navegador.');
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  toggleListening(): void {
    if (!this.recognition) return;

    if (this.isListening()) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }

  togglePanel(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      // Pequeño delay para que el DOM esté renderizado antes de hacer scroll
      setTimeout(() => this.scrollToBottom(), 80);
    }
  }

  async onSubmit(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.gemini.isLoading()) return;
    this.inputText = '';
    this.shouldScroll = true;
    await this.gemini.sendMessage(text);
    this.shouldScroll = true;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  clearChat(): void {
    this.gemini.clearHistory();
  }

  /** Envía una pregunta sugerida como si el usuario la hubiera escrito */
  async sendSuggestion(question: string): Promise<void> {
    if (this.gemini.isLoading()) return;
    this.inputText = '';
    this.shouldScroll = true;
    await this.gemini.sendMessage(question);
    this.shouldScroll = true;
  }

  /** Muestra chips solo cuando el historial tiene el mensaje de bienvenida */
  get showSuggestions(): boolean {
    return this.gemini.messageCount() === 1 && !this.gemini.isLoading();
  }

  // ── Helpers de template ───────────────────────────────────────────────────

  /** Convierte Markdown a HTML seguro para innerHTML */
  renderMarkdown(text: string): string {
    return parseMarkdown(text);
  }

  /** URL del poster de una película en TMDB */
  getPosterUrl(movie: Movie): string {
    return movie.poster_path
      ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
      : 'assets/no-poster.png';
  }

  /** Formatea la hora del mensaje */
  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  trackByIndex(index: number, _item: ChatMessage): number {
    return index;
  }

  private scrollToBottom(): void {
    const el = this.messagesRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
