import { Component, HostListener, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './public-layout.component.html',
})
export class PublicLayoutComponent {
  readonly scrolled = signal(false);
  readonly menuOpen = signal(false);
  readonly showStickyCta = signal(true);
  readonly year = new Date().getFullYear();

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.menuOpen.set(false);
      this.showStickyCta.set(this.router.url === '/' || this.router.url === '');
    });
    this.showStickyCta.set(this.router.url === '/' || this.router.url === '');
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 50);
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  scrollTo(id: string, event: Event): void {
    event.preventDefault();
    this.closeMenu();
    if (this.router.url !== '/' && this.router.url !== '') {
      void this.router.navigate(['/']).then(() => {
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
