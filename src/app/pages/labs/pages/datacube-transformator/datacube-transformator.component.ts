import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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

  // Processing state
  isProcessing: boolean = false;
  processingProgress: number = 0;
  processingStatus: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  
  // Mock timer reference
  private processingInterval: any;

  constructor(private seoService: SeoService) {}

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
    }
  }

  removeCustomWeightsFile(): void {
    this.customWeightsFile = null;
  }

  // --- Processing Logic ---

  startProcessing(): void {
    // Validation
    if (this.bsqFiles.length === 0) {
      this.errorMessage = 'Please upload at least one .bsq file.';
      return;
    }

    if (this.weightsMode === 'custom' && !this.customWeightsFile) {
      this.errorMessage = 'Please upload your custom weights ASCII file.';
      return;
    }

    // Reset states
    this.errorMessage = '';
    this.successMessage = '';
    this.isProcessing = true;
    this.processingProgress = 0;
    this.processingStatus = 'Initializing processing pipeline...';

    // Mock processing logic (to be replaced with actual API calls in phase 2)
    let step = 0;
    const totalSteps = 100;
    
    this.processingInterval = setInterval(() => {
      step += 2; // Increment by 2%
      this.processingProgress = step;

      // Update status text based on progress
      if (step === 10) {
        this.processingStatus = 'Validating input stacks...';
      } else if (step === 30) {
        this.processingStatus = 'Applying weight coefficients...';
      } else if (step === 60) {
        this.processingStatus = 'Computing transform matrices...';
      } else if (step === 85) {
        this.processingStatus = 'Generating GeoTIFF files...';
      } else if (step >= 100) {
        clearInterval(this.processingInterval);
        this.completeProcessing();
      }
    }, 150); // Simulates a 7.5 second process
  }

  private completeProcessing(): void {
    this.isProcessing = false;
    this.successMessage = 'Stacks processed successfully! Output TIFFs are ready for download.';
  }

  // --- Download Mock ---
  
  downloadAsZip(): void {
    // Mock download action
    alert('Mock: Downloading results as ZIP archive...');
  }
  
  downloadTiffFile(index: number): void {
     // Mock download action
    alert(`Mock: Downloading individual TIFF file #${index + 1}...`);
  }
}
