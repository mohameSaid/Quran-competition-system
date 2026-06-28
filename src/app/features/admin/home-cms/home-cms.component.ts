import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HomeContentService, DEFAULT_HOME_CONTENT } from '../../../core/services/home-content.service';
import {
  HomeContent, HeroStat, NewsItem, FigureItem, ServiceItem, ObituaryItem,
} from '../../../core/models';

/** نسخة قابلة للتعديل: التواريخ كنص YYYY-MM-DD لسهولة التحرير */
function toDateInput(d: Date | null | undefined): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d as unknown as string);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-home-cms',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <div class="page-wrap">
      <div class="section-header">
        <div class="section-title">محتوى الصفحة الرئيسية</div>
        <button mat-flat-button class="btn-gold" (click)="save()" [disabled]="saving()">
          <mat-icon>save</mat-icon> حفظ المحتوى
        </button>
      </div>

      <!-- إحصائيات الواجهة -->
      <mat-card class="cms-card">
        <div class="cms-head"><h3>إحصائيات الواجهة</h3>
          <button mat-stroked-button (click)="addHeroStat()"><mat-icon>add</mat-icon> إضافة</button></div>
        @for (st of heroStats(); track $index; let i = $index) {
          <div class="row">
            <input [(ngModel)]="st.value" placeholder="القيمة (مثال: 7,730)" />
            <input [(ngModel)]="st.label" placeholder="الوصف (مثال: نسمة)" />
            <button mat-icon-button color="warn" (click)="removeAt(heroStats, i)"><mat-icon>delete</mat-icon></button>
          </div>
        }
      </mat-card>

      <!-- الأخبار -->
      <mat-card class="cms-card">
        <div class="cms-head"><h3>الأخبار</h3>
          <button mat-stroked-button (click)="addNews()"><mat-icon>add</mat-icon> إضافة خبر</button></div>
        @for (n of news(); track $index; let i = $index) {
          <div class="block">
            <div class="row"><input [(ngModel)]="n.title" placeholder="العنوان" />
              <input [(ngModel)]="n.tag" placeholder="التصنيف (مشاريع/تعليم...)" />
              <button mat-icon-button color="warn" (click)="removeAt(news, i)"><mat-icon>delete</mat-icon></button></div>
            <textarea [(ngModel)]="n.body" rows="2" placeholder="نص الخبر"></textarea>
            <div class="row"><input [(ngModel)]="n.image" placeholder="رابط الصورة" dir="ltr" />
              <input [(ngModel)]="newsDates[i]" type="date" /></div>
          </div>
        }
      </mat-card>

      <!-- الشخصيات -->
      <mat-card class="cms-card">
        <div class="cms-head"><h3>شخصيات القرية</h3>
          <button mat-stroked-button (click)="addFigure()"><mat-icon>add</mat-icon> إضافة</button></div>
        @for (f of figures(); track $index; let i = $index) {
          <div class="row"><input [(ngModel)]="f.name" placeholder="الاسم" />
            <input [(ngModel)]="f.role" placeholder="الصفة" />
            <input [(ngModel)]="f.photo" placeholder="رابط الصورة" dir="ltr" />
            <button mat-icon-button color="warn" (click)="removeAt(figures, i)"><mat-icon>delete</mat-icon></button></div>
        }
      </mat-card>

      <!-- الخدمات -->
      <mat-card class="cms-card">
        <div class="cms-head"><h3>الخدمات</h3>
          <button mat-stroked-button (click)="addService()"><mat-icon>add</mat-icon> إضافة</button></div>
        @for (s of services(); track $index; let i = $index) {
          <div class="row"><input [(ngModel)]="s.icon" placeholder="أيقونة (إيموجي)" style="max-width:90px" />
            <input [(ngModel)]="s.title" placeholder="العنوان" />
            <input [(ngModel)]="s.desc" placeholder="الوصف" />
            <button mat-icon-button color="warn" (click)="removeAt(services, i)"><mat-icon>delete</mat-icon></button></div>
        }
      </mat-card>

      <!-- الوفيات -->
      <mat-card class="cms-card">
        <div class="cms-head"><h3>الوفيات</h3>
          <button mat-stroked-button (click)="addObituary()"><mat-icon>add</mat-icon> إضافة</button></div>
        @for (o of obituaries(); track $index; let i = $index) {
          <div class="block">
            <div class="row"><input [(ngModel)]="o.name" placeholder="الاسم" />
              <input [(ngModel)]="obitDates[i]" type="date" />
              <button mat-icon-button color="warn" (click)="removeAt(obituaries, i)"><mat-icon>delete</mat-icon></button></div>
            <textarea [(ngModel)]="o.text" rows="2" placeholder="نص النعي"></textarea>
          </div>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .cms-card { padding:16px 18px;margin-bottom:16px; }
    .cms-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;
      h3{font-size:15px;font-weight:700;color:var(--primary);} }
    .block { border:1px solid var(--border-primary);border-radius:var(--r-sm);padding:12px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px; }
    .row { display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap; }
    .row > input, textarea { flex:1;min-width:120px;background:var(--bg-secondary);border:1.5px solid var(--border-primary);border-radius:var(--r-sm);padding:8px 12px;color:var(--text-primary);font-family:'Cairo',sans-serif;font-size:13px;outline:none;&:focus{border-color:var(--gold);} }
    textarea { width:100%; resize:vertical; }
  `],
})
export class HomeCmsComponent implements OnInit {
  private svc = inject(HomeContentService);
  private snack = inject(MatSnackBar);

  heroStats  = signal<HeroStat[]>([]);
  news       = signal<NewsItem[]>([]);
  figures    = signal<FigureItem[]>([]);
  services   = signal<ServiceItem[]>([]);
  obituaries = signal<ObituaryItem[]>([]);
  newsDates: string[] = [];
  obitDates: string[] = [];
  saving = signal(false);

  ngOnInit(): void {
    this.svc.watch().subscribe((c) => this.load(c));
  }

  private load(c: HomeContent): void {
    this.heroStats.set(c.heroStats.map(s => ({ ...s })));
    this.news.set(c.news.map(n => ({ ...n })));
    this.figures.set(c.figures.map(f => ({ ...f })));
    this.services.set(c.services.map(s => ({ ...s })));
    this.obituaries.set(c.obituaries.map(o => ({ ...o })));
    this.newsDates = c.news.map(n => toDateInput(n.date));
    this.obitDates = c.obituaries.map(o => toDateInput(o.date));
  }

  removeAt(sig: typeof this.heroStats | any, i: number): void {
    sig.update((arr: unknown[]) => arr.filter((_, idx) => idx !== i));
  }

  private uid(): string { return 'x' + this.news().length + this.figures().length + Math.floor(performance.now()); }

  addHeroStat(): void { this.heroStats.update(a => [...a, { value: '', label: '' }]); }
  addNews(): void { this.news.update(a => [...a, { id: this.uid(), title: '', body: '', date: null, image: '', tag: '' }]); this.newsDates.push(''); }
  addFigure(): void { this.figures.update(a => [...a, { id: this.uid(), name: '', role: '', photo: '' }]); }
  addService(): void { this.services.update(a => [...a, { id: this.uid(), icon: '⭐', title: '', desc: '' }]); }
  addObituary(): void { this.obituaries.update(a => [...a, { id: this.uid(), name: '', text: '', date: null }]); this.obitDates.push(''); }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const news = this.news().map((n, i) => ({ ...n, date: this.newsDates[i] ? new Date(this.newsDates[i]) : null }));
      const obituaries = this.obituaries().map((o, i) => ({ ...o, date: this.obitDates[i] ? new Date(this.obitDates[i]) : null }));
      await this.svc.update({
        heroStats: this.heroStats(),
        news,
        figures: this.figures(),
        services: this.services(),
        obituaries,
      });
      this.snack.open('تم حفظ محتوى الصفحة الرئيسية', '', { duration: 3000 });
    } catch {
      this.snack.open('تعذّر الحفظ، حاول مرة أخرى', '', { duration: 4000 });
    } finally {
      this.saving.set(false);
    }
  }
}
