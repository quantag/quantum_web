import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface FileItem {
  name: string;
  isDirectory: boolean;
}

export interface FileMetadata {
  isDirectory: boolean;
  ctime: number;
  mtime: number;
  size: number;
}

export interface SuccessResponse {
  success: boolean;
}

export interface RenameRequest {
  oldPath: string;
  newPath: string;
}

interface MockFile {
  name: string;
  isDirectory: boolean;
  content?: string;
  size: number;
  ctime: number;
  mtime: number;
  children?: MockFile[];
}

@Injectable({
  providedIn: 'root'
})
export class MockCloudFilesService {
  private mockFileSystem: MockFile = {
    name: '',
    isDirectory: true,
    size: 0,
    ctime: Date.now() - 86400000,
    mtime: Date.now() - 86400000,
    children: [
      {
        name: 'Documents',
        isDirectory: true,
        size: 0,
        ctime: Date.now() - 86400000,
        mtime: Date.now() - 86400000,
        children: [
          {
            name: 'readme.txt',
            isDirectory: false,
            content: 'This is a sample readme file.\nIt contains some text content.',
            size: 58,
            ctime: Date.now() - 43200000,
            mtime: Date.now() - 43200000
          },
          {
            name: 'project-notes.md',
            isDirectory: false,
            content: '# Project Notes\n\n## Overview\nThis is a markdown file with project notes.',
            size: 75,
            ctime: Date.now() - 21600000,
            mtime: Date.now() - 21600000
          },
          {
            name: 'Subfolder',
            isDirectory: true,
            size: 0,
            ctime: Date.now() - 86400000,
            mtime: Date.now() - 86400000,
            children: [
              {
                name: 'nested-file.json',
                isDirectory: false,
                content: '{"name": "test", "value": 123}',
                size: 28,
                ctime: Date.now() - 10800000,
                mtime: Date.now() - 10800000
              }
            ]
          }
        ]
      },
      {
        name: 'Images',
        isDirectory: true,
        size: 0,
        ctime: Date.now() - 172800000,
        mtime: Date.now() - 172800000,
        children: [
          {
            name: 'sample.jpg',
            isDirectory: false,
            content: 'fake-image-data',
            size: 1024000,
            ctime: Date.now() - 172800000,
            mtime: Date.now() - 172800000
          },
          {
            name: 'screenshot.png',
            isDirectory: false,
            content: 'fake-png-data',
            size: 512000,
            ctime: Date.now() - 86400000,
            mtime: Date.now() - 86400000
          }
        ]
      },
      {
        name: 'Scripts',
        isDirectory: true,
        size: 0,
        ctime: Date.now() - 259200000,
        mtime: Date.now() - 259200000,
        children: [
          {
            name: 'deploy.sh',
            isDirectory: false,
            content: '#!/bin/bash\necho "Deploying application..."\n',
            size: 45,
            ctime: Date.now() - 259200000,
            mtime: Date.now() - 259200000
          },
          {
            name: 'backup.py',
            isDirectory: false,
            content: 'import os\nprint("Running backup script")\n',
            size: 42,
            ctime: Date.now() - 172800000,
            mtime: Date.now() - 172800000
          }
        ]
      },
      {
        name: 'config.yaml',
        isDirectory: false,
        content: 'server:\n  host: localhost\n  port: 3000\ndatabase:\n  url: mongodb://localhost:27017\n',
        size: 85,
        ctime: Date.now() - 432000000,
        mtime: Date.now() - 21600000
      },
      {
        name: 'package.json',
        isDirectory: false,
        content: '{\n  "name": "my-app",\n  "version": "1.0.0",\n  "main": "index.js"\n}',
        size: 72,
        ctime: Date.now() - 604800000,
        mtime: Date.now() - 86400000
      }
    ]
  };

  constructor() {}

  /**
   * List directory contents
   * @param path Directory path to list
   * @returns Observable<FileItem[]>
   */
  listDirectory(path: string): Observable<FileItem[]> {
    const normalizedPath = this.normalizePath(path);
    const directory = this.findDirectory(normalizedPath);
    
    if (!directory) {
      return throwError(() => new Error(`Directory not found: ${path}`)).pipe(delay(300));
    }

    if (!directory.isDirectory) {
      return throwError(() => new Error(`Path is not a directory: ${path}`)).pipe(delay(300));
    }

    const items: FileItem[] = (directory.children || []).map(child => ({
      name: child.name,
      isDirectory: child.isDirectory
    }));

    return of(items).pipe(delay(500)); // Simulate network delay
  }

