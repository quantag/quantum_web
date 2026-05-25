import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spinner" [style.--spinner-color]="background || '#667eea'">
      <div *ngFor="let i of [0,1,2,3,4,5,6,7,8,9,10,11]" class="spinner-blade" [style.transform]="'rotate(' + (i * 30) + 'deg) translate(0, -130%)'" [style.animation-delay]="(i * 0.083 - 1) + 's'"></div>
    </div>
  `,
  styles: [`
    .spinner {
      position: relative;
      width: 24px;
      height: 24px;
      display: inline-block;
      vertical-align: middle;
    }

    .spinner-blade {
      position: absolute;
      left: 46%;
      top: 46%;
      width: 8%;
      height: 24%;
      background-color: var(--spinner-color, #667eea);
      border-radius: 20%;
      animation: spinner-fade 1s linear infinite;
      transform-origin: center center;
    }

    @keyframes spinner-fade {
      0% { opacity: 0.85; }
      50% { opacity: 0.25; }
      100% { opacity: 0.25; }
    }
  `]
})
export class CustomSpinnerComponent {
  @Input() background?: string;
}
