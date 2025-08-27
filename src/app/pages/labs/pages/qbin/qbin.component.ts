import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';

@Component({
  selector: 'app-qbin',
  templateUrl: './qbin.component.html',
  styleUrls: ['./qbin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LabHeaderComponent]
})
export class QbinComponent implements OnInit {
  openQasmCode: string = '';
  qbinData: string = '';
  qbinBinaryData: string = '';
//   qbinHexOutput: string = '';
//   qbinBinaryOutput: string = '';
  outputMode: 'hex' | 'binary' = 'hex';
  isConverting: boolean = false;
  errorMessage: string = '';
  conversionMode: 'qasmToQbin' | 'qbinToQasm' = 'qasmToQbin';
  

  constructor(private http: HttpClient, private seoService: SeoService) { }

  apiUrl = 'https://quantum.quantag-it.com/qbin-api';


  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('qbin'));
  }

//   get displayOutput(): string {
//     return this.outputMode === 'hex' ? this.qbinHexOutput : this.qbinBinaryOutput;
//   }

  convertToQbin(): void {
    if (!this.openQasmCode.trim()) {
      this.errorMessage = 'Please enter OpenQASM code to convert.';
      return;
    }

    this.isConverting = true;
    this.errorMessage = '';
    this.qbinData = '';
    this.qbinBinaryData = '';
    // this.qbinHexOutput = '';
    // this.qbinBinaryOutput = '';

    
    // Encode the QASM code to base64
    const encodedQasm = btoa(this.openQasmCode);
    const payload = { qasm_b64: encodedQasm };
    
    this.http.post(this.apiUrl + '/compile', payload).subscribe({
      next: (response: any) => {
        if (response.qbin_b64) {
          try {
            const binaryData = atob(response.qbin_b64);
            console.log('Decoded QBIN binary data:', Array.from(binaryData));
            this.qbinData = Array.from(binaryData).map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join(' ')
              .toUpperCase();
              
            this.qbinBinaryData = Array.from(binaryData).map(c => 
              c.charCodeAt(0).toString(2).padStart(8, '0')
            ).join(' ');

              
          } catch (error) {
            console.error('Error decoding QBIN data:', error);
            this.errorMessage = 'Error processing QBIN response data.';
          }
        } else {
          this.errorMessage = response.error || 'Error converting OpenQASM to QBIN. Please check your code syntax and try again.';
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

  compileToOpenQASM(): void {
    if (!this.qbinData.trim()) {
      this.errorMessage = 'No QBIN data to convert.';
      return;
    }

    this.isConverting = true;
    this.errorMessage = '';
    this.openQasmCode = '';

    try {
        // Convert hex string to binary data, then to base64
        const hexString = this.qbinData.replace(/\s/g, ''); // Remove spaces
        const binaryString = hexString.match(/.{2}/g)?.map(hex => String.fromCharCode(parseInt(hex, 16))).join('') || '';
        const base64Data = btoa(binaryString);

        console.log(hexString)
        console.log(binaryString)
        console.log(base64Data)
        
        const payload = { qbin_b64: base64Data };

        this.http.post(this.apiUrl + '/decompile', payload).subscribe({
        next: (response: any) => {
            if (response.qasm_b64) {
            this.openQasmCode = atob(response.qasm_b64);
            } else {
            this.errorMessage = response.error || 'Error converting QBIN to OpenQASM. Please try again.';
            }
        },
        error: (error) => {
            console.error('Error converting QBIN to OpenQASM:', error);
            this.errorMessage = 'Error converting QBIN to OpenQASM. Please try again.';
            this.isConverting = false;
        },
        complete: () => {
            this.isConverting = false;
        }
        });
    } catch {
        this.errorMessage = 'Error decoding QBIN data.';
        this.isConverting = false;
    }
  }

  downloadQbinFile(): void {
    if (!this.qbinData.trim()) {
      this.errorMessage = 'No QBIN data to download.';
      return;
    }

    let binaryData: Uint8Array;
    
    try {
      // Try to decode base64 first
      const decoded = atob(this.qbinData);
      const bytes = [];
      for (let i = 0; i < decoded.length; i++) {
        bytes.push(decoded.charCodeAt(i));
      }
      binaryData = new Uint8Array(bytes);
    } catch {
      // If not base64, treat as text
      const encoder = new TextEncoder();
      binaryData = encoder.encode(this.qbinData);
    }

    const blob = new Blob([new Uint8Array(binaryData)], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quantum_circuit_${Date.now()}.qbin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  clearFields(): void {
    this.openQasmCode = '';
    this.qbinData = '';
    this.qbinBinaryData = '';
    this.errorMessage = '';
  }

  clearOpenQasm(): void {
    this.openQasmCode = '';
    this.errorMessage = '';
  }

  clearQbin(): void {
    this.qbinData = '';
    this.qbinBinaryData = '';
    this.errorMessage = '';
  }

  copyQasmCode(): void {
    if (this.openQasmCode) {
      navigator.clipboard.writeText(this.openQasmCode).then(() => {
        console.log('OpenQASM code copied to clipboard');
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
  }

  copyQbinCode(): void {
    const dataToCopy = this.conversionMode === 'qasmToQbin' ? this.displayQbinData : this.qbinData;
    navigator.clipboard.writeText(dataToCopy).then(() => {
    console.log('QBIN code copied to clipboard');
    }).catch(err => {
    console.error('Could not copy text: ', err);
    });
  }

  toggleConversionMode(): void {
    this.conversionMode = this.conversionMode === 'qasmToQbin' ? 'qbinToQasm' : 'qasmToQbin';
    this.clearFields();
  }

  convert(): void {
    if (this.conversionMode === 'qasmToQbin') {
      this.convertToQbin();
    } else {
      this.compileToOpenQASM();
    }
  }

  get inputLabel(): string {
    return this.conversionMode === 'qasmToQbin' ? 'OpenQASM Code' : 'QBIN Data';
  }

  get outputLabel(): string {
    return this.conversionMode === 'qasmToQbin' ? 'QBIN Output' : 'OpenQASM Output';
  }

  get switchModeButtonLabel(): string {
    return this.conversionMode === 'qasmToQbin' ? 'OpenQASM to QBIN' : 'QBIN to OpenQASM';
  }

    get convertButtonLabel(): string {
    if (this.isConverting) {
      return 'Converting...';
    }
    return this.conversionMode === 'qasmToQbin' ? 'Encode to QBIN' : 'Encode to OpenQASM';
  }

  get inputData(): string {
    return this.conversionMode === 'qasmToQbin' ? this.openQasmCode : this.qbinData;
  }

  set inputData(value: string) {
    if (this.conversionMode === 'qasmToQbin') {
      this.openQasmCode = value;
    } else {
      this.qbinData = value;
    }
  }

  get outputData(): string {
    return this.conversionMode === 'qasmToQbin' ? this.displayQbinData : this.openQasmCode;
  }

  get inputPlaceholder(): string {
    return this.conversionMode === 'qasmToQbin' 
      ? `Example:\nOPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;`
      : "Paste your QBIN data here (hex format)...";
  }

  copyInputData(): void {
    if (this.conversionMode === 'qasmToQbin') {
      this.copyQasmCode();
    } else {
      this.copyQbinCode();
    }
  }

  copyOutputData(): void {
    if (this.conversionMode === 'qasmToQbin') {
      this.copyQbinCode();
    } else {
      this.copyQasmCode();
    }
  }

  toggleOutputMode(): void {
    this.outputMode = this.outputMode === 'hex' ? 'binary' : 'hex';
  }

  setOutputMode(mode: 'hex' | 'binary'): void {
    if (this.outputMode !== mode) {
      this.outputMode = mode;
    }
  }

  get displayQbinData(): string {
    return this.outputMode === 'hex' ? this.qbinData : this.qbinBinaryData;
  }

  get toggleOutputModeLabel(): string {
    return this.outputMode === 'hex' ? 'BIN' : 'HEX';
  }
}