  /**
   * Get file/folder metadata (stat)
   * @param path File or folder path
   * @returns Observable<FileMetadata>
   */
  getFileMetadata(path: string): Observable<FileMetadata> {
    const normalizedPath = this.normalizePath(path);
    const item = this.findItem(normalizedPath);
    
    if (!item) {
      return throwError(() => new Error(`File or directory not found: ${path}`)).pipe(delay(200));
    }

    const metadata: FileMetadata = {
      isDirectory: item.isDirectory,
      ctime: item.ctime,
      mtime: item.mtime,
      size: item.size
    };

    return of(metadata).pipe(delay(200));
  }

  /**
   * Read file content
   * @param path File path to read
   * @returns Observable<Blob>
   */
  readFile(path: string): Observable<Blob> {
    const normalizedPath = this.normalizePath(path);
    const file = this.findItem(normalizedPath);
    
    if (!file) {
      return throwError(() => new Error(`File not found: ${path}`)).pipe(delay(300));
    }

    if (file.isDirectory) {
      return throwError(() => new Error(`Path is a directory, not a file: ${path}`)).pipe(delay(300));
    }

    const blob = new Blob([file.content || ''], { type: 'application/octet-stream' });
    return of(blob).pipe(delay(400));
  }

  /**
   * Read file content as text
   * @param path File path to read
   * @returns Observable<string>
   */
  readFileAsText(path: string): Observable<string> {
    const normalizedPath = this.normalizePath(path);
    const file = this.findItem(normalizedPath);
    
    if (!file) {
      return throwError(() => new Error(`File not found: ${path}`)).pipe(delay(300));
    }

    if (file.isDirectory) {
      return throwError(() => new Error(`Path is a directory, not a file: ${path}`)).pipe(delay(300));
    }

    return of(file.content || '').pipe(delay(400));
  }

