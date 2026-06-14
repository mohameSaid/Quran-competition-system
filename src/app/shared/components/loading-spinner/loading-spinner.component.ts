import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:48px;color:var(--text-muted);font-family:Cairo,sans-serif">
      <mat-spinner [diameter]="diameter" />
      @if (message) { <p>{{ message }}</p> }
    </div>`,
})
export class LoadingSpinnerComponent {
  @Input() diameter = 40;
  @Input() message  = '';
}
