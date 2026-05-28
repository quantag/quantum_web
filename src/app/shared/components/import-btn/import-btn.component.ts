import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UploadIconComponent } from '../upload-icon/upload-icon.component';

@Component({
  selector: 'app-import-btn',
  standalone: true,
  imports: [CommonModule, MatIconModule, UploadIconComponent],
  templateUrl: './import-btn.component.html',
  styleUrls: ['./import-btn.component.scss']
})
export class ImportBtnComponent {
  @Input() inputId: string = `import-btn-${Math.random().toString(36).substring(2, 9)}`;
  @Input() label: string = '';
  @Input() labelIcon: string = '';
  
  @Input() accept: string = '';
  @Input() multiple: boolean = false;
  @Input() disabled: boolean = false;
  
  @Input() useAppUploadIcon: boolean = false;
  @Input() buttonIcon: string = 'upload_file';
  @Input() buttonText: string = 'Choose Files';
  
  @Input() files: File[] = [];
  @Input() emptyText: string = 'No files selected';
  
  @Input() isInline: boolean = false;

  @Output() filesSelected = new EventEmitter<Event>();
  @Output() fileRemoved = new EventEmitter<number>();

  onFilesSelected(event: Event): void {
    this.filesSelected.emit(event);
  }

  onRemoveFile(index: number): void {
    this.fileRemoved.emit(index);
  }
}
