import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-lab-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './lab-header.component.html',
  styleUrl: './lab-header.component.scss'
})
export class LabHeaderComponent {
  @Input() title: string = '';

}
