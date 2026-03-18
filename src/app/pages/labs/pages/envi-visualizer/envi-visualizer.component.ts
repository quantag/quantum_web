import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { LayerConfigDialogComponent } from './layer-config-dialog.component';
import { getLayerColorByName, getLayerColorThreeByName } from './layer-colors.enum';
import { environment } from '../../../../../environments/environment';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-envi-visualizer',
  templateUrl: './envi-visualizer.component.html',
  styleUrls: ['./envi-visualizer.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LabHeaderComponent,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class EnviVisualizerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('threeContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
  
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
  visualizationMode: 'single' | 'composite' | '3d' = 'single';
  
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
    this.seoService.updateSeoTags(this.seoService.getSeoData('envi-visualizer'));
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
    this.layerColors.clear(); // Clear custom colors when processing new files

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
        band_index: 0
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
            
            // Store raw band values for pixel tooltip
            this.bandValues = response.band_values || null;
            
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
      band_name: this.availableLayers[layerIndex] || null
    };

    const apiUrl = environment.enviApiUrl + '/envi/switch-layer';

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
    const layerIndex = parseInt(event.target.value, 10);
    this.switchLayer(layerIndex);
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
    this.visualizationMode = event.target.value;
    this.reset3DScene();
    
    if (this.visualizationMode !== 'single') {
      this.bandValues = null;
      this.showTooltip = false;
    }
    
    if (this.bsqBase64 && this.hdrBase64) {
      if (this.visualizationMode === 'composite') {
        this.createComposite();
      } else if (this.visualizationMode === '3d') {
        // Initialize 3D view - wait for Angular to render the canvas
        setTimeout(() => {
          this.tryInit3DScene();
        }, 150);
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
  }

  onGBandChange(event: any): void {
    this.gBand = parseInt(event.target.value, 10);
  }

  onBBandChange(event: any): void {
    this.bBand = parseInt(event.target.value, 10);
  }

  applyRGBComposite(): void {
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

  // 3D Visualization methods
  toggle3DView(): void {
    this.show3DView = !this.show3DView;
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
    if (!this.bsqBase64 || !this.hdrBase64) {
      return;
    }

    this.isLoading3D = true;
    this.errorMessage = '';

    // Prepare layer colors array - use custom color or default
    const layerColors: string[] = layerIndices.map(index => {
      if (this.layerColors.has(index)) {
        return this.layerColors.get(index)!;
      }
      // Use default color if not customized
      return this.getLayerColor(index);
    });

    const payload = {
      bsq: this.bsqBase64,
      hdr: this.hdrBase64,
      layer_indices: layerIndices,
      layer_colors: layerColors,
      downsample: 4  // Adjust for performance
    };

    const apiUrl = environment.enviApiUrl + '/envi/get-3d-data';

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
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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

