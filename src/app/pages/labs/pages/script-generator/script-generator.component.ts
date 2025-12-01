import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { ButtonComponent } from '../../../../components/button/button.component';
import { UploadedContent, UploadSectionComponent, UploadSectionConfig } from '../../../../components/upload-section/upload-section.component';
import { HttpClient } from '@angular/common/http';
import { InitQasmResponse } from '../../../../interfaces/initQasmResponse.interface';
import { environment } from '../../../../../environments/environment';
import { IQbinResponse } from '../../../../interfaces/qbin.interface';
import { switchMap, catchError } from 'rxjs/operators';
import { forkJoin, throwError, of } from 'rxjs';
import { IQirResponse } from '../../../../interfaces/qir.interface';

@Component({
  selector: 'app-script-generator',
  templateUrl: './script-generator.component.html',
  styleUrls: ['./script-generator.component.scss'],
  standalone: true,
  imports: [CommonModule, LabHeaderComponent, ButtonComponent, UploadSectionComponent]
})
export class ScriptGeneratorComponent implements OnInit {

  public binaryFile: File | null = null;
  public fileContent: string = '';
  public fileSize: number = 0;
  public isGenerating: boolean = false;
  public errorMessage: string = '';
  public generatedOpenQASM: string = '';
  public generatedOpenQASMSize: number = 0;
  public generatedQBINSize: number = 0;
  public generatedQBIN: string = '';
  public generatedQBINCompressionRatio: number = 0;
  public generatedQIRBinary: string = '';
  public generatedQIRBinarySize: number = 0;
  public generatedQIRBinaryCompressionRatio: number = 0;
  public hasGenerated: boolean = false;
  public isDragOver: boolean = false;
  
  // Expose Math for template use
  public readonly Math = Math;


  uploadConfig: UploadSectionConfig = {
    acceptedFileTypes: ['image/png'],
    fileExtensions: ['.png'],
    sampleBaseUrl: 'https://quantag-it.com/pub/samples/image/',
    showUrlUpload: true,
    showSampleBrowser: true,
    showClearButton: false, // We handle clearing through the drag-drop area
    showFileUpload: false, // We use custom drag-drop upload
    uploadButtonLabel: 'Upload File',
    urlPlaceholder: 'https://example.com/data.png'
  };

  constructor(
    private seoService: SeoService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.seoService.updateSeoTags({
      title: 'Quantum Script Generator - Quantag IT',
      description: 'Generate OpenQASM and QBIN quantum scripts from binary input data.',
      keywords: 'quantum computing, script generation, OpenQASM, QBIN, binary data'
    });
  }

