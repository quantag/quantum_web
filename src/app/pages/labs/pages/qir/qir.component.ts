import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-qir',
  templateUrl: './qir.component.html',
  styleUrls: ['./qir.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LabHeaderComponent]
})
export class QirComponent implements OnInit {
  openQasmCode: string = '';
  responseCode: string = '';
  isConverting: boolean = false;
  errorMessage: string = '';
  selectedFormat: string = 'QIR';
  
  // Available conversion formats
  conversionFormats = [
    { value: 'QIR', label: 'QIR' },
    { value: 'CUDAQ-CPP', label: 'CUDAQ-CPP' },
    { value: 'CUDAQ-Python', label: 'CUDAQ-Python' }
  ];

  constructor(private http: HttpClient, private seoService: SeoService) { }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('qir'));
  }

  convertToQir(): void {
    if (!this.openQasmCode.trim()) {
      this.errorMessage = 'Please enter OpenQASM code to convert.';
      return;
    }

    this.isConverting = true;
    this.errorMessage = '';
    this.responseCode = '';

    // Determine the API endpoint based on selected format
    let apiUrl: string = '';
    if(this.selectedFormat === 'QIR') {
      apiUrl = 'https://quantum.quantag-it.com/proxy/api/qasm2qir';
    } else {
      apiUrl = environment.apiGatewayUrl + '/cudaq-compile';
    }
    
    // Encode the QASM code to base64
    const encodedQasm = btoa(this.openQasmCode);
    let payload: { qasm: string; type?: string } = { qasm: encodedQasm };

    if(this.selectedFormat === 'CUDAQ-CPP' || this.selectedFormat === 'CUDAQ-Python') {
      payload.type = this.selectedFormat === 'CUDAQ-CPP' ? 'cpp' : 'python';
    }
    
    this.http.post(apiUrl, payload).subscribe({
      next: (response: any) => {
        if(this.selectedFormat === 'CUDAQ-CPP' || this.selectedFormat === 'CUDAQ-Python')   {
          this.responseCode = atob(response.output);
        } else {
          this.responseCode = atob(response.qir) || '';
        }
        this.isConverting = false;
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

  clearFields(): void {
    this.openQasmCode = '';
    this.responseCode = '';
    this.errorMessage = '';
  }

  copyResponseCode(): void {
    if (this.responseCode) {
      navigator.clipboard.writeText(this.responseCode).then(() => {
        // You could add a toast notification here
        console.log(`${this.selectedFormat} code copied to clipboard`);
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
  }
}
