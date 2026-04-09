import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule]
})
export class ExportDialogComponent {
  constructor(public dialogRef: MatDialogRef<ExportDialogComponent>) {}

  selectOption(option: 'screenshot' | 'model'): void {
    this.dialogRef.close(option);
  }
}
