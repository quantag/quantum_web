import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface QASMGate {
  type: string;
  targets: number[];
  control?: number;
  controls?: number[];
  step: number;
}

interface QASMCircuit {
  qubits: number;
  gates: QASMGate[];
}

@Component({
  selector: 'app-3d-circuit',
  templateUrl: './3d_circuit.component.html',
  styleUrls: ['./3d_circuit.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink]
})
export class ThreeDCircuitComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationId!: number;
  private isBrowser: boolean;
  
  hasLoadedCircuit: boolean = false;
  currentCircuitName: string = '';
  isLoading: boolean = false;
  
  // Sample QASM circuit
  sampleCircuit: QASMCircuit = {
    qubits: 4,
    gates: [
      { type: "H", targets: [1], step: 0 },
      { type: "CX", control: 1, targets: [2], step: 1 },
      { type: "CX", control: 0, targets: [1], step: 2 },
      { type: "H", targets: [0], step: 3 },
      { type: "CCX", controls: [0, 1], targets: [3], step: 4 },
      { type: "CX", control: 1, targets: [2], step: 5 },
      { type: "CZ", control: 0, targets: [2], step: 6 }
    ]
  };

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.initThree();
    this.loadSampleCircuit();
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

  private initThree(): void {
    if (!this.isBrowser) return; // Don't use window during SSR
    
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 10);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvasRef.nativeElement,
      antialias: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI;

    // Add lighting
    this.setupLighting();

    // Start animation loop
    this.animate();
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Point lights for accent
    const pointLight1 = new THREE.PointLight(0x667eea, 0.5, 20);
    pointLight1.position.set(-10, 5, 0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xf093fb, 0.5, 20);
    pointLight2.position.set(10, 5, 0);
    this.scene.add(pointLight2);
  }

  private setupEventListeners(): void {
    if (!this.isBrowser) return; // Don't use window during SSR
    
    // Window resize listener
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  loadSampleCircuit(): void {
    this.isLoading = true;
    this.renderQuantumCircuit(this.sampleCircuit);
    this.hasLoadedCircuit = true;
    this.currentCircuitName = 'Sample Bell State + Toffoli Circuit';
    this.isLoading = false;
  }

  private renderQuantumCircuit(circuit: QASMCircuit): void {
    // Clear previous scene
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
    }

    // Re-add lighting
    this.setupLighting();

    const qubitSpacing = 2;
    const stepSpacing = 3;
    const circuitGroup = new THREE.Group();

    // Draw qubit lines
    this.drawQubitLines(circuitGroup, circuit.qubits, circuit.gates.length, qubitSpacing, stepSpacing);

    // Draw gates
    this.drawGates(circuitGroup, circuit.gates, qubitSpacing, stepSpacing);

    // Add labels
    this.addQubitLabels(circuitGroup, circuit.qubits, qubitSpacing);

    this.scene.add(circuitGroup);

    // Position camera to view the circuit
    const circuitWidth = circuit.gates.length * stepSpacing;
    const circuitHeight = circuit.qubits * qubitSpacing;
    
    this.camera.position.set(circuitWidth / 2, circuitHeight / 2 + 5, Math.max(circuitWidth, circuitHeight) + 5);
    this.camera.lookAt(circuitWidth / 2, circuitHeight / 2, 0);
    this.controls.target.set(circuitWidth / 2, circuitHeight / 2, 0);
    this.controls.update();
  }

  private drawQubitLines(group: THREE.Group, numQubits: number, numSteps: number, qubitSpacing: number, stepSpacing: number): void {
    const lineLength = numSteps * stepSpacing + stepSpacing;
    
    for (let i = 0; i < numQubits; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, i * qubitSpacing, 0),
        new THREE.Vector3(lineLength, i * qubitSpacing, 0)
      ]);
      
      const material = new THREE.LineBasicMaterial({ 
        color: 0x667eea, 
        linewidth: 3,
        transparent: true,
        opacity: 0.8
      });
      
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }
  }

  private drawGates(group: THREE.Group, gates: QASMGate[], qubitSpacing: number, stepSpacing: number): void {
    gates.forEach(gate => {
      const x = (gate.step + 1) * stepSpacing;
      
      switch (gate.type) {
        case 'H':
          this.createHadamardGate(group, x, gate.targets[0] * qubitSpacing);
          break;
        case 'CX':
          this.createCXGate(group, x, gate.control! * qubitSpacing, gate.targets[0] * qubitSpacing);
          break;
        case 'CCX':
          this.createCCXGate(group, x, gate.controls!, gate.targets[0], qubitSpacing);
          break;
        case 'CZ':
          this.createCZGate(group, x, gate.control! * qubitSpacing, gate.targets[0] * qubitSpacing);
          break;
      }
    });
  }

  private createHadamardGate(group: THREE.Group, x: number, y: number): void {
    // Create cube for Hadamard gate
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.2);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xf093fb,
      transparent: true,
      opacity: 0.9
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, y, 0.1);
    cube.castShadow = true;
    cube.receiveShadow = true;
    group.add(cube);

    // Add H label
    this.addGateLabel(group, 'H', x, y, 0.3);
  }

  private createCXGate(group: THREE.Group, x: number, controlY: number, targetY: number): void {
    // Control qubit (small sphere)
    const controlGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const controlMaterial = new THREE.MeshPhongMaterial({ color: 0x667eea });
    const controlSphere = new THREE.Mesh(controlGeometry, controlMaterial);
    controlSphere.position.set(x, controlY, 0.1);
    controlSphere.castShadow = true;
    group.add(controlSphere);

    // Target qubit (torus)
    const targetGeometry = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
    const targetMaterial = new THREE.MeshPhongMaterial({ color: 0x22c55e });
    const targetTorus = new THREE.Mesh(targetGeometry, targetMaterial);
    targetTorus.position.set(x, targetY, 0.1);
    targetTorus.rotation.x = Math.PI / 2;
    targetTorus.castShadow = true;
    group.add(targetTorus);

    // Connection line
    this.createConnectionLine(group, x, controlY, targetY);

    // Plus symbol on target
    this.addGateLabel(group, '+', x, targetY, 0.3);
  }

  private createCCXGate(group: THREE.Group, x: number, controls: number[], target: number, qubitSpacing: number): void {
    // Control qubits
    controls.forEach(control => {
      const controlGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const controlMaterial = new THREE.MeshPhongMaterial({ color: 0x667eea });
      const controlSphere = new THREE.Mesh(controlGeometry, controlMaterial);
      controlSphere.position.set(x, control * qubitSpacing, 0.1);
      controlSphere.castShadow = true;
      group.add(controlSphere);
    });

    // Target qubit (torus)
    const targetGeometry = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
    const targetMaterial = new THREE.MeshPhongMaterial({ color: 0xf59e0b });
    const targetTorus = new THREE.Mesh(targetGeometry, targetMaterial);
    targetTorus.position.set(x, target * qubitSpacing, 0.1);
    targetTorus.rotation.x = Math.PI / 2;
    targetTorus.castShadow = true;
    group.add(targetTorus);

    // Connection lines
    const allQubits = [...controls, target].sort((a, b) => a - b);
    this.createConnectionLine(group, x, allQubits[0] * qubitSpacing, allQubits[allQubits.length - 1] * qubitSpacing);

    // Plus symbol on target
    this.addGateLabel(group, '+', x, target * qubitSpacing, 0.3);
  }

  private createCZGate(group: THREE.Group, x: number, controlY: number, targetY: number): void {
    // Control qubit (small sphere)
    const controlGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const controlMaterial = new THREE.MeshPhongMaterial({ color: 0x667eea });
    const controlSphere = new THREE.Mesh(controlGeometry, controlMaterial);
    controlSphere.position.set(x, controlY, 0.1);
    controlSphere.castShadow = true;
    group.add(controlSphere);

    // Target qubit (sphere for Z gate)
    const targetGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const targetMaterial = new THREE.MeshPhongMaterial({ color: 0xef4444 });
    const targetSphere = new THREE.Mesh(targetGeometry, targetMaterial);
    targetSphere.position.set(x, targetY, 0.1);
    targetSphere.castShadow = true;
    group.add(targetSphere);

    // Connection line
    this.createConnectionLine(group, x, controlY, targetY);

    // Z label
    this.addGateLabel(group, 'Z', x, targetY, 0.3);
  }

  private createConnectionLine(group: THREE.Group, x: number, y1: number, y2: number): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y1, 0.1),
      new THREE.Vector3(x, y2, 0.1)
    ]);
    
    const material = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
    
    const line = new THREE.Line(geometry, material);
    group.add(line);
  }

  private addGateLabel(group: THREE.Group, text: string, x: number, y: number, z: number): void {
    if (!this.isBrowser) return; // Don't use document during SSR
    
    // Create text geometry (simplified approach using canvas texture)
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 64;
    canvas.height = 64;
    
    context.fillStyle = 'white';
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(0.5, 0.5, 1);
    group.add(sprite);
  }

  private addQubitLabels(group: THREE.Group, numQubits: number, qubitSpacing: number): void {
    for (let i = 0; i < numQubits; i++) {
      this.addGateLabel(group, `|q${i}⟩`, -1, i * qubitSpacing, 0.1);
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
