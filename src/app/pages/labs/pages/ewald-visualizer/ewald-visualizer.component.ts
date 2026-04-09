import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { LayerConfigDialogComponent } from './layer-config-dialog.component';
import { ExportDialogComponent } from './export-dialog.component';
import { SampleSelectionDialogComponent } from './sample-selection-dialog.component';
import { getLayerColorByName, getLayerColorThreeByName } from './layer-colors.enum';
import { lastValueFrom } from 'rxjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

@Component({
  selector: 'app-ewald-visualizer',
  templateUrl: './ewald-visualizer.component.html',
  styleUrls: ['./ewald-visualizer.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LabHeaderComponent,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ]
})
export class EwaldVisualizerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('threeContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
  
  bsqFile: File | null = null;
  hdrFile: File | null = null;
  bsqFileName: string = '';
  hdrFileName: string = '';
  
  // Server sample display name
  selectedSampleName: string | null = null;
  // Internal sample ID for API calls (can be a server sample name or an ad-hoc fileId)
  private activeSampleId: string | null = null;
  
  // Store base64 data for layer switching
  bsqBase64: string = '';
  hdrBase64: string = '';
  
  isProcessing: boolean = false;
  isSwitchingLayer: boolean = false;
  isCreatingComposite: boolean = false;
  errorMessage: string = '';
  
  private readonly PROD_API_URL = 'https://quantum.quantag-it.com/ewald-api';
  
  // Upload state for direct processing
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadStatus: string = '';
  
  // Visualization mode
  visualizationMode: 'single' | 'composite' | '3d' = 'single';
  
  // Visualization data
  visualizationData: any = null;
  imageUrl: string | null = null;
  
  // Layer management
  availableLayers: string[] = [];
  selectedLayerIndex: number = 0;
  pendingLayerIndex: number = 0;
  layerStatistics: any[] = [];
  dimensions: any = null;
  
  // RGB Composite settings
  rBand: number = 0;
  gBand: number = 1;
  bBand: number = 2;

  // Image zoom & pan
  zoomLevel: number = 1;
  panX: number = 0;
  panY: number = 0;
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  @ViewChild('imageClipper') imageClipper!: ElementRef<HTMLElement>;

  // Pixel value tooltip
  bandValues: number[][] | null = null;
  showTooltip: boolean = false;
  hoveredValue: number | null = null;
  hoveredX: number = 0;
  hoveredY: number = 0;
  tooltipScreenX: number = 0;
  tooltipScreenY: number = 0;

  // Fullscreen
  isFullscreen: boolean = false;

  // 3D Viewer properties
  show3DView: boolean = false;
  isLoading3D: boolean = false;
  selected3DLayers: number[] = [];
  layerOpacities = new Map<number, number>(); // opacity per layer index (0-1)
  layerColors = new Map<number, string>(); // color per layer index (hex format)
  threeDData: any = null;
  
  // Three.js objects
  private scene: any;
  private camera: any;
  private renderer: any;
  private controls: any;
  private layerMeshes: Map<number, any> = new Map();
  private layerLabels: Map<number, any> = new Map();
  private animationId: any;

  constructor(
    private http: HttpClient, 
    private seoService: SeoService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('ewald-visualizer'));
  }

  ngAfterViewInit(): void {
    // 3D scene will be initialized when user opens 3D view
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
    // Resize renderer to match new dimensions
    setTimeout(() => this.resize3DRenderer(), 50);
  }

  toggleFullscreen(): void {
    if (!this.containerRef) return;
    const el = this.containerRef.nativeElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  resetCamera(): void {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(0, 50, 200);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private resize3DRenderer(): void {
    if (!this.renderer || !this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.renderer.setSize(width, height);
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  // Image zoom & pan methods
  onImageWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.zoomLevel = Math.min(10, Math.max(1, this.zoomLevel + delta));
    this.clampPan();
  }

  onImagePanStart(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isPanning = true;
    this.panStartX = event.clientX - this.panX;
    this.panStartY = event.clientY - this.panY;
  }

  @HostListener('document:mousemove', ['$event'])
  onImagePanMove(event: MouseEvent): void {
    if (!this.isPanning) return;
    this.panX = event.clientX - this.panStartX;
    this.panY = event.clientY - this.panStartY;
    this.clampPan();
  }

  @HostListener('document:mouseup')
  onImagePanEnd(): void {
    this.isPanning = false;
  }

  private clampPan(): void {
    const el = this.imageClipper?.nativeElement;
    if (!el) return;
    const img = el.querySelector('img');
    if (!img) return;
    const maxPanX = Math.max(0, (img.offsetWidth * this.zoomLevel - el.clientWidth) / 2);
    const maxPanY = Math.max(0, (img.offsetHeight * this.zoomLevel - el.clientHeight) / 2);
    this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
    this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(10, this.zoomLevel + 0.25);
    this.clampPan();
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(1, this.zoomLevel - 0.25);
    this.clampPan();
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
  }

  onImageMouseMove(event: MouseEvent): void {
    if (this.isPanning || !this.bandValues || this.visualizationMode !== 'single') {
      this.showTooltip = false;
      return;
    }

    const el = this.imageClipper?.nativeElement;
    if (!el) return;
    const img = el.querySelector('img') as HTMLImageElement;
    if (!img) return;

    const rect = el.getBoundingClientRect();
    const mouseRelX = event.clientX - rect.left;
    const mouseRelY = event.clientY - rect.top;

    const containerCenterX = el.clientWidth / 2;
    const containerCenterY = el.clientHeight / 2;
    const imgCenterX = img.offsetWidth / 2;
    const imgCenterY = img.offsetHeight / 2;

    // Inverse of CSS transform: translate(panX, panY) scale(zoomLevel)
    const dataX = (mouseRelX - containerCenterX - this.panX) / this.zoomLevel + imgCenterX;
    const dataY = (mouseRelY - containerCenterY - this.panY) / this.zoomLevel + imgCenterY;

    const col = Math.floor(dataX);
    const row = Math.floor(dataY);

    if (row >= 0 && row < this.bandValues.length && col >= 0 && col < this.bandValues[0].length) {
      this.hoveredValue = this.bandValues[row][col];
      this.hoveredX = col;
      this.hoveredY = row;
      this.tooltipScreenX = event.clientX - rect.left + 12;
      this.tooltipScreenY = event.clientY - rect.top - 8;
      this.showTooltip = true;
    } else {
      this.showTooltip = false;
    }
  }

  onImageMouseLeave(): void {
    this.showTooltip = false;
  }

  get imageTransform(): string {
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
  }

  onBsqFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.bsqFile = file;
      this.bsqFileName = file.name;
      this.selectedSampleName = null; // Clear server sample if local file selected
      this.activeSampleId = '';       // Clear previous upload ID
      this.errorMessage = '';
    }
  }

  onHdrFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.hdrFile = file;
      this.hdrFileName = file.name;
      this.selectedSampleName = null; // Clear server sample if local file selected
      this.activeSampleId = '';       // Clear previous upload ID
      this.errorMessage = '';
    }
  }

  openSampleSelection(): void {
    const dialogRef = this.dialog.open(SampleSelectionDialogComponent, {
      width: '600px',
      panelClass: 'sample-selection-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedSampleName = result;
        this.activeSampleId = result;
        this.bsqFile = null;
        this.hdrFile = null;
        this.bsqFileName = '';
        this.hdrFileName = '';
        this.bsqBase64 = '';
        this.hdrBase64 = '';
      }
    });
  }

  async processFiles(): Promise<void> {
    if (!this.selectedSampleName && (!this.bsqFile || !this.hdrFile)) {
      this.errorMessage = 'Please select a server sample or upload both .bsq and .hdr files.';
      return;
    }

    this.isProcessing = true;
    this.isUploading = false;
    this.uploadProgress = 0;
    this.uploadStatus = '';
    this.errorMessage = '';
    this.visualizationData = null;
    this.imageUrl = null;
    this.availableLayers = [];
    this.layerStatistics = [];
    this.layerColors.clear();

    try {
      let sampleName = this.selectedSampleName || this.activeSampleId;

      // If local files are provided, upload them in chunks first
      if (!sampleName && this.bsqFile && this.hdrFile) {
        this.isUploading = true;
        this.uploadStatus = 'Preparing files...';
        
        // Use the BSQ filename (without extension) as a recognizable fileId with a numeric suffix
        const safeBaseName = this.bsqFileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_');
        const fileId = `${safeBaseName}_${Math.floor(1000 + Math.random() * 9000)}`;

        try {
          // Upload BSQ
          this.uploadStatus = `Uploading ${this.bsqFileName}...`;
          await this.uploadFileInChunksCore(this.bsqFile, fileId, 'bsq');
          
          // Upload HDR
          this.uploadStatus = `Uploading ${this.hdrFileName}...`;
          await this.uploadFileInChunksCore(this.hdrFile, fileId, 'hdr');
          
          sampleName = fileId; 
          this.isUploading = false;
          this.uploadStatus = 'Processing started...';
        } catch (uploadError: any) {
          console.error('Upload failed:', uploadError);
          this.errorMessage = `Upload failed: ${uploadError.message || 'Check connection'}`;
          this.isUploading = false;
          this.isProcessing = false;
          return;
        }
      }

      const payload: any = {
        sample_name: sampleName,
        metadata_only: true
      };

      if (!sampleName) {
         // Fallback logic if needed, but we prefer chunked now.
         this.errorMessage = 'Could not establish a sample for processing.';
         this.isProcessing = false;
         return;
      }

      const apiUrl = `${this.PROD_API_URL}/ewald/process`;
      
      this.http.post<any>(apiUrl, payload).subscribe({
        next: (response) => {
          console.log('Process response received:', response.status);
          if (response.status === 0) {
            if (response.image) this.imageUrl = 'data:image/png;base64,' + response.image;
            this.bandValues = response.band_values || null;
            if (response.data) {
              this.visualizationData = response.data;
              this.availableLayers = response.data.layers || [];
              this.layerStatistics = response.data.statistics || [];
              this.dimensions = response.data.dimensions || null;
              this.selectedLayerIndex = -1;
              this.pendingLayerIndex = 0;
              console.log(this.selectedLayerIndex,this.pendingLayerIndex)
              this.visualizationMode = 'single';
              this.rBand = 0;
              this.gBand = 1;
              this.bBand = 2;
              this.selected3DLayers = [];
              // Store the uploaded sample name for API but DON'T show in UI if it's ad-hoc
              this.activeSampleId = sampleName;
              if (this.bsqFile) {
                // If it was a local upload, keep selectedSampleName as null to hide the ID in UI
                this.selectedSampleName = null;
              } else {
                this.selectedSampleName = sampleName;
              }
            }
          } else {
            this.errorMessage = `Processing failed: ${response.message || 'Unknown error'}`;
          }
          this.isProcessing = false;
          this.uploadStatus = '';
        },
        error: (error) => {
          console.error('Error processing:', error);
          this.errorMessage = 'Error during processing. Make sure the API is running.';
          this.isProcessing = false;
          this.uploadStatus = '';
        }
      });
    } catch (error) {
      console.error('Error in processFiles:', error);
      this.errorMessage = 'An unexpected error occurred.';
      this.isProcessing = false;
    }
  }

  private async uploadFileInChunksCore(file: File, fileId: string, type: 'bsq'|'hdr') {
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
        
        await lastValueFrom(this.http.post<any>(`${this.PROD_API_URL}/ewald/samples/upload-chunk`, formData));

        const baseProgress = type === 'bsq' ? 0 : 50;
        const currentTypeProgress = ((i + 1) / totalChunks) * 50;
        this.uploadProgress = baseProgress + currentTypeProgress;
    }
  }

  switchLayer(layerIndex: number): void {
    if (!this.activeSampleId && (!this.bsqBase64 || !this.hdrBase64)) {
      return;
    }

    this.isSwitchingLayer = true;
    this.errorMessage = '';
    this.selectedLayerIndex = layerIndex;

    const payload: any = {
      band_index: layerIndex,
      band_name: this.availableLayers[layerIndex] || null
    };

    console.log('Switching layer to:', layerIndex, 'with activeSampleId:', this.activeSampleId);
    if (this.activeSampleId) {
      payload.sample_name = this.activeSampleId;
    } else {
      payload.bsq = this.bsqBase64;
      payload.hdr = this.hdrBase64;
    }

    const apiUrl = `${this.PROD_API_URL}/ewald/switch-layer`;

    this.http.post<any>(apiUrl, payload).subscribe({
      next: (response) => {
        if (response.status === 0 && response.image) {
          this.imageUrl = 'data:image/png;base64,' + response.image;
          this.bandValues = response.band_values || null;
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
    this.pendingLayerIndex = parseInt(event.target.value, 10);
  }

  applyLayerChange(): void {
    this.switchLayer(this.pendingLayerIndex);
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
    this.selectedSampleName = null;
    this.activeSampleId = null;
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
    this.bandValues = null;
    this.showTooltip = false;
    this.rBand = 0;
    this.gBand = 1;
    this.bBand = 2;
    this.selected3DLayers = [];
    this.layerColors.clear(); // Clear custom colors
    this.threeDData = null;
    this.resetZoom();
  }

  onVisualizationModeChange(event: any): void {
    console.log('Mode changed to:', event.target.value, 'activeSampleId:', this.activeSampleId);
    this.visualizationMode = event.target.value;
    this.imageUrl = null;
    this.selectedLayerIndex = -1;
    this.pendingLayerIndex = 0;
    this.reset3DScene();
    
    if (this.visualizationMode !== 'single') {
      this.bandValues = null;
      this.showTooltip = false;
    }
    
    if (this.visualizationMode === '3d' && (this.activeSampleId || (this.bsqBase64 && this.hdrBase64))) {
      // Initialize 3D view infrastructure - but don't load specific layer yet
      setTimeout(() => {
        this.tryInit3DScene();
      }, 150);
    }
  }

  createComposite(): void {
    if (!this.activeSampleId && (!this.bsqBase64 || !this.hdrBase64)) {
      return;
    }

    this.isCreatingComposite = true;
    this.errorMessage = '';

    const payload: any = {
      r_band: this.rBand,
      g_band: this.gBand,
      b_band: this.bBand
    };

    if (this.activeSampleId) {
      payload.sample_name = this.activeSampleId;
    } else {
      payload.bsq = this.bsqBase64;
      payload.hdr = this.hdrBase64;
    }

    console.log('Creating RGB composite with bands:', this.rBand, this.gBand, this.bBand, 'activeSampleId:', this.activeSampleId);
    const apiUrl = `${this.PROD_API_URL}/ewald/composite`;

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
  }

  onGBandChange(event: any): void {
    this.gBand = parseInt(event.target.value, 10);
  }

  onBBandChange(event: any): void {
    this.bBand = parseInt(event.target.value, 10);
  }

  applyRGBComposite(): void {
    if (this.visualizationMode === 'composite' && (this.activeSampleId || (this.bsqBase64 && this.hdrBase64))) {
      this.createComposite();
    }
  }

  private getExportBaseName(): string {
    if (this.selectedSampleName) {
      return this.selectedSampleName;
    }
    if (this.activeSampleId) {
      return this.activeSampleId;
    }
    if (this.bsqFileName) {
      const lastDotIndex = this.bsqFileName.lastIndexOf('.');
      if (lastDotIndex > 0) {
        return this.bsqFileName.substring(0, lastDotIndex);
      }
      return this.bsqFileName;
    }
    return `envi_data_${Date.now()}`;
  }

  downloadResult(): void {
    if (this.visualizationMode === '3d') {
      if (this.selected3DLayers.length > 0) {
        this.export3DView();
      } else {
        this.errorMessage = 'No 3D layers selected to download.';
      }
      return;
    }

    if (!this.imageUrl) {
      this.errorMessage = 'No visualization to download.';
      return;
    }

    const link = document.createElement('a');
    link.href = this.imageUrl;
    link.download = `${this.getExportBaseName()}.png`;
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

  // 3D Visualization methods
  toggle3DView(): void {
    this.show3DView = !this.show3DView;
  }

  export3DView(): void {
    const dialogRef = this.dialog.open(ExportDialogComponent, {
      width: '450px',
      panelClass: 'export-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'screenshot') {
        this.export3DScreenshot();
      } else if (result === 'model') {
        this.export3DModel();
      }
    });
  }

  private export3DScreenshot(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      this.errorMessage = '3D renderer not initialized.';
      return;
    }

    try {
      this.renderer.render(this.scene, this.camera);
      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${this.getExportBaseName()}_3d_snapshot.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error capturing 3D screenshot:', error);
      this.errorMessage = 'Could not capture 3D screenshot. Make sure preserveDrawingBuffer is enabled.';
    }
  }

  private export3DModel(): void {
    if (!this.scene) {
      this.errorMessage = 'No 3D scene available to export.';
      return;
    }

    try {
      const exporter = new GLTFExporter();
      exporter.parse(
        this.scene,
        (gltf: any) => {
          let blob;
          let filename;
          const baseName = this.getExportBaseName();
          
          if (gltf instanceof ArrayBuffer) {
            blob = new Blob([gltf], { type: 'application/octet-stream' });
            filename = `${baseName}_3d_model.glb`;
          } else {
            const output = JSON.stringify(gltf, null, 2);
            blob = new Blob([output], { type: 'text/plain' });
            filename = `${baseName}_3d_model.gltf`;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        },
        (error: any) => {
          console.error('An error happened during GLTF export:', error);
          this.errorMessage = 'Error exporting 3D model.';
        },
        { binary: true } // Export as GLB by default
      );
    } catch (error) {
       console.error('Error in export3DModel:', error);
       this.errorMessage = 'Failed to start 3D model export.';
    }
  }

  openLayerConfig(): void {
    const dialogRef = this.dialog.open(LayerConfigDialogComponent, {
      width: '50vw',
      panelClass: 'layer-config-dialog-panel',
      data: {
        availableLayers: this.availableLayers,
        selected3DLayers: [...this.selected3DLayers], // Pass a copy
        layerOpacities: this.layerOpacities, // Pass opacity Map
        layerColors: this.layerColors // Pass colors Map
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle new result structure with selectedIndices, opacities, and colors
        const newLayers: number[] = result.selectedIndices || result; // Support old and new format
        const newOpacities: Map<number, number> | undefined = result.opacities;
        const newColors: Map<number, string> | undefined = result.colors;
        
        // Update opacity map if provided
        if (newOpacities) {
          this.layerOpacities = newOpacities;
        }
        
        // Update colors map if provided
        if (newColors) {
          this.layerColors = newColors;
        }
        
        if (this.visualizationMode === '3d' && newLayers.length > 0) {
          // Clear the 3D scene without wiping selected layers
          this.clear3DSceneMeshes();
          this.selected3DLayers = newLayers;
          // Ensure canvas renders correctly
          setTimeout(() => {
            this.tryInit3DScene();
            this.load3DLayer(this.selected3DLayers);
          }, 150);
        } else if (this.visualizationMode === '3d' && newLayers.length === 0) {
          this.reset3DScene();
        } else {
          this.selected3DLayers = newLayers;
        }
      }
    });
  }

  getLayerColor(index: number): string {
    const name = this.availableLayers[index] || '';
    return getLayerColorByName(name);
  }

  // Note: toggle3DLayer is no longer strictly used since configuration is via dialog,
  // but kept for backward compatibility if needed.
  toggle3DLayer(layerIndex: number): void {
    const idx = this.selected3DLayers.indexOf(layerIndex);
    if (idx > -1) {
      this.selected3DLayers.splice(idx, 1);
      this.removeLayerFromScene(layerIndex);
    } else {
      this.selected3DLayers.push(layerIndex);
      // Reload everything in order
      this.load3DLayer(this.selected3DLayers);
    }
  }

  load3DLayer(layerIndices: number[]): void {
    if (!this.activeSampleId && (!this.bsqBase64 || !this.hdrBase64)) {
      return;
    }

    this.isLoading3D = true;
    this.errorMessage = '';

    const payload: any = {
      layer_indices: layerIndices,
      layer_colors: layerIndices.map(idx => this.layerColors.get(idx) || null),
      downsample: 4
    };

    console.log('Loading 3D layer with indices:', layerIndices, 'activeSampleId:', this.activeSampleId);
    if (this.activeSampleId) {
      payload.sample_name = this.activeSampleId;
    } else {
      payload.bsq = this.bsqBase64;
      payload.hdr = this.hdrBase64;
    }

    const apiUrl = `${this.PROD_API_URL}/ewald/get-3d-data`;

    this.http.post<any>(apiUrl, payload).subscribe({
      next: (response) => {
        if (response.status === 0) {
          this.threeDData = response;
          
          // Add layers to scene
          response.layers.forEach((layer: any) => {
            this.add3DLayerToScene(layer);
          });
        } else {
          this.errorMessage = 'Error loading 3D data';
        }
        this.isLoading3D = false;
      },
      error: (error) => {
        console.error('Error loading 3D data:', error);
        this.errorMessage = 'Error loading 3D data. Make sure the backend is running.';
        this.isLoading3D = false;
      }
    });
  }

  private tryInit3DScene(retryCount: number = 0): void {
    if (!this.canvasRef || !this.canvasRef.nativeElement) {
      if (retryCount < 5) {
        // Canvas not ready yet, retry after a short delay
        setTimeout(() => this.tryInit3DScene(retryCount + 1), 100);
      } else {
        console.error('Canvas not found after multiple retries');
      }
      return;
    }

    this.init3DScene();
  }

  private init3DScene(): void {
    if (!this.canvasRef || !this.canvasRef.nativeElement) {
      console.error('Canvas not found');
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 600;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 50, 200);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Controls
    if (typeof OrbitControls !== 'undefined') {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      
      // Restrict zoom limits
      this.controls.minDistance = 50;  // Minimum zoom in distance
      this.controls.maxDistance = 500; // Maximum zoom out distance
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    this.scene.add(directionalLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(250, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    // Start animation
    this.animate();
  }

  private add3DLayerToScene(layerData: any): void {
    const { heightmap, width, height, index, name, color: customColor } = layerData;

    // Create geometry
    const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
    
    // Apply heightmap
    const vertices = geometry.attributes['position'].array;
    for (let i = 0; i < heightmap.length; i++) {
      vertices[i * 3 + 2] = heightmap[i] * 20; // Scale height
    }
    geometry.computeVertexNormals();

    // Use custom color if provided, otherwise use default color based on layer name
    let color: number;
    if (customColor) {
      // Convert hex string to number (remove # if present)
      const hexString = customColor.startsWith('#') ? customColor.slice(1) : customColor;
      color = parseInt(hexString, 16);
    } else {
      color = getLayerColorThreeByName(name || '');
    }
    
    // Get opacity from Map, default to 1.0 if not set
    const opacity = this.layerOpacities.get(index) ?? 1.0;

    const material = new THREE.MeshStandardMaterial({
      color: color,
      wireframe: false,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: opacity
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    
    // Find stacking index from the selected layers array
    // Invert so that top of the list = top in the 3D scene (highest Y)
    const stackingIndex = this.selected3DLayers.indexOf(index);
    const validStackIndex = stackingIndex !== -1
      ? (this.selected3DLayers.length - 1 - stackingIndex)
      : 0;
    
    // Increase vertical spacing to prevent intersections (from 5 to 50)
    mesh.position.y = validStackIndex * 40; 

    this.scene.add(mesh);
    this.layerMeshes.set(index, mesh);

    // Add text label sprite in front of the layer
    const label = this.createTextSprite(name || `Band ${index + 1}`, color);
    label.position.set(0, mesh.position.y, height / 2 + 8);
    this.scene.add(label);
    this.layerLabels.set(index, label);
  }

  private createTextSprite(text: string, color: number): any {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 5120;
    canvas.height = 640;

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const hex = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 256px Inter, Arial, sans-serif';
    ctx.fillStyle = hex;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width - 8, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(30, 4, 1);
    return sprite;
  }

  private removeLayerFromScene(layerIndex: number): void {
    const mesh = this.layerMeshes.get(layerIndex);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.layerMeshes.delete(layerIndex);
    }
    const label = this.layerLabels.get(layerIndex);
    if (label) {
      this.scene.remove(label);
      label.material.map?.dispose();
      label.material.dispose();
      this.layerLabels.delete(layerIndex);
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.controls) {
      this.controls.update();
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private clear3DSceneMeshes(): void {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Remove all meshes from scene and dispose of them
    this.layerMeshes.forEach((mesh) => {
      if (this.scene) {
        this.scene.remove(mesh);
      }
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: any) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    this.layerMeshes.clear();

    // Remove all label sprites
    this.layerLabels.forEach((label) => {
      if (this.scene) {
        this.scene.remove(label);
      }
      label.material.map?.dispose();
      label.material.dispose();
    });
    this.layerLabels.clear();

    // Clear controls
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    // Dispose of renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Clear scene references
    if (this.scene) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
      this.scene = null;
    }

    this.camera = null;
    this.threeDData = null;
    this.isLoading3D = false;
  }

  private reset3DScene(): void {
    this.clear3DSceneMeshes();

    // Clear selected layers - create new array for Angular change detection
    this.selected3DLayers = [];

    this.show3DView = false;
  }

  ngOnDestroy(): void {
    // Cleanup
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.layerMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });

    this.layerLabels.forEach((label) => {
      label.material.map?.dispose();
      label.material.dispose();
    });

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

