import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MatProgressSpinnerModule],
  template: `
    @if (auth.isLoading()) {
      <div class="app-boot">
        <mat-spinner diameter="44" />
        <p>جاري التحميل...</p>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .app-boot { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; gap:16px; color:var(--text-muted); font-family:'Cairo',sans-serif; }
  `]
})
export class AppComponent {
  auth = inject(AuthService);
}
