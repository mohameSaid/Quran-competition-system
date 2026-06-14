import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="home">
      <div class="hero">
        <div class="hero__icon">🕌</div>
        <h1 class="hero__title">مسابقة القرآن الكريم</h1>
        <p class="hero__sub">
          مسابقة في التلاوة والحفظ — سجّل الآن وانضم إلى المتسابقين
        </p>
        <a routerLink="/register" mat-flat-button class="btn-gold hero__cta">
          <mat-icon>person_add</mat-icon>
          تسجيل متسابق جديد
        </a>
      </div>

      <div class="info-cards">
        <div class="info-card">
          <div class="info-card__icon">👑</div>
          <div class="info-card__title">الحفظ الكامل</div>
          <div class="info-card__desc">30 جزءاً — جائزة 5,000 ريال</div>
        </div>
        <div class="info-card">
          <div class="info-card__icon">📗</div>
          <div class="info-card__title">15 جزءاً</div>
          <div class="info-card__desc">جائزة 3,000 ريال</div>
        </div>
        <div class="info-card">
          <div class="info-card__icon">📘</div>
          <div class="info-card__title">10 أجزاء</div>
          <div class="info-card__desc">جائزة 2,000 ريال</div>
        </div>
        <div class="info-card">
          <div class="info-card__icon">📙</div>
          <div class="info-card__title">5 أجزاء</div>
          <div class="info-card__desc">جائزة 1,500 ريال</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home { padding: 48px 0; }
    .hero { text-align:center; margin-bottom:48px;
      &__icon  { font-size:64px; margin-bottom:16px; }
      &__title { font-family:'Amiri',serif; font-size:38px; font-weight:700; color:var(--gold-light); margin-bottom:12px; }
      &__sub   { font-size:15px; color:var(--text-secondary); max-width:480px; margin:0 auto 28px; line-height:1.7; }
      &__cta   { height:50px; font-size:15px; padding:0 36px; display:inline-flex; align-items:center; gap:8px; }
    }
    .info-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; }
    .info-card  { background:var(--bg-card); border:1px solid var(--border-primary); border-radius:var(--r-md); padding:20px; text-align:center; transition:all .2s;
      &:hover { border-color:rgba(212,168,67,.35); transform:translateY(-2px); }
      &__icon  { font-size:32px; margin-bottom:10px; }
      &__title { font-size:15px; font-weight:700; margin-bottom:5px; }
      &__desc  { font-size:12px; color:var(--text-muted); }
    }
    @media(max-width:600px) { .hero__title { font-size:26px; } }
  `]
})
export class HomeComponent {}
