import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-medal',
  standalone: true,
  template: `<div class="medal" [class]="'medal--' + cls">{{ rank }}</div>`,
  styles: [`.medal{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}`]
})
export class MedalComponent {
  @Input({ required: true }) rank!: number;
  get cls(): string { return this.rank <= 3 ? String(this.rank) : 'n'; }
}
