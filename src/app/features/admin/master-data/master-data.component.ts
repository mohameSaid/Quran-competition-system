import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap, tap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { MasterDataService } from '../../../core/services/master-data.service';
import {
  MASTER_DATA_DOMAINS,
  MasterDataDomain,
  MasterDataItem,
} from '../../../core/models/platform/master-data.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * Generic Master Data manager. A single screen administers every lookup
 * domain (Configuration over Code) — pick a domain on the left, CRUD its
 * items on the right. Adding a new domain requires no new component.
 */
@Component({
  selector: 'app-master-data',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    EmptyStateComponent,
    HasPermissionDirective,
  ],
  template: `
    <div class="md">
      <header class="md__head">
        <div>
          <h1>البيانات المرجعية</h1>
          <p>إدارة القوائم القابلة للتهيئة من لوحة التحكم — دون تعديل الكود.</p>
        </div>
      </header>

      <div class="md__grid">
        <!-- Domain switcher -->
        <nav class="domains" aria-label="نطاقات البيانات">
          @for (d of domains; track d.domain) {
            <button
              class="domain"
              [class.active]="d.domain === selectedDomain()"
              (click)="selectDomain(d.domain)"
              [attr.aria-pressed]="d.domain === selectedDomain()">
              <mat-icon>{{ d.icon }}</mat-icon>
              <span>{{ d.label.ar }}</span>
            </button>
          }
        </nav>

        <!-- Items table + inline editor -->
        <section class="panel">
          <div class="panel__bar">
            <h2><mat-icon>{{ currentMeta().icon }}</mat-icon> {{ currentMeta().label.ar }}</h2>
            <button mat-flat-button class="btn-gold" (click)="startCreate()"
                    *appHasPermission="'masterData:create'">
              <mat-icon>add</mat-icon> إضافة عنصر
            </button>
          </div>

          @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

          @if (form(); as f) {
            <form class="editor" [formGroup]="f" (ngSubmit)="save()">
              <div class="editor__row">
                <mat-form-field appearance="outline">
                  <mat-label>الرمز (code)</mat-label>
                  <input matInput formControlName="code" dir="ltr" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>الاسم بالعربية</mat-label>
                  <input matInput formControlName="nameAr" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Name (English)</mat-label>
                  <input matInput formControlName="nameEn" dir="ltr" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="narrow">
                  <mat-label>الترتيب</mat-label>
                  <input matInput type="number" formControlName="order" />
                </mat-form-field>
                <mat-slide-toggle formControlName="isActive">مُفعّل</mat-slide-toggle>
              </div>
              <div class="editor__actions">
                <button mat-stroked-button type="button" (click)="cancelEdit()">إلغاء</button>
                <button mat-flat-button class="btn-gold" type="submit" [disabled]="f.invalid || saving()">
                  {{ editingId() ? 'حفظ التعديل' : 'إضافة' }}
                </button>
              </div>
            </form>
          }

          @if (items().length === 0 && !loading()) {
            <app-empty-state icon="inbox" message="لا توجد عناصر بعد — أضف أول عنصر." />
          } @else {
            <table class="tbl">
              <thead>
                <tr><th>الرمز</th><th>الاسم</th><th>الترتيب</th><th>الحالة</th><th></th></tr>
              </thead>
              <tbody>
                @for (item of items(); track item.id) {
                  <tr>
                    <td dir="ltr" class="mono">{{ item.code }}</td>
                    <td>{{ item.name.ar }}</td>
                    <td>{{ item.order }}</td>
                    <td>
                      <span class="pill" [class.pill--on]="item.isActive" [class.pill--off]="!item.isActive">
                        {{ item.isActive ? 'مفعّل' : 'معطّل' }}
                      </span>
                    </td>
                    <td class="actions">
                      <button mat-icon-button (click)="startEdit(item)" aria-label="تعديل"><mat-icon>edit</mat-icon></button>
                      <button mat-icon-button (click)="remove(item)" aria-label="حذف"><mat-icon>delete</mat-icon></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .md { padding: 24px; max-width: 1200px; margin-inline: auto; }
    .md__head h1 { font-size: 22px; font-weight: 800; color: var(--primary); }
    .md__head p { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
    .md__grid { display: grid; grid-template-columns: 240px 1fr; gap: 18px; margin-top: 18px; }
    @media (max-width: 860px) { .md__grid { grid-template-columns: 1fr; } }
    .domains { display: flex; flex-direction: column; gap: 4px; background: var(--card);
      border: 1px solid var(--border); border-radius: var(--r-lg); padding: 8px; height: fit-content; }
    @media (max-width: 860px) { .domains { flex-direction: row; flex-wrap: wrap; } }
    .domain { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: none;
      background: none; border-radius: 10px; cursor: pointer; font: inherit; font-size: 13px;
      color: var(--text-secondary); text-align: start; width: 100%; transition: .15s; }
    .domain:hover { background: var(--muted); }
    .domain.active { background: var(--secondary); color: var(--primary); font-weight: 700; }
    .domain mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .panel { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-lg);
      padding: 16px; overflow: hidden; }
    .panel__bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .panel__bar h2 { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; }
    .editor { background: var(--secondary); border-radius: var(--r-md); padding: 14px; margin-bottom: 16px; }
    .editor__row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .editor__row mat-form-field { flex: 1; min-width: 160px; }
    .editor__row .narrow { flex: 0 0 110px; min-width: 110px; }
    .editor__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: start; color: var(--text-muted); font-weight: 600; padding: 8px 10px;
      border-bottom: 2px solid var(--border); font-size: 12px; }
    .tbl td { padding: 10px; border-bottom: 1px solid var(--border); }
    .mono { font-family: ui-monospace, monospace; color: var(--text-secondary); }
    .actions { text-align: end; white-space: nowrap; }
    .pill { padding: 2px 10px; border-radius: var(--radius-pill); font-size: 11px; font-weight: 700; }
    .pill--on { background: #dcfce7; color: #166534; }
    .pill--off { background: #f3f4f6; color: #6b7280; }
  `],
})
export class MasterDataComponent {
  private readonly md = inject(MasterDataService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly domains = MASTER_DATA_DOMAINS;
  readonly selectedDomain = signal<MasterDataDomain>(MasterDataDomain.Provinces);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly form = signal<ReturnType<MasterDataComponent['buildForm']> | null>(null);

  readonly currentMeta = computed(
    () => this.domains.find((d) => d.domain === this.selectedDomain()) ?? this.domains[0],
  );

  private readonly items$ = toObservable(this.selectedDomain).pipe(
    tap(() => this.loading.set(true)),
    switchMap((domain) => this.md.list(domain).pipe(tap(() => this.loading.set(false)))),
  );

  readonly items = toSignal(this.items$, { initialValue: [] as MasterDataItem[] });

  selectDomain(domain: MasterDataDomain): void {
    this.cancelEdit();
    this.selectedDomain.set(domain);
  }

  private buildForm(item?: MasterDataItem) {
    return this.fb.nonNullable.group({
      code: [item?.code ?? '', [Validators.required, Validators.maxLength(64)]],
      nameAr: [item?.name.ar ?? '', [Validators.required]],
      nameEn: [item?.name.en ?? ''],
      order: [item?.order ?? this.items().length, [Validators.required, Validators.min(0)]],
      isActive: [item?.isActive ?? true],
    });
  }

  startCreate(): void {
    this.editingId.set(null);
    this.form.set(this.buildForm());
  }

  startEdit(item: MasterDataItem): void {
    this.editingId.set(item.id);
    this.form.set(this.buildForm(item));
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.set(null);
  }

  async save(): Promise<void> {
    const f = this.form();
    if (!f || f.invalid) return;
    this.saving.set(true);
    const v = f.getRawValue();
    const payload = {
      code: v.code.trim(),
      name: { ar: v.nameAr.trim(), ...(v.nameEn.trim() ? { en: v.nameEn.trim() } : {}) },
      order: v.order,
      isActive: v.isActive,
    };
    try {
      const id = this.editingId();
      if (id) {
        await this.md.update(this.selectedDomain(), id, payload);
        this.snack.open('تم حفظ التعديل', 'حسناً', { duration: 2500 });
      } else {
        await this.md.create(this.selectedDomain(), payload);
        this.snack.open('تمت الإضافة', 'حسناً', { duration: 2500 });
      }
      this.cancelEdit();
    } catch {
      this.snack.open('تعذّر الحفظ — حاول مجدداً', 'إغلاق', { duration: 4000 });
    } finally {
      this.saving.set(false);
    }
  }

  async remove(item: MasterDataItem): Promise<void> {
    const data: ConfirmDialogData = {
      title: 'حذف عنصر',
      message: `هل تريد حذف «${item.name.ar}»؟ لا يمكن التراجع.`,
      danger: true,
    };
    const ok = await this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().toPromise();
    if (!ok) return;
    try {
      await this.md.remove(this.selectedDomain(), item.id);
      this.snack.open('تم الحذف', 'حسناً', { duration: 2500 });
    } catch {
      this.snack.open('تعذّر الحذف', 'إغلاق', { duration: 4000 });
    }
  }
}
