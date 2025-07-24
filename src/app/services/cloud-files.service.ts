import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FileItem, FileMetadata, SuccessResponse, RenameRequest } from './mock-cloud-files.service';



@Injectable({
  providedIn: 'root'
})
export class CloudFilesService {
  private baseUrl = '/api'; // This will be proxied to your backend

  constructor(private http: HttpClient) {}

  /**
   * List directory contents
   * @param path Directory path to list
   * @returns Observable<FileItem[]>
   */
  listDirectory(path: string): Observable<FileItem[]> {
    return this.http.get<FileItem[]>(`${this.baseUrl}/list`, {
      params: { path }
    });
  }

  /**
   * Get file/folder metadata (stat)
   * @param path File or folder path
   * @returns Observable<FileMetadata>
   */
  getFileMetadata(path: string): Observable<FileMetadata> {
    return this.http.get<FileMetadata>(`${this.baseUrl}/stat`, {
      params: { path }
    });
  }

  /**
   * Read file content
   * @param path File path to read
   * @returns Observable<Blob>
   */
  readFile(path: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/file`, {
      params: { path },
      responseType: 'blob'
    });
  }

  /**
   * Read file content as text
   * @param path File path to read
   * @returns Observable<string>
   */
  readFileAsText(path: string): Observable<string> {
    return this.http.get(`${this.baseUrl}/file`, {
      params: { path },
      responseType: 'text'
    });
  }

  /**
   * Write file content
   * @param path File path to write
   * @param content File content as Blob, File, or string
   * @returns Observable<SuccessResponse>
   */
  writeFile(path: string, content: Blob | File | string): Observable<SuccessResponse> {
    let body: any;
    let headers = new HttpHeaders();

    if (typeof content === 'string') {
      body = content;
      headers = headers.set('Content-Type', 'text/plain');
    } else {
      body = content;
      headers = headers.set('Content-Type', 'application/octet-stream');
    }

    return this.http.post<SuccessResponse>(`${this.baseUrl}/file`, body, {
      params: { path },
      headers
    });
  }

  /**
   * Delete file or folder
   * @param path File or folder path to delete
   * @returns Observable<SuccessResponse>
   */
  deleteFile(path: string): Observable<SuccessResponse> {
    return this.http.delete<SuccessResponse>(`${this.baseUrl}/delete`, {
      params: { path }
    });
  }

  /**
   * Create a folder
   * @param path Folder path to create
   * @returns Observable<SuccessResponse>
   */
  createFolder(path: string): Observable<SuccessResponse> {
    return this.http.post<SuccessResponse>(`${this.baseUrl}/mkdir`, null, {
      params: { path }
    });
  }

  /**
   * Rename or move a file/folder
   * @param oldPath Current file/folder path
   * @param newPath New file/folder path
   * @returns Observable<SuccessResponse>
   */
  renameFile(oldPath: string, newPath: string): Observable<SuccessResponse> {
    const body: RenameRequest = { oldPath, newPath };
    return this.http.post<SuccessResponse>(`${this.baseUrl}/rename`, body);
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
}
