import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CompetitionService } from '../../../core/services/competition.service';
import { Competition, CompetitionCategory, CATEGORY_LABELS } from '../../../core/models';

/** Firestore returns Timestamp objects for date fields; normalize to JS Date for the pickers. */
function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === 'function') return t.toDate();
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d;
}

const CATEGORY_KEYS: CompetitionCategory[] = ['full30', 'half15', 'ten10', 'five5'];

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatCardModule, MatSlideToggleModule, MatDatepickerModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-wrap">
      <div class="section-header">
        <div class="section-title">إعدادات المسابقة</div>
      </div>

      @if (!hasCompetition()) {
        <div class="info-box">
          <mat-icon>info</mat-icon>
          لا توجد مسابقة بعد. املأ البيانات التالية واحفظ لإنشاء المسابقة وفتح باب التسجيل.
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="save()" class="settings-form">
        <!-- بيانات المسابقة -->
        <mat-card class="form-section">
          <mat-card-header><mat-card-title>بيانات المسابقة</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>اسم المسابقة *</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>السنة *</mat-label>
                <input matInput type="number" formControlName="year" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>القرية / المكان</mat-label>
                <input matInput formControlName="village" />
              </mat-form-field>
            </div>

            <div class="toggles">
              <mat-slide-toggle formControlName="registrationOpen">فتح باب التسجيل</mat-slide-toggle>
              <mat-slide-toggle formControlName="resultsPublished">نشر النتائج للعامة</mat-slide-toggle>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- الجوائز -->
        <mat-card class="form-section" formGroupName="prizes">
          <mat-card-header><mat-card-title>الجوائز (بالجنيه)</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="grid-2">
              @for (k of categoryKeys; track k) {
                <mat-form-field appearance="outline">
                  <mat-label>{{ categoryLabels[k] }}</mat-label>
                  <input matInput type="number" [formControlName]="k" />
                </mat-form-field>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- المواعيد -->
        <mat-card class="form-section">
          <mat-card-header><mat-card-title>المواعيد</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="grid-2">
              @for (d of dateFields; track d.key) {
                <mat-form-field appearance="outline">
                  <mat-label>{{ d.label }}</mat-label>
                  <input matInput [matDatepicker]="picker" [formControlName]="d.key" />
                  <mat-datepicker-toggle matIconSuffix [for]="picker" />
                  <mat-datepicker #picker />
                </mat-form-field>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <button mat-flat-button type="submit" class="btn-gold save-btn"
                [disabled]="form.invalid || saving()">
          @if (saving()) { <mat-spinner diameter="18" /> }
          حفظ الإعدادات
        </button>
      </form>
    </div>
  `,
  styles: [`
    .settings-form { display:flex; flex-direction:column; gap:16px; max-width:760px; }
    .form-section { padding:0; overflow:hidden;
      mat-card-header { padding:16px 20px 0; }
      mat-card-title { font-size:16px; font-weight:700; color:var(--primary); }
      mat-card-content { padding:12px 20px 20px; }
    }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    @media (max-width:560px){ .grid-2 { grid-template-columns:1fr; } }
    .grid-2 mat-form-field { width:100%; }
    .toggles { display:flex; flex-wrap:wrap; gap:20px; margin-top:8px; }
    .info-box { display:flex; align-items:center; gap:8px; padding:12px 14px; margin-bottom:16px;
      background:var(--secondary); border:1px solid var(--border-primary); border-radius:var(--r-sm);
      color:var(--primary); font-size:14px; }
    .save-btn { align-self:flex-start; height:46px; min-width:180px; font-weight:600;
      display:flex; align-items:center; justify-content:center; gap:8px; }
  `],
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private competitionSvc = inject(CompetitionService);
  private snack = inject(MatSnackBar);

  categoryKeys = CATEGORY_KEYS;
  categoryLabels = CATEGORY_LABELS;
  dateFields = [
    { key: 'registrationStart', label: 'بداية التسجيل' },
    { key: 'registrationEnd',   label: 'نهاية التسجيل' },
    { key: 'examStart',         label: 'بداية الاختبارات' },
    { key: 'examEnd',           label: 'نهاية الاختبارات' },
    { key: 'resultsDate',       label: 'موعد النتائج' },
    { key: 'ceremonyDate',      label: 'موعد الحفل' },
  ] as const;

  saving = signal(false);
  hasCompetition = signal(false);

  form = this.fb.group({
    name: ['', Validators.required],
    year: [new Date().getFullYear(), Validators.required],
    village: [''],
    registrationOpen: [true],
    resultsPublished: [false],
    prizes: this.fb.group({
      full30: [0],
      half15: [0],
      ten10: [0],
      five5: [0],
    }),
    registrationStart: [null as Date | null],
    registrationEnd: [null as Date | null],
    examStart: [null as Date | null],
    examEnd: [null as Date | null],
    resultsDate: [null as Date | null],
    ceremonyDate: [null as Date | null],
  });

  ngOnInit(): void {
    const c = this.competitionSvc.active();
    if (c) {
      this.hasCompetition.set(true);
      this.form.patchValue({
        name: c.name,
        year: c.year,
        village: c.village ?? '',
        registrationOpen: c.registrationOpen ?? true,
        resultsPublished: c.resultsPublished ?? false,
        prizes: {
          full30: c.prizes?.full30 ?? 0,
          half15: c.prizes?.half15 ?? 0,
          ten10: c.prizes?.ten10 ?? 0,
          five5: c.prizes?.five5 ?? 0,
        },
        registrationStart: toDate(c.registrationStart),
        registrationEnd: toDate(c.registrationEnd),
        examStart: toDate(c.examStart),
        examEnd: toDate(c.examEnd),
        resultsDate: toDate(c.resultsDate),
        ceremonyDate: toDate(c.ceremonyDate),
      });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      await this.competitionSvc.saveSettings({
        name: v.name!,
        year: Number(v.year),
        village: v.village ?? '',
        registrationOpen: !!v.registrationOpen,
        resultsPublished: !!v.resultsPublished,
        prizes: {
          full30: Number(v.prizes?.full30 ?? 0),
          half15: Number(v.prizes?.half15 ?? 0),
          ten10: Number(v.prizes?.ten10 ?? 0),
          five5: Number(v.prizes?.five5 ?? 0),
        },
        registrationStart: v.registrationStart ?? new Date(),
        registrationEnd: v.registrationEnd ?? new Date(),
        examStart: v.examStart ?? new Date(),
        examEnd: v.examEnd ?? new Date(),
        resultsDate: v.resultsDate ?? new Date(),
        ceremonyDate: v.ceremonyDate ?? new Date(),
      } as Omit<Competition, 'id' | 'createdAt'>);
      this.hasCompetition.set(true);
      this.snack.open('تم حفظ إعدادات المسابقة', 'حسناً', { duration: 3000 });
    } catch {
      this.snack.open('تعذّر حفظ الإعدادات، حاول مرة أخرى', 'حسناً', { duration: 4000 });
    } finally {
      this.saving.set(false);
    }
  }
}
