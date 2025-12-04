import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { environment } from '../../../../../environments/environment';
import { UploadedContent, UploadSectionComponent, UploadSectionConfig } from '../../../../components/upload-section/upload-section.component';

@Component({
  selector: 'app-circuit-optimizer',
  templateUrl: './circuit-optimizer.component.html',
  styleUrls: ['./circuit-optimizer.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LabHeaderComponent, UploadSectionComponent]
})
export class CircuitOptimizerComponent implements OnInit {
  inputCode: string = '';
  outputCode: string = '';
  isOptimizing: boolean = false;
  errorMessage: string = '';

  uploadConfig: UploadSectionConfig = {
    acceptedFileTypes: ['text/plain', 'application/octet-stream'],
    fileExtensions: ['.qasm', '.txt'],
    sampleBaseUrl: 'https://quantag-it.com/pub/samples/quantum/optimizer/',
    showUrlUpload: true,
    showSampleBrowser: true,
    showClearButton: true,
    showFileUpload: true,
    uploadButtonLabel: 'Upload QASM File',
    urlPlaceholder: 'https://example.com/circuit.qasm'
  };

  constructor(private http: HttpClient, private seoService: SeoService) { }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('circuit-optimizer'));
  }

  optimize(): void {
    if (!this.inputCode.trim()) {
      this.errorMessage = 'Please enter OpenQASM code to optimize.';
      return;
    }

    this.isOptimizing = true;
    this.errorMessage = '';
    this.outputCode = '';

    // Encode the QASM code to base64
    const encodedQasm = btoa(this.inputCode);
    const payload = {
      type: 0,  // 0 = BQSKit optimizer
      src: encodedQasm
    };
    
    this.http.post<{ status: number; src: string }>(environment.apiGatewayUrl + "/optimize", payload).subscribe({
      next: (response) => {
        if (response.status === 0 && response.src) {
          try {
            this.outputCode = atob(response.src);
          } catch (error) {
            console.error('Error decoding optimized QASM:', error);
            this.errorMessage = 'Error processing optimization response.';
          }
        } else {
          this.errorMessage = `Optimization failed with status: ${response.status}. Please check your code syntax.`;
        }
      },
      error: (error) => {
        console.error('Error optimizing circuit:', error);
        this.errorMessage = 'Error optimizing circuit. Please check your OpenQASM syntax and try again.';
        this.isOptimizing = false;
      },
      complete: () => {
        this.isOptimizing = false;
      }
    });
  }

  clearFields(withInput: boolean = true): void {
    this.outputCode = '';
    this.errorMessage = '';

    if (withInput) {
      this.inputCode = '';
    }
  }

  copyOutputCode(): void {
    if (this.outputCode) {
      navigator.clipboard.writeText(this.outputCode).then(() => {
        console.log('Optimized code copied to clipboard');
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
  }

  downloadOutput(): void {
    if (!this.outputCode.trim()) {
      this.errorMessage = 'No optimized code to download.';
      return;
    }

    const blob = new Blob([this.outputCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optimized_circuit_${Date.now()}.qasm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
    
    this.inputCode = content;
    this.errorMessage = '';
  }

  onUploadError(error: string): void {
    this.errorMessage = error;
  }
}
