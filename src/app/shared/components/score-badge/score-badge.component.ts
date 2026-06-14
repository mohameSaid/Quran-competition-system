import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-score-badge',
  standalone: true,
  imports: [NgClass],
  template: `<span class="badge" [ngClass]="cls">{{ total }}</span>`,
  styles: [`.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}`]
})
export class ScoreBadgeComponent {
  @Input({ required: true }) total!: number;
  get cls(): string {
    if (this.total >= 90) return 'badge--gold';
    if (this.total >= 70) return 'badge--green';
    if (this.total >= 60) return 'badge--blue';
    return 'badge--red';
  }
}
