import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-envi-visualizer',
  templateUrl: './envi-visualizer.component.html',
  styleUrls: ['./envi-visualizer.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LabHeaderComponent]
})
export class EnviVisualizerComponent implements OnInit {
  bsqFile: File | null = null;
  hdrFile: File | null = null;
  bsqFileName: string = '';
  hdrFileName: string = '';
  
  // Store base64 data for layer switching
  bsqBase64: string = '';
  hdrBase64: string = '';
  
  isProcessing: boolean = false;
  isSwitchingLayer: boolean = false;
  isCreatingComposite: boolean = false;
  errorMessage: string = '';
  
  // Visualization mode
  visualizationMode: 'single' | 'composite' = 'single';
  
  // Visualization data
  visualizationData: any = null;
  imageUrl: string | null = null;
  
  // Layer management
  availableLayers: string[] = [];
  selectedLayerIndex: number = 0;
  layerStatistics: any[] = [];
  dimensions: any = null;
  
  // RGB Composite settings
  rBand: number = 0;
  gBand: number = 1;
  bBand: number = 2;
  
  // Colormap options
  selectedColormap: string = 'viridis';
  availableColormaps: string[] = [
    'viridis', 'plasma', 'inferno', 'magma', 'cividis',
    'hot', 'cool', 'spring', 'summer', 'autumn', 'winter',
    'jet', 'rainbow', 'terrain', 'ocean'
  ];

