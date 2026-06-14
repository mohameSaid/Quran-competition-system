import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatButtonModule],
  template: `
    <div class="pub-shell">
      <header class="pub-header">
        <div class="pub-header__inner">
          <div class="pub-logo">
            <span class="pub-logo__icon">📖</span>
            <span>مسابقة القرآن الكريم</span>
          </div>
          <a routerLink="/login" mat-stroked-button style="font-family:Cairo,sans-serif;font-size:13px">
            دخول المشرفين
          </a>
        </div>
      </header>
      <main class="pub-main"><router-outlet /></main>
      <footer class="pub-footer">نظام مسابقة القرآن الكريم © {{ year }}</footer>
    </div>
  `,
  styles: [`
    .pub-shell  { display:flex;flex-direction:column;min-height:100vh; }
    .pub-header { background:var(--bg-secondary);border-bottom:1px solid var(--border-primary);position:sticky;top:0;z-index:50; }
    .pub-header__inner { max-width:900px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:12px 24px; }
    .pub-logo   { display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;color:var(--gold-light);
      &__icon { width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,var(--gold),var(--amber));display:flex;align-items:center;justify-content:center;font-size:16px; }
    }
    .pub-main   { flex:1;max-width:900px;width:100%;margin:0 auto;padding:0 24px; }
    .pub-footer { text-align:center;padding:18px;color:var(--text-muted);font-size:12px;border-top:1px solid var(--border-primary); }
  `]
})
export class PublicLayoutComponent {
  year = new Date().getFullYear();
}
