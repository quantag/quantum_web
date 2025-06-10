import { Component, Input } from '@angular/core';
import { IPlan } from '../../interfaces/plan.interface';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-plan-card',
  imports: [ButtonComponent],
  templateUrl: './plan-card.component.html',
  styleUrl: './plan-card.component.scss'
})
export class PlanCardComponent {
  @Input() plan: IPlan;
  @Input() sequence: number;


  onPlanSelect(plan: IPlan) {
  }
}
