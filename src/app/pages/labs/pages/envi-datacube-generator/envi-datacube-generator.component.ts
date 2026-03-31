import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { environment } from '../../../../../environments/environment';
import { lastValueFrom, interval, Subscription } from 'rxjs';
import { takeWhile, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-envi-datacube-generator',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LabHeaderComponent,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './envi-datacube-generator.component.html',
  styleUrls: ['./envi-datacube-generator.component.scss']
})
export class EnviDatacubeGeneratorComponent implements OnInit, OnDestroy {
  bipFile: File | null = null;
  hdrFile: File | null = null;
  bipFileName: string = '';
  hdrFileName: string = '';
  
  year: number = 2023;
  
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadStatus: string = '';
  
  isGenerating: boolean = false;
  generationProgress: number = 0;
  generationStatus: string = '';
  taskId: string | null = null;
  
  errorMessage: string = '';
  successMessage: string = '';
  generatedSampleName: string | null = null;
  
  private progressSubscription?: Subscription;
  private readonly API_URL = environment.enviApiUrl;

  constructor(
    private http: HttpClient, 
    private seoService: SeoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('envi-datacube-generator'));
  }

  ngOnDestroy(): void {
    this.progressSubscription?.unsubscribe();
  }

  onBipFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.bipFile = file;
      this.bipFileName = file.name;
      this.errorMessage = '';
    }
  }

  onHdrFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.hdrFile = file;
      this.hdrFileName = file.name;
      this.errorMessage = '';
    }
  }

  removeBipFile(): void {
    this.bipFile = null;
    this.bipFileName = '';
  }

  removeHdrFile(): void {
    this.hdrFile = null;
    this.hdrFileName = '';
  }

  async startGeneration(): Promise<void> {
    if (!this.bipFile || !this.hdrFile) {
      this.errorMessage = 'Please upload both .bip and .hdr files.';
      return;
    }

    this.isUploading = true;
    this.isGenerating = false;
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.successMessage = '';
    this.generatedSampleName = null;

    try {
      // 1. Upload files in chunks
      const fileId = `mask_${Date.now()}`;
      
      this.uploadStatus = `Uploading ${this.bipFileName}...`;
      await this.uploadFileInChunks(this.bipFile, fileId, 'bip');
      
      this.uploadStatus = `Uploading ${this.hdrFileName}...`;
      await this.uploadFileInChunks(this.hdrFile, fileId, 'hdr');
      
      this.isUploading = false;
      this.isGenerating = true;
      this.generationStatus = 'Triggering generation...';
      
      // 2. Trigger generation
      const response: any = await lastValueFrom(this.http.post(`${this.API_URL}/envi/generate-datacube`, {
        mask_name: fileId,
        year: this.year
      }));

      if (response.status === 0) {
        this.taskId = response.task_id;
        this.startPollingProgress();
      } else {
        this.errorMessage = response.message || 'Failed to start generation.';
        this.isGenerating = false;
      }

    } catch (error: any) {
      console.error('Generation failed:', error);
      this.errorMessage = error.message || 'An error occurred during generation.';
      this.isUploading = false;
      this.isGenerating = false;
    }
  }

  private async uploadFileInChunks(file: File, fileId: string, type: 'bip' | 'hdr'): Promise<void> {
    const chunkSize = 5 * 1024 * 1024; // 5MB
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
      
      await lastValueFrom(this.http.post(`${this.API_URL}/envi/samples/upload-chunk`, formData));

      const baseProgress = type === 'bip' ? 0 : 50;
      const currentTypeProgress = ((i + 1) / totalChunks) * 50;
      this.uploadProgress = (baseProgress + currentTypeProgress) < 0 ? 0 : (baseProgress + currentTypeProgress);
    }
  }

  private startPollingProgress(): void {
    if (!this.taskId) return;

    this.progressSubscription = interval(2000).pipe(
      switchMap(() => this.http.get<any>(`${this.API_URL}/envi/generation-progress/${this.taskId}`)),
      takeWhile(response => response.status === 0 && response.task.progress >= 0 && response.task.progress < 100, true)
    ).subscribe({
      next: (response) => {
        if (response.status === 0) {
          const task = response.task;
          this.generationProgress = task.progress < 0 ? 0 : task.progress;
          this.generationStatus = task.status;

          if (task.progress === 100) {
            this.isGenerating = false;
            this.successMessage = 'Datacube generated successfully!';
            this.generatedSampleName = task.sample_name;
          } else if (task.progress === -1) {
            this.isGenerating = false;
            this.errorMessage = task.status || 'Generation failed.';
          }
        }
      },
      error: (error) => {
        console.error('Polling failed:', error);
        this.errorMessage = 'Lost connection to background task.';
        this.isGenerating = false;
      }
    });
  }

  downloadFile(type: 'bsq' | 'hdr'): void {
    if (!this.taskId) return;
    
    const url = `${environment.enviApiUrl}/envi/download-datacube/${this.taskId}/${type}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = ''; // Let the server set the filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
