import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { UploadSectionComponent, UploadSectionConfig, UploadedContent } from '../../../../components/upload-section/upload-section.component';
import { ButtonComponent } from '../../../../components/button/button.component';
import { Chart, registerables } from 'chart.js';
import { environment } from '../../../../../environments/environment';
Chart.register(...registerables);

// Interfaces
interface PortfolioAsset {
  asset: string;
  returns: number;
  risk: number;
  selected: 'ok' | 'x' | '';
}

interface OptimizationResponse {
  energy: number;
  selected_assets: string[];
  status: string;
}

@Component({
  selector: 'app-quantum-portfolio-optimizer',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    LabHeaderComponent,
    UploadSectionComponent,
    ButtonComponent
  ],
  templateUrl: './quantum-portfolio-optimizer.component.html',
  styleUrl: './quantum-portfolio-optimizer.component.scss'
})
export class QuantumPortfolioOptimizerComponent implements OnInit {

  // Upload section configuration for CSV files
  uploadConfig: UploadSectionConfig = {
    acceptedFileTypes: ['text/csv', 'application/vnd.ms-excel'],
    fileExtensions: ['.csv'],
    sampleBaseUrl: 'https://quantag-it.com/pub/samples/qaoa/',
    showUrlUpload: true,
    showSampleBrowser: true,
    showClearButton: false, // We handle clearing through the drag-drop area
    showFileUpload: false, // We use custom drag-drop upload
    uploadButtonLabel: 'Upload CSV File',
    urlPlaceholder: 'https://example.com/portfolio-data.csv'
  };

  public csvData: string = '';
  public csvFile: File | null = null;
  public isAnalyzing: boolean = false;
  public errorMessage: string = '';
  public isDragOver: boolean = false;
  public pieChart: Chart | null = null;
  
  // Portfolio data
  public portfolioAssets: PortfolioAsset[] = [];
  public optimizationResult: OptimizationResponse | null = null;

  constructor(private seoService: SeoService, private http: HttpClient) {}

  ngOnInit(): void {
    // Update SEO tags for Quantum Portfolio Optimizer
    this.seoService.updateSeoTags({
      title: 'Quantum Portfolio Optimizer - Quantag IT',
      description: 'Optimize investment portfolios using quantum computing algorithms for better risk-return analysis.',
      keywords: 'quantum computing, portfolio optimization, investment, finance, quantum algorithms'
    });
  }

  onUploadError(error: string): void {
    this.errorMessage = error;
  }

  onContentUploaded(uploadedContent: UploadedContent): void {
    this.csvData = uploadedContent.content;
    this.errorMessage = '';
    this.parseCSVData();
  }

  clearData(): void {
    this.csvData = '';
    this.csvFile = null;
    this.portfolioAssets = [];
    this.optimizationResult = null;
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

  onCsvFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  private handleFileSelection(file: File): void {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      this.errorMessage = 'Please select a CSV file.';
      return;
    }

    // Validate file size (e.g., max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'File size must be less than 10MB.';
      return;
    }

    this.csvFile = file;
    this.errorMessage = '';

    // Read the file content
    const reader = new FileReader();
    reader.onload = (e) => {
      this.csvData = e.target?.result as string;
      this.parseCSVData();
    };
    reader.onerror = () => {
      this.errorMessage = 'Error reading file.';
    };
    reader.readAsText(file);
  }

  private parseCSVData(): void {
    try {
      const lines = this.csvData.trim().split('\n');
      if (lines.length < 2) {
        this.errorMessage = 'CSV file must contain at least a header and one data row.';
        return;
      }

      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate required columns
      const requiredColumns = ['asset', 'returns', 'risk'];
      const missingColumns = requiredColumns.filter(col => !header.includes(col));
      if (missingColumns.length > 0) {
        this.errorMessage = `CSV file must contain columns: ${requiredColumns.join(', ')}. Missing: ${missingColumns.join(', ')}`;
        return;
      }

      // Parse data rows
      this.portfolioAssets = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length >= 3) {
          const asset: PortfolioAsset = {
            asset: row[header.indexOf('asset')],
            returns: parseFloat(row[header.indexOf('returns')]),
            risk: parseFloat(row[header.indexOf('risk')]),
            selected: ''
          };
          
          // Validate numeric values
          if (isNaN(asset.returns) || isNaN(asset.risk)) {
            this.errorMessage = `Invalid numeric values in row ${i + 1}`;
            return;
          }
          
          this.portfolioAssets.push(asset);
        }
      }

      this.errorMessage = '';
    } catch (error) {
      this.errorMessage = 'Error parsing CSV data. Please check the file format.';
    }
  }

  optimizePortfolio(): void {
    if (!this.csvData.trim()) {
      this.errorMessage = 'Please upload a CSV file first.';
      return;
    }

    this.isAnalyzing = true;
    this.errorMessage = '';
    this.optimizationResult = null;

    // Encode CSV data to base64
    const base64Data = btoa(this.csvData);
    const payload = {
      csv: base64Data,
      backend: 'dwave'
    };


    this.http.post<OptimizationResponse>(environment.apiGatewayUrl + '/portfolio-optimize', payload)
    .subscribe({
      next: (response) => {
        if (response.status === 'ok') {
          this.optimizationResult = response;
          this.updateAssetSelection(response.selected_assets);
          this.createPieChart();
        } else {
          this.errorMessage = 'Optimization failed. Please try again.';
        }
        this.isAnalyzing = false;
      },
      error: (error) => {
        console.error('Optimization error:', error);
        this.errorMessage = 'Error optimizing portfolio. Please try again.';
        this.isAnalyzing = false;
      }
    });
  }

  private updateAssetSelection(selectedAssets: string[]): void {
    this.portfolioAssets.forEach(asset => {
      asset.selected = selectedAssets.includes(asset.asset) ? 'ok' : 'x';
    });
  }

  private createPieChart(): void {
    // Destroy existing chart if it exists
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    // Get selected assets for the pie chart
    const selectedAssets = this.portfolioAssets.filter(asset => asset.selected === 'ok');
    
    if (selectedAssets.length === 0) {
      return; // No selected assets to display
    }

    // Prepare data for the pie chart
    const labels = selectedAssets.map(asset => asset.asset);
    const data = selectedAssets.map(asset => Math.abs(asset.returns * 100)); // Use absolute returns as weights
    const colors = this.generateColors(selectedAssets.length);

    // Create the chart
    setTimeout(() => {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      if (canvas) {
        this.pieChart = new Chart(canvas, {
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: colors,
              borderColor: '#ffffff',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 15,
                  usePointStyle: true
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context: any) {
                    const label = context.label || '';
                    const value = context.parsed;
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${label}: ${percentage}%`;
                  }
                }
              }
            }
          }
        });
      }
    }, 100);
  }

  private generateColors(count: number): string[] {
    const baseColors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    const colors = [];
    
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    
    return colors;
  }
}