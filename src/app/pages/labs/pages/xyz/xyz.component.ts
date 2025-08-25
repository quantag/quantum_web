import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SeoService } from '../../../../services/seo.service';
import { DirectoryParserService, DirectoryFile } from '../../../../services/directory-parser.service';
import { ButtonComponent } from '../../../../components/button/button.component';


@Component({
  selector: 'app-xyz',
  templateUrl: './xyz.component.html',
  styleUrls: ['./xyz.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent]
})
export class XyzComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput', { static: true }) fileInputRef!: ElementRef<HTMLInputElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationId!: number;
  private isBrowser: boolean;
  
  hasLoadedFile: boolean = false;
  urlValue: string = '';
  isDownloading: boolean = false;
  isBrowsing: boolean = false;
  showBrowser: boolean = false;
  availableFiles: DirectoryFile[] = [];
  currentFileName: string = '';

  constructor(
    private http: HttpClient, 
    @Inject(PLATFORM_ID) private platformId: Object,
    private seoService: SeoService,
    private directoryParser: DirectoryParserService,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Update SEO tags for this page
    this.seoService.updateSeoTags(this.seoService.getSeoData('xyz'));
    this.initThree();
  }

  ngAfterViewInit(): void {
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

    navigateBack() {
    this.router.navigate(['/labs']);
  }

  private initThree(): void {
    if (!this.isBrowser) return; // Don't use window during SSR
    
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x161D50); // Dark blue background
    
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 6;

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvasRef.nativeElement,
      antialias: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Initialize controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI;

    // Start animation loop
    this.animate();
  }

  private setupEventListeners(): void {
    if (!this.isBrowser) return; // Don't use window during SSR
    
    // File upload listener
    this.fileInputRef.nativeElement.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        const atoms = this.parseXYZ(reader.result as string);
        this.renderAtoms(atoms);
        this.hasLoadedFile = true;
        this.currentFileName = file.name;
      };
      reader.readAsText(file);
    });

    // Window resize listener
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private getColor(element: string): number {
    const colors: { [key: string]: number } = {
      H: 0xffffff, // White (hydrogen)
      C: 0x666666, // Lighter gray (carbon)
      O: 0xff4444, // Brighter red (oxygen)
      N: 0x4444ff, // Brighter blue (nitrogen)
      S: 0xffff44, // Brighter yellow (sulfur)
      Cl: 0x44ff44, // Brighter green (chlorine)
      Zr: 0x44ffff, // Brighter cyan (zirconium)
    };
    return colors[element] || 0xaaaaaa; // Lighter default gray
  }

  private parseXYZ(text: string): Array<{element: string, x: number, y: number, z: number}> {
    const lines = text.trim().split('\n');
    const count = parseInt(lines[0]);
    const atoms: Array<{element: string, x: number, y: number, z: number}> = [];
    for (let i = 2; i < 2 + count; i++) {
      const [element, x, y, z] = lines[i].trim().split(/\s+/);
      atoms.push({ element, x: parseFloat(x), y: parseFloat(y), z: parseFloat(z) });
    }
    return atoms;
  }

  private renderAtoms(atoms: Array<{element: string, x: number, y: number, z: number}>): void {
    // Clear previous scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    // Calculate the center of the molecule
    const center = { x: 0, y: 0, z: 0 };
    atoms.forEach(atom => {
      center.x += atom.x;
      center.y += atom.y;
      center.z += atom.z;
    });
    center.x /= atoms.length;
    center.y /= atoms.length;
    center.z /= atoms.length;

    // Create a group to hold all atoms
    const moleculeGroup = new THREE.Group();

    atoms.forEach(atom => {
      const geometry = new THREE.SphereGeometry(0.2, 32, 32);
      const material = new THREE.MeshPhongMaterial({ color: this.getColor(atom.element) });
      const sphere = new THREE.Mesh(geometry, material);
      // Position relative to center
      sphere.position.set(atom.x - center.x, atom.y - center.y, atom.z - center.z);
      moleculeGroup.add(sphere);
    });

    // Add the centered molecule group to the scene
    this.scene.add(moleculeGroup);

    const light = new THREE.PointLight(0xffffff);
    light.position.set(10, 10, 10);
    this.scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff);
    this.scene.add(ambient);

    // Calculate bounding box to adjust camera distance
    const box = new THREE.Box3().setFromObject(moleculeGroup);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
    
    // Set camera position to view the centered molecule
    this.camera.position.set(0, 0, cameraZ);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  downloadFromUrl(): void {
    if (!this.urlValue.trim()) return;
    
    this.isDownloading = true;
    
    this.http.get(this.urlValue, { responseType: 'text' })
      .subscribe({
        next: (data) => {
          const atoms = this.parseXYZ(data);
          this.renderAtoms(atoms);
          this.hasLoadedFile = true;
          // Extract filename from URL
          const urlParts = this.urlValue.split('/');
          this.currentFileName = urlParts[urlParts.length - 1] || 'Downloaded File';
        },
        error: (error) => {
          console.error('Error downloading file:', error);
          alert('Error downloading file. Please check the URL and try again.');
        },
        complete: () => {
          this.isDownloading = false;
        }
      });
  }

  browseFiles(): void {
    this.isBrowsing = true;
    const baseUrl = 'https://quantag-it.com/pub/xyz/';
    
    this.http.get(baseUrl, { responseType: 'text' })
      .subscribe({
        next: (html) => {
          this.availableFiles = this.directoryParser.parseXyzDirectoryListing(html, baseUrl);
          this.showBrowser = true;
        },
        error: (error) => {
          console.error('Error browsing files:', error);
          alert('Error browsing files. Please try again.');
        },
        complete: () => {
          this.isBrowsing = false;
        }
      });
  }

  loadFileFromBrowser(file: DirectoryFile): void {
    this.isDownloading = true;
    this.showBrowser = false;
    
    this.http.get(file.url, { responseType: 'text' })
      .subscribe({
        next: (data) => {
          const atoms = this.parseXYZ(data);
          this.renderAtoms(atoms);
          this.hasLoadedFile = true;
          this.currentFileName = file.name;
        },
        error: (error) => {
          console.error('Error downloading file:', error);
          alert(`Error downloading ${file.name}. Please try again.`);
        },
        complete: () => {
          this.isDownloading = false;
        }
      });
  }

  closeBrowser(): void {
    this.showBrowser = false;
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
