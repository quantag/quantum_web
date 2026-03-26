import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { lastValueFrom, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DirectoryParserService } from '../../../../services/directory-parser.service';

@Component({
  selector: 'app-sample-selection-dialog',
  templateUrl: './sample-selection-dialog.component.html',
  styleUrls: ['./sample-selection-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule]
})
export class SampleSelectionDialogComponent implements OnInit {
  samples: string[] = [];
  isLoadingSamples = false;
  
  private readonly PROD_API_URL = 'https://quantum.quantag-it.com/envi-api';
  private readonly APACHE_SAMPLES_URL = 'https://quantag-it.com/pub/samples/ewald/';
  
  // Upload state
  isUploading = false;
  uploadProgress = 0;
  uploadError = '';
  
  bsqFile: File | null = null;
  hdrFile: File | null = null;
  newSampleName = '';

  constructor(
    public dialogRef: MatDialogRef<SampleSelectionDialogComponent>,
    private http: HttpClient,
    private directoryParser: DirectoryParserService
  ) {}

  ngOnInit() {
    this.loadSamples();
  }

  loadSamples() {
    this.isLoadingSamples = true;
    const apacheUrl = this.APACHE_SAMPLES_URL;
    
    // Fetch only from remote Apache server (production source of truth)
    this.http.get(apacheUrl, { responseType: 'text' }).pipe(
      map(html => {
        const bsqFiles = this.directoryParser.parseDirectoryListing(html, apacheUrl, '.bsq');
        const hdrFiles = this.directoryParser.parseDirectoryListing(html, apacheUrl, '.hdr');
        const res = new Set<string>();
        bsqFiles.forEach(dataFile => {
            const baseName = dataFile.name.replace(/\.bsq$/, '');
            if (hdrFiles.some(h => h.name === baseName + '.hdr')) res.add(baseName);
        });
        return Array.from(res);
      }),
      catchError(err => {
        console.warn('Error loading remote samples', err);
        return of([] as string[]);
      })
    ).subscribe({
      next: (combinedSamples) => {
        this.samples = combinedSamples.sort();
        this.isLoadingSamples = false;
      },
      error: () => {
        this.isLoadingSamples = false;
      }
    });
  }

  selectSample(sampleName: string) {
    this.dialogRef.close(sampleName);
  }

  onBsqSelected(event: any) {
    this.bsqFile = event.target.files[0];
  }

  onHdrSelected(event: any) {
    this.hdrFile = event.target.files[0];
  }

  async uploadNewSample() {
    if (!this.bsqFile || !this.hdrFile || !this.newSampleName) {
      this.uploadError = 'Please provide a name and select both BSQ and HDR files.';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadError = '';

    const fileId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
    
    try {
      // We will upload BSQ then HDR
      await this.uploadFileInChunks(this.bsqFile, fileId, this.newSampleName, 'bsq');
      this.uploadProgress = 50; 
      await this.uploadFileInChunks(this.hdrFile, fileId, this.newSampleName, 'hdr');
      this.uploadProgress = 100;

      // Finalize
      await this.finalizeUpload(fileId, this.newSampleName);
      
      // Reset form and reload samples
      this.bsqFile = null;
      this.hdrFile = null;
      this.newSampleName = '';
      this.isUploading = false;
      this.loadSamples();
      
    } catch (error: any) {
      console.error('Upload failed', error);
      this.uploadError = error.message || 'Upload failed.';
      this.isUploading = false;
    }
  }

  private async uploadFileInChunks(file: File, fileId: string, sampleName: string, type: 'bsq'|'hdr') {
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file_id', fileId);
        formData.append('chunk_index', i.toString());
        formData.append('total_chunks', totalChunks.toString());
        formData.append('filename', file.name);
        formData.append('file', chunk);
        
        // Always upload to remote API server
        await lastValueFrom(this.http.post<any>(`${this.PROD_API_URL}/envi/samples/upload-chunk`, formData));

        // Progress weight
        const baseProgress = type === 'bsq' ? 0 : 50;
        const currentTypeProgress = ((i + 1) / totalChunks) * 50;
        this.uploadProgress = baseProgress + currentTypeProgress;
    }
  }

  private async finalizeUpload(fileId: string, sampleName: string) {
    // Always finalize on remote API server
    return lastValueFrom(this.http.post<any>(`${this.PROD_API_URL}/envi/samples/finalize`, {
      file_id: fileId,
      sample_name: sampleName
    }));
  }
}
