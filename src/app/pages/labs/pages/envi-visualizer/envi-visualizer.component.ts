import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { environment } from '../../../../../environments/environment';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-envi-visualizer',
  templateUrl: './envi-visualizer.component.html',
  styleUrls: ['./envi-visualizer.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LabHeaderComponent]
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
  
  // Colormap options
  selectedColormap: string = 'viridis';
  availableColormaps: string[] = [
    'viridis', 'plasma', 'inferno', 'magma', 'cividis',
    'hot', 'cool', 'spring', 'summer', 'autumn', 'winter',
    'jet', 'rainbow', 'terrain', 'ocean'
  ];

  // Fullscreen
  isFullscreen: boolean = false;

  // 3D Viewer properties
  show3DView: boolean = false;
  isLoading3D: boolean = false;
  selected3DLayers: Set<number> = new Set();
  threeDData: any = null;
  
  // Three.js objects
  private scene: any;
  private camera: any;
  private renderer: any;
  private controls: any;
  private layerMeshes: Map<number, any> = new Map();
  private animationId: any;

  constructor(private http: HttpClient, private seoService: SeoService) { }

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
    this.selected3DLayers = new Set();
    this.threeDData = null;
  }

  onVisualizationModeChange(event: any): void {
    const previousMode = this.visualizationMode;
    this.visualizationMode = event.target.value;
    
    // Reset 3D scene and selected layers when switching from 3D mode
    if (previousMode === '3d' && this.visualizationMode !== '3d') {
      this.reset3DScene();
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

  // 3D Visualization methods
  toggle3DView(): void {
    this.show3DView = !this.show3DView;
    
    if (this.show3DView && !this.threeDData) {
      // Initialize 3D view
      setTimeout(() => {
        this.init3DScene();
      }, 100);
    }
  }

  getLayerColor(index: number): string {
    const colors = [
      '#3498db', // Blue
      '#2ecc71', // Green
      '#e74c3c', // Red
      '#f39c12', // Orange
      '#9b59b6', // Purple
      '#1abc9c', // Turquoise
      '#e67e22'  // Carrot
    ];
    return colors[index % colors.length];
  }

  toggle3DLayer(layerIndex: number): void {
    if (this.selected3DLayers.has(layerIndex)) {
      this.selected3DLayers.delete(layerIndex);
      this.removeLayerFromScene(layerIndex);
    } else {
      this.selected3DLayers.add(layerIndex);
      this.load3DLayer([layerIndex]);
    }
  }

  load3DLayer(layerIndices: number[]): void {
    if (!this.bsqBase64 || !this.hdrBase64) {
      return;
    }

    this.isLoading3D = true;
    this.errorMessage = '';

    const payload = {
      bsq: this.bsqBase64,
      hdr: this.hdrBase64,
      layer_indices: layerIndices,
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
    this.camera.position.set(0, 50, 100);
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
    const { heightmap, width, height, index, name } = layerData;

    // Create geometry
    const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
    
    // Apply heightmap
    const vertices = geometry.attributes['position'].array;
    for (let i = 0; i < heightmap.length; i++) {
      vertices[i * 3 + 2] = heightmap[i] * 20; // Scale height
    }
    geometry.computeVertexNormals();

    // Create material with color based on layer index
    const colors = [
      0x3498db, // Blue
      0x2ecc71, // Green
      0xe74c3c, // Red
      0xf39c12, // Orange
      0x9b59b6, // Purple
      0x1abc9c, // Turquoise
      0xe67e22  // Carrot
    ];
    const color = colors[index % colors.length];

    const material = new THREE.MeshStandardMaterial({
      color: color,
      wireframe: false,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = index * 5; // Stack layers vertically

    this.scene.add(mesh);
    this.layerMeshes.set(index, mesh);
  }

  private removeLayerFromScene(layerIndex: number): void {
    const mesh = this.layerMeshes.get(layerIndex);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.layerMeshes.delete(layerIndex);
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

  private reset3DScene(): void {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Clear selected layers - create new Set for Angular change detection
    this.selected3DLayers = new Set();

    // Remove all meshes from scene and dispose of them
    this.layerMeshes.forEach((mesh, index) => {
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
      // Clear all children from scene
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
      this.scene = null;
    }

    this.camera = null;
    this.threeDData = null;
    this.show3DView = false;
    this.isLoading3D = false;
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

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

