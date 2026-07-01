import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { PersonService } from '../../../core/services/person.service';
import { Person } from '../../../core/models/platform/person.model';
import { ROLE_LABELS, RoleType } from '../../../core/models/platform/role.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

const PAGE_SIZE = 25;

/**
 * Unified Persons registry — the "Person First" record. Cursor-paginated
 * ("load more") so the list scales to large datasets without ever
 * loading the whole collection, plus prefix search served by an index.
 */
@Component({
  selector: 'app-persons',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="persons">
      <header class="persons__head">
        <div>
          <h1>الأشخاص</h1>
          <p>السجل الموحّد لجميع الأشخاص — طالب، محفّظ، محكّم، ولي أمر… بيانات واحدة لكل شخص.</p>
        </div>
        <mat-form-field appearance="outline" class="search">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>بحث بالاسم</mat-label>
          <input matInput [formControl]="searchCtrl" autocomplete="off" />
        </mat-form-field>
      </header>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (rows().length === 0 && !loading()) {
        <app-empty-state icon="group_off" message="لا يوجد أشخاص مطابقون." />
      } @else {
        <div class="cards">
          @for (p of rows(); track p.id) {
            <article class="card">
              <div class="avatar" [attr.aria-hidden]="true">{{ initial(p) }}</div>
              <div class="card__body">
                <h3>{{ p.fullName }}</h3>
                <div class="roles">
                  @for (r of p.roles; track r) {
                    <span class="chip">{{ roleLabel(r) }}</span>
                  } @empty {
                    <span class="chip chip--muted">بدون دور</span>
                  }
                </div>
                @if (primaryContact(p); as c) { <div class="contact" dir="ltr">{{ c }}</div> }
              </div>
              <span class="status" [class.status--active]="p.status === 'active'">{{ statusLabel(p.status) }}</span>
            </article>
          }
        </div>

        @if (!searching() && hasMore()) {
          <div class="more">
            <button mat-stroked-button (click)="loadMore()" [disabled]="loading()">تحميل المزيد</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .persons { padding: 24px; max-width: 1100px; margin-inline: auto; }
    .persons__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .persons__head h1 { font-size: 22px; font-weight: 800; color: var(--primary); }
    .persons__head p { color: var(--text-secondary); font-size: 13px; margin-top: 4px; max-width: 520px; }
    .search { width: 280px; max-width: 100%; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-top: 18px; }
    .card { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 14px; transition: box-shadow .18s, transform .18s; }
    .card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .avatar { width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center;
      justify-content: center; font-weight: 800; color: #fff; background: linear-gradient(135deg, var(--primary), var(--primary-light)); }
    .card__body { flex: 1; min-width: 0; }
    .card__body h3 { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .roles { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .chip { background: var(--secondary); color: var(--primary); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-pill); }
    .chip--muted { background: var(--muted); color: var(--text-muted); }
    .contact { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
    .status { font-size: 11px; font-weight: 700; color: var(--text-muted); align-self: flex-start; }
    .status--active { color: #16a34a; }
    .more { text-align: center; margin-top: 22px; }
  `],
})
export class PersonsComponent {
  private readonly persons = inject(PersonService);

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly pagedRows = signal<Person[]>([]);
  private cursor: unknown | null = null;

  /** Search results stream (independent of the paged list). */
  private readonly searchResults = toSignal(
    this.searchCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        const t = term.trim();
        return t.length < 2 ? of([] as Person[]) : this.persons.search(t);
      }),
    ),
    { initialValue: [] as Person[] },
  );

  readonly searching = signal(false);

  constructor() {
    // React to the search box: <2 chars ⇒ paginated list, else results.
    this.searchCtrl.valueChanges.pipe(startWith('')).subscribe((v) => {
      const active = v.trim().length >= 2;
      this.searching.set(active);
      if (!active && this.pagedRows().length === 0) void this.loadMore();
    });
    void this.loadMore();
  }

  readonly rows = () => (this.searching() ? this.searchResults() : this.pagedRows());

  async loadMore(): Promise<void> {
    this.loading.set(true);
    try {
      const page = await this.persons.getPage({ pageSize: PAGE_SIZE, cursor: this.cursor });
      this.cursor = page.cursor;
      this.hasMore.set(page.hasMore);
      this.pagedRows.update((prev) => [...prev, ...page.items]);
    } finally {
      this.loading.set(false);
    }
  }

  initial(p: Person): string {
    return p.fullName?.trim().charAt(0) || '؟';
  }

  primaryContact(p: Person): string | null {
    return p.contacts?.find((c) => c.isPrimary)?.value ?? p.contacts?.[0]?.value ?? null;
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role as RoleType] ?? role;
  }

  statusLabel(status: string): string {
    return status === 'active' ? 'نشط' : status === 'blocked' ? 'محظور' : 'غير نشط';
  }
}
