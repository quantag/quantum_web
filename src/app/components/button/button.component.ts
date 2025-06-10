import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonColor } from '../../types/color.type';
import { ButtonType } from '../../types/button.type';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  @Input() type: ButtonType = 'flat';
  @Input() color: ButtonColor = 'primary';
  @Input() icon: string = '';
  @Input() customIcon: string = '';
  @Input() label: string = '';
  @Input() tooltip: string = '';
  @Input() ariaLabel: string = '';
  @Input() iconPosition: 'before' | 'after' = 'before';
  @Input() fullWidth: boolean = false;
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false
  @Input() testId: string = '';
  
  @Output() clicked = new EventEmitter<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (!this.loading) {
      this.clicked.emit(event);
    }
  }
}