  constructor(private http: HttpClient, private seoService: SeoService) { }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('envi-visualizer'));
  }

  onBsqFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.bsqFile = file;
      this.bsqFileName = file.name;
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

  async processFiles(): Promise<void> {
    if (!this.bsqFile || !this.hdrFile) {
      this.errorMessage = 'Please upload both .bsq and .hdr files.';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.visualizationData = null;
    this.imageUrl = null;
    this.availableLayers = [];
    this.layerStatistics = [];

    try {
      // Read files as base64
      const bsqBase64Full = await this.fileToBase64(this.bsqFile);
      const hdrBase64Full = await this.fileToBase64(this.hdrFile);

      // Store for layer switching
      this.bsqBase64 = bsqBase64Full.split(',')[1]; // Remove data URL prefix
      this.hdrBase64 = hdrBase64Full.split(',')[1];

      const payload = {
        bsq: this.bsqBase64,
        hdr: this.hdrBase64,
        band_index: 0,
        colormap: this.selectedColormap
      };

      // Use environment variable for API URL
      const apiUrl = environment.enviApiUrl + '/envi/process';
      
      this.http.post<any>(apiUrl, payload).subscribe({
        next: (response) => {
          if (response.status === 0) {
            // Handle image response
            if (response.image) {
              this.imageUrl = 'data:image/png;base64,' + response.image;
            }
            
            // Handle data response
            if (response.data) {
              this.visualizationData = response.data;
              this.availableLayers = response.data.layers || [];
              this.layerStatistics = response.data.statistics || [];
              this.dimensions = response.data.dimensions || null;
              this.selectedLayerIndex = response.data.current_band || 0;
            }
          } else {
            this.errorMessage = `Processing failed: ${response.message || 'Unknown error'}`;
          }
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('Error processing ENVI files:', error);
          this.errorMessage = `Error processing ENVI files. Make sure the ENVI API is running at ${environment.enviApiUrl}`;
          this.isProcessing = false;
        }
      });
    } catch (error) {
      console.error('Error reading files:', error);
      this.errorMessage = 'Error reading files. Please try again.';
      this.isProcessing = false;
    }
  }

  switchLayer(layerIndex: number): void {
    if (!this.bsqBase64 || !this.hdrBase64) {
      return;
    }

    this.isSwitchingLayer = true;
    this.errorMessage = '';
    this.selectedLayerIndex = layerIndex;

    const payload = {
      bsq: this.bsqBase64,
      hdr: this.hdrBase64,
      band_index: layerIndex,
      colormap: this.selectedColormap
    };

    const apiUrl = environment.enviApiUrl + '/envi/switch-layer';

    this.http.post<any>(apiUrl, payload).subscribe({
      next: (response) => {
        if (response.status === 0 && response.image) {
          this.imageUrl = 'data:image/png;base64,' + response.image;
        } else {
          this.errorMessage = 'Error switching layer';
        }
        this.isSwitchingLayer = false;
      },
      error: (error) => {
        console.error('Error switching layer:', error);
        this.errorMessage = 'Error switching layer';
        this.isSwitchingLayer = false;
      }
    });
  }

  onLayerChange(event: any): void {
    const layerIndex = parseInt(event.target.value, 10);
    this.switchLayer(layerIndex);
  }

  onColormapChange(event: any): void {
    this.selectedColormap = event.target.value;
    if (this.bsqBase64 && this.hdrBase64) {
      this.switchLayer(this.selectedLayerIndex);
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  clearFiles(): void {
    this.bsqFile = null;
    this.hdrFile = null;
    this.bsqFileName = '';
    this.hdrFileName = '';
    this.bsqBase64 = '';
    this.hdrBase64 = '';
    this.visualizationData = null;
    this.imageUrl = null;
    this.errorMessage = '';
    this.availableLayers = [];
    this.layerStatistics = [];
    this.dimensions = null;
    this.selectedLayerIndex = 0;
    this.visualizationMode = 'single';
    this.rBand = 0;
    this.gBand = 1;
    this.bBand = 2;
  }

  onVisualizationModeChange(event: any): void {
    this.visualizationMode = event.target.value;
    if (this.bsqBase64 && this.hdrBase64) {
      if (this.visualizationMode === 'composite') {
        this.createComposite();
      } else {
        this.switchLayer(this.selectedLayerIndex);
      }
    }
  }

  createComposite(): void {
    if (!this.bsqBase64 || !this.hdrBase64) {
      return;
    }

    this.isCreatingComposite = true;
    this.errorMessage = '';

    const payload = {
      bsq: this.bsqBase64,
      hdr: this.hdrBase64,
      r_band: this.rBand,
      g_band: this.gBand,
      b_band: this.bBand
    };

    const apiUrl = environment.enviApiUrl + '/envi/composite';

    this.http.post<any>(apiUrl, payload).subscribe({
      next: (response) => {
        if (response.status === 0 && response.image) {
          this.imageUrl = 'data:image/png;base64,' + response.image;
        } else {
          this.errorMessage = 'Error creating RGB composite';
        }
        this.isCreatingComposite = false;
      },
      error: (error) => {
        console.error('Error creating composite:', error);
        this.errorMessage = 'Error creating RGB composite';
        this.isCreatingComposite = false;
      }
    });
  }

  onRBandChange(event: any): void {
    this.rBand = parseInt(event.target.value, 10);
    if (this.visualizationMode === 'composite' && this.bsqBase64 && this.hdrBase64) {
      this.createComposite();
    }
  }

  onGBandChange(event: any): void {
    this.gBand = parseInt(event.target.value, 10);
    if (this.visualizationMode === 'composite' && this.bsqBase64 && this.hdrBase64) {
      this.createComposite();
    }
  }

  onBBandChange(event: any): void {
    this.bBand = parseInt(event.target.value, 10);
    if (this.visualizationMode === 'composite' && this.bsqBase64 && this.hdrBase64) {
      this.createComposite();
    }
  }

  downloadResult(): void {
    if (!this.imageUrl) {
      this.errorMessage = 'No visualization to download.';
      return;
    }

    const link = document.createElement('a');
    link.href = this.imageUrl;
    link.download = `envi_visualization_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  removeBsqFile(): void {
    this.bsqFile = null;
    this.bsqFileName = '';
  }

  removeHdrFile(): void {
    this.hdrFile = null;
    this.hdrFileName = '';
  }
}
