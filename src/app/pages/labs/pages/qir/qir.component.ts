import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { environment } from '../../../../../environments/environment';
import { UploadedContent, UploadSectionComponent, UploadSectionConfig } from '../../../../components/upload-section/upload-section.component';
import { IQbinResponse } from '../../../../interfaces/qbin.interface';
import { forkJoin } from 'rxjs';
import { IQirResponse } from '../../../../interfaces/qir.interface';

@Component({
  selector: 'app-qir',
  templateUrl: './qir.component.html',
  styleUrls: ['./qir.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LabHeaderComponent, UploadSectionComponent]
})
export class QirComponent implements OnInit {
  openQasmCode: string = '';
  responseCode: string = '';
  binaryData: string = '';
  isConverting: boolean = false;
  errorMessage: string = '';
  selectedFormat: string = 'QIR';
  sizeIn: number = 0;
  sizeOut: number = 0;
  outputMode: 'binary' | 'text' = 'text';
  hexLines: Array<{offset: string, hex: string, ascii: string}> = [];

  
  // Available conversion formats
  conversionFormats = [
    { value: 'QIR', label: 'QIR' },
    { value: 'QBIN', label: 'QBIN' },
  ];

  uploadConfig: UploadSectionConfig = {
    acceptedFileTypes: ['text/plain', 'application/octet-stream'],
    fileExtensions: ['.qasm', '.txt'],
    sampleBaseUrl: 'https://quantag-it.com/pub/samples/qbin/',
    showUrlUpload: true,
    showSampleBrowser: true,
    showClearButton: true,
    showFileUpload: true,
    uploadButtonLabel: 'Upload QASM File',
    urlPlaceholder: 'https://example.com/circuit.qasm'
  };

  constructor(private http: HttpClient, private seoService: SeoService) { }

  get convertButtonLabel(): string {
    if (this.isConverting) {
      return 'Converting...';
    }
    return this.selectedFormat === 'QBIN' ? 'Encode to QBIN' : 'Encode to QIR';
  }

  get downloadButtonLabel(): string {
    return this.selectedFormat === 'QBIN' ? 'Download QBIN File' : 'Download QIR Bitcode';
  }

  get outputData(): string {
    return this.outputMode === 'binary' ? this.binaryData : this.responseCode;
  }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('qir'));
  }

  convert(): void {
    if (this.selectedFormat === 'QBIN') {
      this.convertToQbin();
    } else {
      this.convertToQir();
    }
  }

  downloadOutput(): void {
    if (this.selectedFormat === 'QBIN') {
      this.downloadQbinFile();
    } else {
      this.downloadQIRBinaryFile();
    }
  }

  convertToQir(): void {
    if (!this.openQasmCode.trim()) {
      this.errorMessage = 'Please enter OpenQASM code to convert.';
      return;
    }

    this.isConverting = true;
    this.errorMessage = '';
    this.responseCode = '';
    this.binaryData = '';
    this.hexLines = [];
    this.sizeIn = 0;
    this.sizeOut = 0;

    // Encode the QASM code to base64
    const encodedQasm = btoa(this.openQasmCode);
    let payload: { qasm: string; format?: string } = { qasm: encodedQasm };
    let qasmFilePayload: { qasm: string, format: string } = { qasm: encodedQasm, format: 'bitcode' };
    
    forkJoin([
      this.http.post<IQirResponse>(environment.apiGatewayUrl + '/qasm-to-qir', payload),
      this.http.post<IQirResponse>(environment.apiGatewayUrl + '/qasm-to-qir', qasmFilePayload)
    ]).subscribe({
      next: ([base64Response, binaryResponse]: [IQirResponse, IQirResponse]) => {
        this.responseCode = atob(base64Response.qir) || '';
        this.binaryData = atob(binaryResponse.qir) || '';
        this.hexLines = this.processBinnaryData(this.binaryData);
        this.isConverting = false;
        this.sizeIn = this.openQasmCode.length;
        this.sizeOut = this.binaryData.length || 0;
        console.log('QIR conversion successful');
      },
      error: (error) => {
        console.error(`Error converting OpenQASM to ${this.selectedFormat}:`, error);
        this.errorMessage = `Error converting code to ${this.selectedFormat}. Please check your OpenQASM syntax and try again.`;
        this.isConverting = false;
      },
      complete: () => {
        this.isConverting = false;
      }
    });
  }

  convertToQbin(): void {
    if (!this.openQasmCode.trim()) {
      this.errorMessage = 'Please enter OpenQASM code to convert.';
      return;
    }

    this.isConverting = true;
    this.errorMessage = '';
    this.responseCode = '';
    this.binaryData = '';
    this.hexLines = [];
    this.sizeIn = 0;
    this.sizeOut = 0;

    // Encode the QASM code to base64
    const encodedQasm = btoa(this.openQasmCode);
    const payload = { qasm_b64: encodedQasm };
    
    this.http.post<IQbinResponse>(environment.apiGatewayUrl + '/qbin-compile', payload).subscribe({
      next: (response: IQbinResponse) => {
        if (response.qbin_b64) {
          try {
            const qbinBinaryData = atob(response.qbin_b64);
            this.responseCode = Array.from(qbinBinaryData).map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join(' ')
              .toUpperCase();

            this.binaryData = Array.from(qbinBinaryData).map(c =>
              c.charCodeAt(0).toString(2).padStart(8, '0')
            ).join(' ');

            this.hexLines = this.processBinnaryData(qbinBinaryData);


            this.sizeIn = response.size_in;
            this.sizeOut = response.size_out;

          } catch (error) {
            console.error('Error decoding QBIN data:', error);
            this.errorMessage = 'Error processing QBIN response data.';
          }
        } else {
          this.errorMessage = 'Error converting OpenQASM to QBIN. Please check your code syntax and try again.';
        }
      },
      error: (error) => {
        console.error('Error converting OpenQASM to QBIN:', error);
        this.errorMessage = 'Error converting OpenQASM to QBIN. Please check your code syntax and try again.';
        this.isConverting = false;
      },
      complete: () => {
        this.isConverting = false;
      }
    });
  }

  clearFields(withOpenQasm: boolean = true): void {
    this.responseCode = '';
    this.errorMessage = '';
    this.binaryData = '';
    this.hexLines = [];
    this.sizeIn = 0;
    this.sizeOut = 0;

    if (withOpenQasm) {
      this.openQasmCode = '';
    }
  }
  

  copyResponseCode(): void {
    if (this.responseCode) {
      navigator.clipboard.writeText(this.responseCode).then(() => {
        console.log(`${this.selectedFormat} code copied to clipboard`);
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
  }

  onChangeFormat(): void {
    this.clearFields(false);
    this.selectedFormat === 'QBIN' ? this.outputMode = 'binary' : this.outputMode = 'text';
  }

  // Upload section methods
  onContentUploaded(uploadedContent: UploadedContent): void {
    let content = uploadedContent.content;
    
    // Check if the content is a base64 data URL
    if (content.startsWith('data:')) {
      try {
        // Extract the base64 part after the comma
        const base64Index = content.indexOf(',');
        if (base64Index !== -1) {
          const base64Content = content.substring(base64Index + 1);
          // Decode the base64 content
          content = atob(base64Content);
        }
      } catch (error) {
        console.error('Error decoding base64 content:', error);
        this.errorMessage = 'Error decoding uploaded file content.';
        return;
      }
    }
    
    this.openQasmCode = content;
    this.errorMessage = '';
  }

  onUploadError(error: string): void {
    this.errorMessage = error;
  }

  formatSize(bytes: number): string {
    if (bytes < 1000) {
      return `${bytes} bytes`;
    } else {
      const kb = (bytes / 1024).toFixed(1);
      return `${kb} KB`;
    }
  }

    setOutputMode(mode:'binary' | 'text'): void {
    if (this.outputMode !== mode) {
      this.outputMode = mode;
    }
  }

  downloadQbinFile(): void {
    if (!this.responseCode.trim()) {
      this.errorMessage = 'No QBIN data to download.';
      return;
    }

    let binaryData: Uint8Array;
    
    try {
      // Try to decode base64 first
      const decoded = atob(this.responseCode);
      const bytes = [];
      for (let i = 0; i < decoded.length; i++) {
        bytes.push(decoded.charCodeAt(i));
      }
      binaryData = new Uint8Array(bytes);
    } catch {
      // If not base64, treat as text
      const encoder = new TextEncoder();
      binaryData = encoder.encode(this.responseCode);
    }

    const blob = new Blob([new Uint8Array(binaryData)], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QBIN_response_${Date.now()}.qbin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  downloadQIRBinaryFile(): void {
    if (!this.binaryData.trim()) {
      this.errorMessage = 'No QIR binary data to download.';
      return;
    }

    const blob = new Blob([this.binaryData], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QIR_response_${Date.now()}.bin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  processBinnaryData(binnaryData: string): { offset: string; hex: string; ascii: string }[] {
    const buffer = new ArrayBuffer(binnaryData.length);
    const uint8Array = new Uint8Array(buffer);
    for (let i = 0; i < binnaryData.length; i++) {
      uint8Array[i] = binnaryData.charCodeAt(i);
    }
    const bytes = new Uint8Array(uint8Array);
    const QIRhexLines = [];
    const bytesPerLine = 16;

    for (let i = 0; i < bytes.length; i += bytesPerLine) {
      const offset = this.formatOffset(i);
      const lineBytes = bytes.slice(i, i + bytesPerLine);
      const hex = this.formatHex(lineBytes, bytesPerLine);
      const ascii = this.formatAscii(lineBytes);

      QIRhexLines.push({ offset, hex, ascii });
    }

    return QIRhexLines;
  }

  formatOffset(offset: number): string {
    return offset.toString(16).toUpperCase().padStart(8, '0');
  }

  formatHex(bytes: Uint8Array, bytesPerLine: number): string {
    let hex = '';
    for (let i = 0; i < bytesPerLine; i++) {
      if (i < bytes.length) {
        hex += bytes[i].toString(16).toUpperCase().padStart(2, '0') + ' ';
      } else {
        hex += '   ';
      }
      // Add extra space after 8 bytes for readability
      if (i === 7) {
        hex += ' ';
      }
    }
    return hex;
  }

  formatAscii(bytes: Uint8Array): string {
    let ascii = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      // Display printable ASCII characters (32-126), otherwise show a dot
      ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
    }
    return ascii;
  }
}
