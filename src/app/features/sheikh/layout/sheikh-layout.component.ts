import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sheikh-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule],
  template: `
    <div style="display:flex;flex-direction:column;min-height:100vh">
      <header class="sh-header">
        <div class="sh-logo"><span class="sh-logo__icon">📖</span> بوابة المُحكِّم</div>
        <nav class="sh-nav">
          <a routerLink="/sheikh/queue"   routerLinkActive="active"><mat-icon>queue</mat-icon> قائمة الانتظار</a>
          <a routerLink="/sheikh/scoring" routerLinkActive="active"><mat-icon>grading</mat-icon> التقييم</a>
        </nav>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="sh-user">{{ auth.currentUser()?.displayName ?? 'المحكّم' }}</span>
          <button mat-icon-button (click)="auth.logout()" style="color:var(--text-muted)"><mat-icon>logout</mat-icon></button>
        </div>
      </header>
      <main style="flex:1;background:var(--bg)"><router-outlet /></main>
    </div>
  `,
  styles: [`
    .sh-header { display:flex;align-items:center;gap:16px;padding:11px 24px;background:var(--card);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10; }
    .sh-logo   { display:flex;align-items:center;gap:9px;font-size:15px;font-weight:700;color:var(--primary);
      &__icon{width:32px;height:32px;border-radius:7px;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:15px;color:#fff;}
    }
    .sh-nav    { display:flex;gap:4px;margin:0 auto;
      a{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:20px;font-size:13px;font-weight:500;color:var(--muted-fg);text-decoration:none;transition:all .18s;mat-icon{font-size:17px;width:17px;height:17px;}
        &:hover{background:var(--secondary);color:var(--primary);}
        &.active{background:var(--secondary);color:var(--primary);font-weight:600;}
      }
    }
    .sh-user   { font-size:13px;font-weight:600;color:var(--muted-fg); }
  `]
})
export class SheikhLayoutComponent {
  auth = inject(AuthService);
}
