import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-qir',
  templateUrl: './qir.component.html',
  styleUrls: ['./qir.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class QirComponent implements OnInit {
  openQasmCode: string = '';
  qirCode: string = '';
  isConverting: boolean = false;
  errorMessage: string = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
  }

  convertToQir(): void {
    if (!this.openQasmCode.trim()) {
      this.errorMessage = 'Please enter OpenQASM code to convert.';
      return;
    }

    this.isConverting = true;
    this.errorMessage = '';
    this.qirCode = '';

    const apiUrl = 'https://quantum.quantag-it.com/proxy/api/qasm2qir';
    
    // Encode the QASM code to base64
    const encodedQasm = btoa(this.openQasmCode);
    const payload = { qasm: encodedQasm };
    
    this.http.post(apiUrl, payload).subscribe({
      next: (response: any) => {
        if (response.status === "0") {
          // Decode the base64 QIR response
          this.qirCode = atob(response.qir);
        } else {
          this.errorMessage = response.error || 'Error converting code. Please check your OpenQASM syntax and try again.';
        }
      },
      error: (error) => {
        console.error('Error converting OpenQASM to QIR:', error);
        this.errorMessage = 'Error converting code. Please check your OpenQASM syntax and try again.';
        this.isConverting = false;
      },
      complete: () => {
        this.isConverting = false;
      }
    });
  }

  clearFields(): void {
    this.openQasmCode = '';
    this.qirCode = '';
    this.errorMessage = '';
  }

  copyQirCode(): void {
    if (this.qirCode) {
      navigator.clipboard.writeText(this.qirCode).then(() => {
        // You could add a toast notification here
        console.log('QIR code copied to clipboard');
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
  }
}
