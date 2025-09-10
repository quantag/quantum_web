import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ITableDiff } from '../../../../interfaces/table_diff.interface';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from "../../../../components/lab-header/lab-header.component";
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-compare-sql',
  templateUrl: './compare_sql.component.html',
  styleUrls: ['./compare_sql.component.scss'],
  standalone: true,
  imports: [CommonModule, LabHeaderComponent]
})
export class CompareSqlComponent implements OnInit{
  file1: File | null = null;
  file2: File | null = null;
  isDragOver1: boolean = false;
  isDragOver2: boolean = false;
  isComparing: boolean = false;
  errorMessage: string = '';
  result: ITableDiff | null = null;
  tableDifferenceKeys: string[] = [];
  private isBrowser: boolean;
  
  // Pre-computed field arrays for each table
  tableFieldData: {
    [tableName: string]: {
      fieldsWithDifferences: Array<{key: string, db1Type: string, db2Type: string}>;
      fieldsOnlyInDb1: Array<{key: string, value: string}>;
      fieldsOnlyInDb2: Array<{key: string, value: string}>;
    }
  } = {};


  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private seoService: SeoService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('compare-sql'));
  }

  onDragOver(event: DragEvent, containerNumber: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (containerNumber === 1) {
      this.isDragOver1 = true;
    } else {
      this.isDragOver2 = true;
    }
  }

  onDragLeave(event: DragEvent, containerNumber: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (containerNumber === 1) {
      this.isDragOver1 = false;
    } else {
      this.isDragOver2 = false;
    }
  }

  onDrop(event: DragEvent, containerNumber: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver1 = false;
    this.isDragOver2 = false;

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.handleFileSelection(files[0], containerNumber);
    }
  }

  onFileSelected(event: Event, fileNumber: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0], fileNumber);
    }
  }

  private handleFileSelection(file: File, fileNumber: number): void {
    if (!file.name.toLowerCase().endsWith('.sql')) {
      this.errorMessage = 'Please select a SQL file (.sql)';
      return;
    }

    this.errorMessage = '';
    if (fileNumber === 1) {
      this.file1 = file;
    } else {
      this.file2 = file;
    }
  }

  async compareFiles(): Promise<void> {
    if (!this.file1 || !this.file2) {
      this.errorMessage = 'Please select both SQL files';
      return;
    }

    this.isComparing = true;
    this.errorMessage = '';
    this.result = null;

    try {
      const [file1Base64, file2Base64] = await Promise.all([
        this.fileToBase64(this.file1),
        this.fileToBase64(this.file2)
      ]);

      const requestBody = {
        db1_b64: file1Base64,
        db2_b64: file2Base64
      };

      this.http.post<ITableDiff>(environment.apiGatewayUrl + '/sql-compare', requestBody).subscribe({
        next: (response) => {
          this.result = response;
          this.updateStaticArrays();
          this.isComparing = false;
        },
        error: (error) => {
          console.error('Comparison error:', error);
          this.errorMessage = 'Failed to compare SQL files. Please try again.';
          this.isComparing = false;
        }
      });
    } catch (error) {
      console.error('File processing error:', error);
      this.errorMessage = 'Failed to process files. Please try again.';
      this.isComparing = false;
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (data:*/*;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  removeFile(fileNumber: number): void {
    if (fileNumber === 1) {
      this.file1 = null;
    } else {
      this.file2 = null;
    }
    this.result = null;
    this.errorMessage = '';
    this.clearStaticArrays();
  }

  private updateStaticArrays(): void {
    if (!this.result) {
      this.clearStaticArrays();
      return;
    }

    // Update table difference keys
    this.tableDifferenceKeys = Object.keys(this.result.table_differences || {});
    
    // Pre-compute all field data for each table
    this.tableFieldData = {};
    this.tableDifferenceKeys.forEach(tableName => {
      const tableDiff = this.result!.table_differences[tableName];
      
      // Fields with differences
      const fieldsWithDifferences = Object.keys(tableDiff.fields_exist_in_db1_and_db2_but_difference || {})
        .map(key => ({
          key,
          db1Type: tableDiff.fields_exist_in_db1_and_db2_but_difference[key].data_type_in_db1,
          db2Type: tableDiff.fields_exist_in_db1_and_db2_but_difference[key].data_type_in_db2
        }));
      
      // Fields only in DB1
      const fieldsOnlyInDb1 = Object.keys(tableDiff.fields_exist_in_db1_only || {})
        .map(key => ({
          key,
          value: tableDiff.fields_exist_in_db1_only[key]
        }));
      
      // Fields only in DB2
      const fieldsOnlyInDb2 = Object.keys(tableDiff.fields_exist_in_db2_only || {})
        .map(key => ({
          key,
          value: tableDiff.fields_exist_in_db2_only[key]
        }));
      
      this.tableFieldData[tableName] = {
        fieldsWithDifferences,
        fieldsOnlyInDb1,
        fieldsOnlyInDb2
      };
    });
  }

  private clearStaticArrays(): void {
    this.tableDifferenceKeys = [];
    this.tableFieldData = {};
  }

  downloadResults(): void {
    if (!this.result) {
      return;
    }

    if (!this.isBrowser) return; // Don't use window/document during SSR

    // Create the download data with metadata
    const downloadData = {
      metadata: {
        downloadDate: new Date().toISOString(),
        file1Name: this.file1?.name || 'Unknown',
        file2Name: this.file2?.name || 'Unknown',
        comparisonTimestamp: new Date().toISOString()
      },
      results: this.result
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(downloadData, null, 2);
    
    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `sql-comparison-results-${this.formatDateForFilename(new Date())}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private formatDateForFilename(date: Date): string {
    return date.toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .slice(0, 19);
  }

  // Remove the getFieldKeys method since we're not using it anymore
}