  /**
   * Write file content
   * @param path File path to write
   * @param content File content as Blob, File, or string
   * @returns Observable<SuccessResponse>
   */
  writeFile(path: string, content: Blob | File | string): Observable<SuccessResponse> {
    return new Observable<SuccessResponse>((observer) => {
      setTimeout(async () => {
        try {
          const normalizedPath = this.normalizePath(path);
          const pathParts = normalizedPath.split('/').filter(part => part);
          const fileName = pathParts.pop() || '';
          const dirPath = '/' + pathParts.join('/');
          
          const directory = this.findDirectory(dirPath);
          if (!directory) {
            observer.error(new Error(`Directory not found: ${dirPath}`));
            return;
          }

          let fileContent = '';
          if (typeof content === 'string') {
            fileContent = content;
          } else if (content instanceof File) {
            // For File objects, we'll just use the name and simulate content
            fileContent = `File content for: ${content.name}`;
          } else {
            // For Blob, convert to text
            fileContent = await content.text();
          }

          // Find existing file or create new one
          const existingFileIndex = (directory.children || []).findIndex(
            child => child.name === fileName && !child.isDirectory
          );

          const now = Date.now();
          const newFile: MockFile = {
            name: fileName,
            isDirectory: false,
            content: fileContent,
            size: fileContent.length,
            ctime: existingFileIndex >= 0 ? directory.children![existingFileIndex].ctime : now,
            mtime: now
          };

          if (!directory.children) {
            directory.children = [];
          }

          if (existingFileIndex >= 0) {
            directory.children[existingFileIndex] = newFile;
          } else {
            directory.children.push(newFile);
          }

          observer.next({ success: true });
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      }, 600);
    });
  }

  /**
   * Delete file or folder
   * @param path File or folder path to delete
   * @returns Observable<SuccessResponse>
   */
  deleteFile(path: string): Observable<SuccessResponse> {
    const normalizedPath = this.normalizePath(path);
    const pathParts = normalizedPath.split('/').filter(part => part);
    const itemName = pathParts.pop() || '';
    const dirPath = '/' + pathParts.join('/');
    
    const directory = this.findDirectory(dirPath);
    if (!directory || !directory.children) {
      return throwError(() => new Error(`Directory not found: ${dirPath}`)).pipe(delay(300));
    }

    const itemIndex = directory.children.findIndex(child => child.name === itemName);
    if (itemIndex === -1) {
      return throwError(() => new Error(`File or directory not found: ${path}`)).pipe(delay(300));
    }

    directory.children.splice(itemIndex, 1);
    return of({ success: true }).pipe(delay(400));
  }

  /**
   * Create a folder
   * @param path Folder path to create
   * @returns Observable<SuccessResponse>
   */
  createFolder(path: string): Observable<SuccessResponse> {
    const normalizedPath = this.normalizePath(path);
    const pathParts = normalizedPath.split('/').filter(part => part);
    const folderName = pathParts.pop() || '';
    const dirPath = '/' + pathParts.join('/');
    
    const directory = this.findDirectory(dirPath);
    if (!directory) {
      return throwError(() => new Error(`Directory not found: ${dirPath}`)).pipe(delay(300));
    }

    if (!directory.children) {
      directory.children = [];
    }

    // Check if folder already exists
    const existingFolder = directory.children.find(
      child => child.name === folderName
    );
    if (existingFolder) {
      return throwError(() => new Error(`Folder already exists: ${path}`)).pipe(delay(300));
    }

    const now = Date.now();
    const newFolder: MockFile = {
      name: folderName,
      isDirectory: true,
      size: 0,
      ctime: now,
      mtime: now,
      children: []
    };

    directory.children.push(newFolder);
    return of({ success: true }).pipe(delay(400));
  }

  /**
   * Rename or move a file/folder
   * @param oldPath Current file/folder path
   * @param newPath New file/folder path
   * @returns Observable<SuccessResponse>
   */
  renameFile(oldPath: string, newPath: string): Observable<SuccessResponse> {
    const normalizedOldPath = this.normalizePath(oldPath);
    const normalizedNewPath = this.normalizePath(newPath);
    
    const oldPathParts = normalizedOldPath.split('/').filter(part => part);
    const newPathParts = normalizedNewPath.split('/').filter(part => part);
    
    const oldItemName = oldPathParts.pop() || '';
    const newItemName = newPathParts.pop() || '';
    
    const oldDirPath = '/' + oldPathParts.join('/');
    const newDirPath = '/' + newPathParts.join('/');
    
    const oldDirectory = this.findDirectory(oldDirPath);
    const newDirectory = this.findDirectory(newDirPath);
    
    if (!oldDirectory || !oldDirectory.children) {
      return throwError(() => new Error(`Source directory not found: ${oldDirPath}`)).pipe(delay(300));
    }
    
    if (!newDirectory) {
      return throwError(() => new Error(`Destination directory not found: ${newDirPath}`)).pipe(delay(300));
    }

    const itemIndex = oldDirectory.children.findIndex(child => child.name === oldItemName);
    if (itemIndex === -1) {
      return throwError(() => new Error(`File or directory not found: ${oldPath}`)).pipe(delay(300));
    }

    const item = oldDirectory.children[itemIndex];
    
    // Check if destination already exists
    if (newDirectory.children && newDirectory.children.some(child => child.name === newItemName)) {
      return throwError(() => new Error(`Destination already exists: ${newPath}`)).pipe(delay(300));
    }

    // Remove from old location
    oldDirectory.children.splice(itemIndex, 1);
    
    // Add to new location with new name
    item.name = newItemName;
    item.mtime = Date.now();
    
    if (!newDirectory.children) {
      newDirectory.children = [];
    }
    newDirectory.children.push(item);

    return of({ success: true }).pipe(delay(500));
  }

  /**
   * Upload a file from input element
   * @param path Target path for the file
   * @param file File object from input element
   * @returns Observable<SuccessResponse>
   */
  uploadFile(path: string, file: File): Observable<SuccessResponse> {
    return this.writeFile(path, file);
  }

  /**
   * Download a file and trigger browser download
   * @param path File path to download
   * @param filename Optional filename for download
   */
  downloadFile(path: string, filename?: string): void {
    this.readFile(path).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || path.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading file:', error);
      }
    });
  }

  /**
   * Check if a path exists
   * @param path Path to check
   * @returns Observable<boolean>
   */
  pathExists(path: string): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      this.getFileMetadata(path).subscribe({
        next: () => {
          observer.next(true);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  // Helper methods
  private normalizePath(path: string): string {
    if (!path || path === '/') return '/';
    return path.startsWith('/') ? path : '/' + path;
  }

  private findDirectory(path: string): MockFile | null {
    if (path === '/') return this.mockFileSystem;
    
    const pathParts = path.split('/').filter(part => part);
    let current = this.mockFileSystem;
    
    for (const part of pathParts) {
      if (!current.children) return null;
      const found = current.children.find(child => child.name === part && child.isDirectory);
      if (!found) return null;
      current = found;
    }
    
    return current;
  }

  private findItem(path: string): MockFile | null {
    if (path === '/') return this.mockFileSystem;
    
    const pathParts = path.split('/').filter(part => part);
    const fileName = pathParts.pop();
    const dirPath = '/' + pathParts.join('/');
    
    const directory = this.findDirectory(dirPath);
    if (!directory || !directory.children) return null;
    
    return directory.children.find(child => child.name === fileName) || null;
  }
}
