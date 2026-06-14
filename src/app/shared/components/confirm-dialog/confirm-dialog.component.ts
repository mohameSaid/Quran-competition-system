import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogData {
  title:   string;
  message: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content><p>{{ data.message }}</p></mat-dialog-content>
      <mat-dialog-actions align="end" style="gap:8px">
        <button mat-stroked-button (click)="ref.close(false)">إلغاء</button>
        <button mat-flat-button
          [class.btn-gold]="!data.danger"
          [class.btn-danger]="data.danger"
          (click)="ref.close(true)">تأكيد</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog { padding: 8px; min-width: 320px; }
    h2 { color: var(--text-primary); font-family: 'Cairo',sans-serif; }
    p  { color: var(--text-secondary); font-size: 14px; margin-top: 8px; }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public ref: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
