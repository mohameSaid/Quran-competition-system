import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="brand">
          <div class="brand__icon">📖</div>
          <h1>نظام مسابقة القرآن الكريم</h1>
          <p>بوابة المشرفين والمحكّمين</p>
        </div>

        @if (error()) {
          <div class="error-box">
            <mat-icon>error_outline</mat-icon> {{ error() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>البريد الإلكتروني</mat-label>
            <input matInput formControlName="email" type="email" dir="ltr" autocomplete="email">
            <mat-icon matSuffix>email</mat-icon>
            @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
              <mat-error>البريد الإلكتروني مطلوب</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>كلمة المرور</mat-label>
            <input matInput formControlName="password" [type]="showPwd() ? 'text' : 'password'" dir="ltr" autocomplete="current-password">
            <button mat-icon-button matSuffix type="button" (click)="showPwd.set(!showPwd())">
              <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
              <mat-error>كلمة المرور مطلوبة</mat-error>
            }
          </mat-form-field>

          <button mat-flat-button type="submit" class="btn-gold login-btn" [disabled]="form.invalid || loading()">
            @if (loading()) { <mat-spinner diameter="18" style="margin-left:8px" /> }
            @else { <mat-icon>login</mat-icon> }
            تسجيل الدخول
          </button>
        </form>

        <div class="back-link">
          <a routerLink="/">← العودة للبوابة العامة</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--bg-primary); background-image: radial-gradient(ellipse at 50% 0%,rgba(212,168,67,.08) 0%,transparent 60%);
      padding: 20px;
    }
    .login-card {
      background: var(--bg-card); border: 1px solid var(--border-accent);
      border-radius: var(--r-xl); padding: 40px; width: 100%; max-width: 420px;
    }
    .brand { text-align: center; margin-bottom: 28px;
      &__icon { width:60px;height:60px;border-radius:14px;background:linear-gradient(135deg,var(--gold),var(--amber));display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 14px; }
      h1 { font-size:17px;font-weight:700;color:var(--gold-light);margin-bottom:5px; }
      p  { font-size:13px;color:var(--text-muted); }
    }
    .error-box { display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(232,85,85,.12);border:1px solid rgba(232,85,85,.3);border-radius:var(--r-sm);color:var(--red);font-size:13px;margin-bottom:14px; }
    .full-width  { width:100%; }
    .login-btn   { width:100%;height:46px;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px; }
    .back-link   { text-align:center;margin-top:18px;font-size:13px;color:var(--text-muted);
      a { color:var(--gold); }
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private fb   = inject(FormBuilder);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  loading = signal(false);
  error   = signal('');
  showPwd = signal(false);

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');
    try {
      await this.auth.login(this.form.value.email!, this.form.value.password!);
    } catch {
      this.error.set('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      this.loading.set(false);
    }
  }
}
