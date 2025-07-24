import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockCloudFilesService as CloudFilesService, FileItem, FileMetadata } from '../../services/mock-cloud-files.service';

@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-manager.component.html',
  styleUrl: './file-manager.component.scss'
})
export class FileManagerComponent implements OnInit {
  currentPath = '/';
  fileItems: FileItem[] = [];
  loading = false;
  errorMessage = '';
  newFolderName = '';
  selectedFiles: FileList | null = null;
  renamingItem: FileItem | null = null;
  newName = '';
  fileMetadata: Map<string, FileMetadata> = new Map();

  constructor(private cloudFilesService: CloudFilesService) {}

  ngOnInit() {
    this.loadDirectory();
  }

  loadDirectory() {
    this.loading = true;
    this.errorMessage = '';
    
    this.cloudFilesService.listDirectory(this.currentPath).subscribe({
      next: (items) => {
        this.fileItems = items;
        //sort fileitems by type and name
        this.fileItems.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        this.loadMetadataForItems();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = `Error loading directory: ${error.message}`;
        this.loading = false;
      }
    });
  }

  private loadMetadataForItems() {
    this.fileItems.forEach(item => {
      const itemPath = this.joinPaths(this.currentPath, item.name);
      this.cloudFilesService.getFileMetadata(itemPath).subscribe({
        next: (metadata) => {
          this.fileMetadata.set(item.name, metadata);
        },
        error: (error) => {
          console.warn(`Could not load metadata for ${item.name}:`, error);
        }
      });
    });
  }

  handleDoubleClick(item: FileItem) {
    if (item.isDirectory) {
      this.navigateToFolder(item.name);
    } else {
      this.downloadFile(item.name);
    }
  }

  navigateToFolder(folderName: string) {
    this.currentPath = this.joinPaths(this.currentPath, folderName);
    this.loadDirectory();
  }

  goUp() {
    if (this.currentPath !== '/') {
      const pathParts = this.currentPath.split('/').filter(part => part);
      pathParts.pop();
      this.currentPath = '/' + pathParts.join('/');
      if (this.currentPath !== '/') {
        this.currentPath += '/';
      }
      this.loadDirectory();
    }
  }

  refresh() {
    this.loadDirectory();
  }

  createNewFolder() {
    if (!this.newFolderName.trim()) return;

    const folderPath = this.joinPaths(this.currentPath, this.newFolderName.trim());
    
    this.cloudFilesService.createFolder(folderPath).subscribe({
      next: () => {
        this.newFolderName = '';
        this.loadDirectory();
      },
      error: (error) => {
        this.errorMessage = `Error creating folder: ${error.message}`;
      }
    });
  }

  onFileSelected(event: any) {
    this.selectedFiles = event.target.files;
  }

  uploadFiles() {
    if (!this.selectedFiles) return;

    const uploadPromises: Promise<any>[] = [];

    for (let i = 0; i < this.selectedFiles.length; i++) {
      const file = this.selectedFiles[i];
      const filePath = this.joinPaths(this.currentPath, file.name);
      
      const uploadPromise = this.cloudFilesService.uploadFile(filePath, file).toPromise();
      uploadPromises.push(uploadPromise);
    }

    Promise.all(uploadPromises).then(
      () => {
        this.selectedFiles = null;
        // Clear the file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        this.loadDirectory();
      },
      (error) => {
        this.errorMessage = `Error uploading files: ${error.message}`;
      }
    );
  }

  downloadFile(fileName: string) {
    const filePath = this.joinPaths(this.currentPath, fileName);
    this.cloudFilesService.downloadFile(filePath, fileName);
  }

  deleteItem(itemName: string) {
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;

    const itemPath = this.joinPaths(this.currentPath, itemName);
    
    this.cloudFilesService.deleteFile(itemPath).subscribe({
      next: () => {
        this.loadDirectory();
      },
      error: (error) => {
        this.errorMessage = `Error deleting item: ${error.message}`;
      }
    });
  }

  startRename(item: FileItem) {
    this.renamingItem = item;
    this.newName = item.name;
  }

  confirmRename() {
    if (!this.renamingItem || !this.newName.trim()) return;

    const oldPath = this.joinPaths(this.currentPath, this.renamingItem.name);
    const newPath = this.joinPaths(this.currentPath, this.newName.trim());

    this.cloudFilesService.renameFile(oldPath, newPath).subscribe({
      next: () => {
        this.renamingItem = null;
        this.newName = '';
        this.loadDirectory();
      },
      error: (error) => {
        this.errorMessage = `Error renaming item: ${error.message}`;
      }
    });
  }

  cancelRename() {
    this.renamingItem = null;
    this.newName = '';
  }

  getItemSize(item: FileItem): string {
    const metadata = this.fileMetadata.get(item.name);
    if (!metadata) return '-';
    
    if (item.isDirectory) return '-';
    
    return this.formatBytes(metadata.size);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private joinPaths(...paths: string[]): string {
    return paths
      .join('/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '') || '/';
  }
}
