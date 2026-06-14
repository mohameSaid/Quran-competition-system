import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';

const NAV = [
  { icon:'dashboard',           label:'لوحة التحكم',  route:'/admin/dashboard' },
  { icon:'group',               label:'المتسابقون',    route:'/admin/students'  },
  { icon:'record_voice_over',   label:'المحكّمون',     route:'/admin/sheikhs'   },
  { icon:'event_note',          label:'الجلسات',        route:'/admin/sessions'  },
  { icon:'leaderboard',         label:'النتائج',         route:'/admin/results'   },
  { icon:'assessment',          label:'التقارير',         route:'/admin/reports'   },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="admin-shell" [class.collapsed]="collapsed()">
      <aside class="sidebar">
        <div class="sidebar__logo">
          <div class="logo-mark">📖</div>
          @if (!collapsed()) { <span>مسابقة القرآن</span> }
        </div>

        <nav class="sidebar__nav">
          @for (item of nav; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" class="nav-link"
               [matTooltip]="collapsed() ? item.label : ''" matTooltipPosition="left">
              <mat-icon>{{ item.icon }}</mat-icon>
              @if (!collapsed()) { <span>{{ item.label }}</span> }
            </a>
          }
        </nav>

        <div class="sidebar__footer">
          <button class="nav-link nav-link--logout" (click)="auth.logout()"
                  [matTooltip]="collapsed() ? 'خروج' : ''" matTooltipPosition="left">
            <mat-icon>logout</mat-icon>
            @if (!collapsed()) { <span>تسجيل خروج</span> }
          </button>
        </div>
      </aside>

      <div class="admin-body">
        <header class="admin-header">
          <button mat-icon-button (click)="collapsed.set(!collapsed())" style="color:var(--text-secondary)">
            <mat-icon>{{ collapsed() ? 'menu_open' : 'menu' }}</mat-icon>
          </button>
          <span class="admin-header__title">لوحة إدارة المسابقة</span>
          <div class="admin-header__user">
            <div class="user-chip">
              <div class="user-chip__av">{{ auth.currentUser()?.displayName?.charAt(0) ?? 'أ' }}</div>
              <div>
                <div style="font-size:13px;font-weight:600">{{ auth.currentUser()?.displayName ?? 'المسؤول' }}</div>
                <div style="font-size:10px;color:var(--text-muted)">مسؤول النظام</div>
              </div>
            </div>
          </div>
        </header>
        <main class="admin-content"><router-outlet /></main>
      </div>
    </div>
  `,
  styles: [`
    .admin-shell { display:flex; height:100vh; overflow:hidden; }
    .sidebar {
      width:240px; background:var(--bg-secondary); border-left:1px solid var(--border-primary);
      display:flex; flex-direction:column; transition:width .22s ease; flex-shrink:0;
    }
    .admin-shell.collapsed .sidebar { width:60px; }
    .sidebar__logo { display:flex;align-items:center;gap:10px;padding:16px 14px;border-bottom:1px solid var(--border-primary);
      span{font-size:14px;font-weight:700;color:var(--primary);white-space:nowrap;overflow:hidden;}
      .logo-mark{width:34px;height:34px;border-radius:8px;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
    }
    .sidebar__nav { flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:3px;overflow-y:auto; }
    .nav-link {
      display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:9px;font-size:13px;font-weight:500;
      color:var(--text-secondary);text-decoration:none;cursor:pointer;border:none;background:none;width:100%;transition:all .18s;
      mat-icon{flex-shrink:0;font-size:20px;width:20px;height:20px;}
      span{white-space:nowrap;overflow:hidden;}
      &.active{background:var(--secondary);color:var(--primary);font-weight:600;}
      &:hover:not(.active){background:var(--muted);color:var(--fg);}
      &--logout{color:var(--red)!important;&:hover{background:rgba(232,85,85,.1)!important;}}
    }
    .sidebar__footer { padding:10px 8px;border-top:1px solid var(--border-primary); }
    .admin-body { flex:1;display:flex;flex-direction:column;overflow:hidden; }
    .admin-header { display:flex;align-items:center;gap:12px;padding:10px 22px;background:var(--bg-secondary);border-bottom:1px solid var(--border-primary);flex-shrink:0; }
    .admin-header__title { font-size:15px;font-weight:600;flex:1; }
    .admin-header__user {}
    .user-chip { display:flex;align-items:center;gap:10px; }
    .user-chip__av { width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--purple),var(--blue));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff; }
    .admin-content { flex:1;overflow-y:auto;background:var(--bg-primary); }
  `]
})
export class AdminLayoutComponent {
  auth      = inject(AuthService);
  collapsed = signal(false);
  nav       = NAV;
}
