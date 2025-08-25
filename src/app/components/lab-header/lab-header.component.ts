import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-lab-header',
  imports: [CommonModule, ButtonComponent],
  templateUrl: './lab-header.component.html',
  styleUrl: './lab-header.component.scss'
})
export class LabHeaderComponent {
  @Input() title: string = '';

  constructor(private router: Router) {}

  navigateBack() {
    this.router.navigate(['/labs']);
  }
}
