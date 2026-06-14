import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div style="text-align:center;padding:48px 24px;color:var(--text-muted);font-family:Cairo,sans-serif">
      <mat-icon style="font-size:52px;width:52px;height:52px;opacity:.25">{{ icon }}</mat-icon>
      <p style="margin-top:14px;font-size:14px">{{ message }}</p>
    </div>`,
})
export class EmptyStateComponent {
  @Input() icon    = 'inbox';
  @Input() message = 'لا توجد بيانات';
}