  clearData(): void {
    this.fileContent = '';
    this.fileSize = 0;
    this.binaryFile = null;
    this.generatedOpenQASM = '';
    this.generatedQBIN = '';
    this.generatedQIRBinary = '';
    this.generatedOpenQASMSize = 0;
    this.generatedQBINSize = 0;
    this.generatedQIRBinarySize = 0;
    this.generatedQBINCompressionRatio = 0;
    this.generatedQIRBinaryCompressionRatio = 0;
    this.hasGenerated = false;
    this.errorMessage = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onBinaryFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  private handleFileSelection(file: File): void {
    this.binaryFile = file;
    this.errorMessage = '';
    this.hasGenerated = false;
    this.generatedOpenQASM = '';
    this.generatedQBIN = '';
    this.generatedQIRBinary = '';

    // Read file as binary
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        // Convert ArrayBuffer to base64 string for storage
        const arrayBuffer = e.target.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        this.fileContent = btoa(binaryString); // Store as base64
        this.fileSize = file.size;
      }
    };
    reader.onerror = () => {
      this.errorMessage = 'Error reading file. Please try again.';
    };
    reader.readAsArrayBuffer(file);
  }

  generateScripts(): void {
    if (!this.binaryFile && !this.fileContent) {
      this.errorMessage = 'Please upload a binary file first.';
      return;
    }

    this.isGenerating = true;
    this.errorMessage = '';

    // File content is already base64 encoded from handleFileSelection
    const payload = {
      data: this.fileContent,
    };

    this.generateFiles(payload);
  }

  private generateFiles(payload: any): void {
    this.http.post<InitQasmResponse>(environment.apiGatewayUrl + '/generate-script', payload)
      .pipe(
        switchMap((response: InitQasmResponse) => {
          // Process the first response (OpenQASM generation)
          this.generatedOpenQASM = atob(response.qasm_base64);
          this.generatedOpenQASMSize = this.getFileSize(this.generatedOpenQASM);
          
          // Use the qasm_base64 from the first response for the second request
          const qbinQasmPayload = { qasm_b64: response.qasm_base64 };
          const qirQasmPayload = { qasm: response.qasm_base64, format: 'bitcode' };
          
          // Chain the second HTTP request with individual error handling
          return forkJoin({
            qbin: this.http.post<IQbinResponse>(environment.apiGatewayUrl + '/qbin-compile', qbinQasmPayload).pipe(
              catchError(error => {
                return of({ error: error, qbin_b64: null } as any);
              })
            ),
            qir: this.http.post<IQirResponse>(environment.apiGatewayUrl + '/qasm-to-qir', qirQasmPayload).pipe(
              catchError(error => {
                return of({ error: error, qir: null } as any);
              })
            )
          });
        }),
        catchError((error) => {
          console.error('Script generation error:', error);
          this.errorMessage = 'Error generating scripts. Please try again.';
          this.isGenerating = false;
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (responses: { qbin: IQbinResponse | any, qir: IQirResponse | any }) => {
          // Process QBIN response
          if (responses.qbin && responses.qbin.qbin_b64) {
            try {
              this.generatedQBIN = atob(responses.qbin.qbin_b64);
              this.generatedQBINSize = this.getFileSize(this.generatedQBIN);
              this.generatedQBINCompressionRatio = this.calculateCompressionRatio(this.generatedOpenQASMSize, this.generatedQBINSize);
            } catch (error) {
              console.error('Error decoding QBIN data:', error);
              this.errorMessage += 'Error processing QBIN response data. ';
            }
          } else if (responses.qbin && responses.qbin.error) {
            console.error('QBIN compilation failed:', responses.qbin.error);
            this.errorMessage += 'QBIN compilation failed: ' + (responses.qbin.error.error?.error || 'Unknown error') + '. ';
          }

          // Process QIR response
          if (responses.qir && responses.qir.qir) {
            try {
              this.generatedQIRBinary = atob(responses.qir.qir);
              this.generatedQIRBinarySize = this.getFileSize(this.generatedQIRBinary);
              this.generatedQIRBinaryCompressionRatio = this.calculateCompressionRatio(this.generatedOpenQASMSize, this.generatedQIRBinarySize);
            } catch (error) {
              console.error('Error decoding QIR data:', error);
              this.errorMessage += 'Error processing QIR response data. ';
            }
          } else if (responses.qir && responses.qir.error) {
            console.error('QIR conversion failed:', responses.qir.error);
            this.errorMessage += 'QIR conversion failed: ' + (responses.qir.error.error?.error || 'Unknown error') + '. ';
          }

          // Set hasGenerated to true if at least one conversion succeeded
          this.hasGenerated = !!(this.generatedQBIN || this.generatedQIRBinary);
          
          this.isGenerating = false;
        },
        error: (errorResponse) => {
          console.error('Error in script generation:', errorResponse);
          this.errorMessage = 'Error generating Files. The error is: ' + errorResponse.error.error;
          this.isGenerating = false;
        }
      });
  }


  onUploadError(error: string): void {
    this.errorMessage = error;
  }

  onContentUploaded(uploadedContent: UploadedContent): void {
    if(uploadedContent.file) {
      this.handleFileSelection(uploadedContent.file);
    }
    this.errorMessage = '';
  }

  downloadOpenQASM(): void {
    if (!this.generatedOpenQASM) return;
    
    const blob = new Blob([this.generatedOpenQASM], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quantum_script_${Date.now()}.qasm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  downloadQIRBinary(): void {
    if (!this.generatedQIRBinary) return;
    const blob = new Blob([this.generatedQIRBinary], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quantum_script_${Date.now()}.bin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  downloadQBIN(): void {
    if (!this.generatedQBIN) return;
    // Decode base64 to get binary data
    let binaryData: Uint8Array;
    const qbinData = Array.from(this.generatedQBIN).map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase();

    try {
      const decoded = atob(qbinData);
      const bytes = [];
      for (let i = 0; i < decoded.length; i++) {
        bytes.push(decoded.charCodeAt(i));
      }
      binaryData = new Uint8Array(bytes);
    } catch {
      // If not base64, treat as text
      const encoder = new TextEncoder();
      binaryData = encoder.encode(qbinData);
    }

    const blob = new Blob([new Uint8Array(binaryData)], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quantum_script_${Date.now()}.qbin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  getFileSize(content: string): number {
    return new Blob([content]).size;
  }

  private calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    return Math.round((compressedSize / originalSize) * 100);
  }
}