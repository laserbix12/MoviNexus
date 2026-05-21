import { Component, signal, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, Router, NavigationStart } from '@angular/router';
import { Header } from './shared/components/layout/header/header';
import { Footer } from './shared/components/layout/footer/footer';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('MovieNexus');
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.pipe(
        filter((event): event is NavigationStart => event instanceof NavigationStart)
      ).subscribe((event) => {
        if (event.navigationTrigger === 'popstate') {
          this.document.documentElement.classList.add('back-transition');
        } else {
          this.document.documentElement.classList.remove('back-transition');
        }
      });
    }
  }
}
