import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { lastValueFrom, Subscription } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { ProcessIconComponent } from '../../../../shared/components/process-icon/process-icon.component';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { ImportBtnComponent } from '../../../../shared/components/import-btn/import-btn.component';

@Component({
  selector: 'app-datacube-transformator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LabHeaderComponent,
    ImportBtnComponent,
    MatIconModule,
    MatProgressBarModule,
    MatRadioModule,
    ProcessIconComponent
  ],
  templateUrl: './datacube-transformator.component.html',
  styleUrls: ['./datacube-transformator.component.scss']
})
export class DatacubeTransformatorComponent implements OnInit, OnDestroy {
  // File state
  bsqFiles: File[] = [];
  hdrFiles: File[] = [];
  maskFile: File | null = null;
  customWeightsFile: File | null = null;

  // Configuration state
  weightsMode: 'climate' | 'anthropogenic' | 'custom' = 'climate';
  customWeightsMap: any = null;

  // Processing state
  isProcessing: boolean = false;
  processingProgress: number = 0;
  processingStatus: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  taskId: string | null = null;
  
  private processingInterval: any;

  constructor(
    private seoService: SeoService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('datacube-transformator'));
  }

  ngOnDestroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  // --- Event Handlers ---

  onBsqFilesSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.bsqFiles = [...this.bsqFiles, ...files];
    this.errorMessage = '';
  }

  removeBsqFile(index: number): void {
    this.bsqFiles.splice(index, 1);
  }

  onHdrFilesSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.hdrFiles = [...this.hdrFiles, ...files];
    this.errorMessage = '';
  }

  removeHdrFile(index: number): void {
    this.hdrFiles.splice(index, 1);
  }

  onMaskFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.maskFile = file;
    }
  }

  removeMaskFile(): void {
    this.maskFile = null;
  }

  onCustomWeightsSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.customWeightsFile = file;
      this.parseCustomWeights(file);
    }
  }

  removeCustomWeightsFile(): void {
    this.customWeightsFile = null;
    this.customWeightsMap = null;
  }
  
  private parseCustomWeights(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const map: any = {};
        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith('#')) continue;
          if (line.includes('=')) {
            const parts = line.split('=');
            if (parts.length === 2) {
              const key = parts[0].trim().replace(/^"|"$/g, '');
              const val = parseFloat(parts[1].trim());
              if (!isNaN(val)) {
                map[key] = val;
              }
            }
          }
        }
        this.customWeightsMap = map;
        console.log('Parsed custom weights:', map);
      } catch (err) {
        this.errorMessage = 'Failed to parse custom weights file. Ensure it is format: "Band Name" = 0.5';
      }
    };
    reader.readAsText(file);
  }

  // --- Processing Logic ---

  async startProcessing(): Promise<void> {
    if (this.bsqFiles.length === 0) {
      this.errorMessage = 'Please upload at least one .bsq file.';
      return;
    }

    if (this.weightsMode === 'custom' && !this.customWeightsFile) {
      this.errorMessage = 'Please upload your custom weights ASCII file.';
      return;
    }

    if (this.weightsMode === 'custom' && !this.customWeightsMap) {
      this.errorMessage = 'Custom weights file could not be parsed.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isProcessing = true;
    this.processingProgress = 0;
    this.processingStatus = 'Initializing upload...';
    this.taskId = null;

    try {
      // 1. Upload files
      const fileId = 'transformator_' + Math.random().toString(36).substring(2, 15);
      const allFiles = [...this.bsqFiles, ...this.hdrFiles];
      if (this.maskFile) {
        allFiles.push(this.maskFile);
      }
      
      const totalFiles = allFiles.length;
      
      for (let i = 0; i < allFiles.length; i++) {
        this.processingStatus = `Uploading file ${i + 1} of ${totalFiles}: ${allFiles[i].name}...`;
        await this.uploadFileInChunks(allFiles[i], fileId);
        this.processingProgress = Math.floor(((i + 1) / totalFiles) * 30); // 30% for upload
      }

      // 2. Start Processing
      this.processingStatus = 'Starting backend processing...';
      const payload = {
        file_id: fileId,
        weights_mode: this.weightsMode,
        custom_weights: this.customWeightsMap || {}
      };
      
      const response: any = await lastValueFrom(
        this.http.post(`${environment.ewaldApiUrl}/ewald/transformator/process`, payload)
      );
      
      if (response.status !== 0) {
        throw new Error(response.message || 'Failed to start processing');
      }
      
      this.taskId = response.task_id;
      
      // 3. Poll for status
      this.pollStatus();
      
    } catch (error: any) {
      this.isProcessing = false;
      this.errorMessage = error.message || 'An error occurred during processing.';
      console.error(error);
    }
  }
  
  private async uploadFileInChunks(file: File, fileId: string): Promise<void> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('file_id', fileId);
      formData.append('filename', file.name);
      formData.append('chunk_index', chunkIndex.toString());
      formData.append('total_chunks', totalChunks.toString());
      
      await lastValueFrom(
        this.http.post(`${environment.ewaldApiUrl}/ewald/samples/upload-chunk`, formData)
      );
    }
  }
  
  private pollStatus(): void {
    if (!this.taskId) return;
    
    this.processingInterval = setInterval(async () => {
      try {
        const response: any = await lastValueFrom(
          this.http.get(`${environment.ewaldApiUrl}/ewald/transformator/status/${this.taskId}`)
        );
        
        if (response.status === 0 && response.task) {
          const task = response.task;
          
          if (task.status === 'failed') {
            clearInterval(this.processingInterval);
            this.isProcessing = false;
            this.errorMessage = 'Processing failed: ' + (task.error || 'Unknown error');
            return;
          }
          
          // Map backend progress (0-100) to our remaining 30-100%
          const backendProgress = task.progress || 0;
          this.processingProgress = 30 + Math.floor(backendProgress * 0.7);
          this.processingStatus = task.message || 'Processing...';
          
          if (task.status === 'completed' || task.progress >= 100) {
            clearInterval(this.processingInterval);
            this.completeProcessing();
          }
        }
      } catch (error) {
        console.error('Error polling status', error);
      }
    }, 2000);
  }

  private completeProcessing(): void {
    this.isProcessing = false;
    this.processingProgress = 100;
    this.successMessage = 'Stacks processed successfully!';
  }

  // --- Download Logic ---
  
  downloadAsZip(): void {
    if (!this.taskId) {
      this.errorMessage = 'No task ID available for download.';
      return;
    }
    window.location.href = `${environment.ewaldApiUrl}/ewald/transformator/download/${this.taskId}`;
  }
}
