import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { SeoService } from '../../../../services/seo.service';
import { ThemeService } from '../../../../services/theme.service';
import { GuppyAnalysisResponse, GuppyCompileResponse, GuppyCompileFunctionResult } from '../../../../interfaces/guppy.interface';

@Component({
  selector: 'app-guppy-compiler',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    FormsModule, 
    MonacoEditorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatCheckboxModule
  ],
  templateUrl: './guppy-compiler.component.html',
  styleUrl: './guppy-compiler.component.scss'
})
export class GuppyCompilerComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput', { static: true }) fileInputRef!: ElementRef<HTMLInputElement>;

  public editorOptions = {
    language: 'python',
    theme: 'vs-dark',
    minimap: { enabled: false },
    fontSize: 14,
    wordWrap: 'on' as const,
    automaticLayout: true
  };

  public pythonCode: string = '';

  public isAnalyzing: boolean = false;
  public isCompiling: boolean = false;
  public analysisResult: GuppyAnalysisResponse | null = null;
  public selectedFunctions: Set<string> = new Set();
  public compileResults: { [functionName: string]: GuppyCompileFunctionResult } = {};
  public errorMessage: string = '';
  public isDarkMode: boolean = false;
  private isBrowser: boolean;
  private themeSubscription?: Subscription;

  // API endpoints (to be updated with actual endpoints)
  private apiEndpoint = 'https://cryspprod3.quantag-it.com:444/api17';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private seoService: SeoService,
    private themeService: ThemeService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Update SEO tags for Guppy Compiler
    this.seoService.updateSeoTags(this.seoService.getSeoData('guppy-compiler'));
    
    // Subscribe to theme changes and update Monaco editor theme
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
      this.editorOptions = {
        ...this.editorOptions,
        theme: isDark ? 'vs-dark' : 'vs'
      };
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  onFileSelect(): void {
    if (!this.isBrowser) return;
    this.fileInputRef.nativeElement.click();
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/x-python-script' || file.name.endsWith('.py')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.pythonCode = e.target?.result as string;
      };
      reader.readAsText(file);
      this.resetAnalysis();
    } else {
      this.errorMessage = 'Please select a valid Python (.py) file';
    }
  }

  analyzePythonCode(): void {
    if (!this.pythonCode.trim()) {
      this.errorMessage = 'Please enter some Python code to analyze';
      return;
    }

    this.isAnalyzing = true;
    this.errorMessage = '';
    this.resetAnalysis();

    // Convert Python code to base64
    const base64Code = btoa(this.pythonCode);
    this.http.post<GuppyAnalysisResponse>(
      this.apiEndpoint + '/detect',
      { source_b64: base64Code }
    ).subscribe({
      next: (response) => {
        if (response && response.ok) {
          this.analysisResult = response;
        } else {
          this.errorMessage = 'Analysis failed. Please check your Python code.';
        }

        this.isAnalyzing = false;
      },
      error: (error) => {
        console.error('Analysis error:', error);
        this.errorMessage = 'Failed to analyze code. Please try again.';
        this.isAnalyzing = false;
      }
    });
  }

  onFunctionSelect(functionName: string, selected: boolean): void {
    if (selected) {
      this.selectedFunctions.add(functionName);
    } else {
      this.selectedFunctions.delete(functionName);
    }
  }

  compileSelectedFunctions(): void {
    if (this.selectedFunctions.size === 0) {
      this.errorMessage = 'Please select at least one function to compile';
      return;
    }

    this.isCompiling = true;
    this.errorMessage = '';

    const base64Code = btoa(this.pythonCode);

    this.http.post<GuppyCompileResponse>(
      this.apiEndpoint + '/compile',
      { 
        source_b64: base64Code,
        functions: Array.from(this.selectedFunctions),
        formats: 'hugr,json,str'
      }
    ).subscribe({
      next: (response) => {
        if (response && response.ok && response.results) {
          // Store the individual function results
          for (const [functionName, result] of Object.entries(response.results)) {
            this.compileResults[functionName] = result;
          }
        } else {
          this.errorMessage = 'Compilation failed. Please check your code and try again.';
        }

        this.isCompiling = false;
      },
      error: (error) => {
        console.error('Compilation error:', error);
        this.errorMessage = 'Failed to compile code. Please try again.';
        this.isCompiling = false;
      }
    });
  }

  downloadFile(functionName: string, type: 'hugr' | 'json' | 'str'): void {
    if (!this.isBrowser) return;
    
    const result = this.compileResults[functionName];
    if (!result) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (type) {
      case 'hugr':
        if (!result.hugr) return;
        content = atob(result.hugr);
        filename = `${functionName}.hugr`;
        mimeType = 'application/octet-stream';
        break;
      case 'json':
        if (!result.json) return;
        content = result.json;
        filename = `${functionName}.json`;
        mimeType = 'application/json';
        break;
      case 'str':
        if (!result.str) return;
        content = result.str;
        filename = `${functionName}.txt`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  hasSelectedFunctions(): boolean {
    return this.selectedFunctions.size > 0;
  }

  getSelectedFunctionsCount(): number {
    return this.selectedFunctions.size;
  }

  // Helper methods for compile results
  isCompileSuccessful(functionName: string): boolean {
    const result = this.compileResults[functionName];
    return result && (!!result.hugr || !!result.json || !!result.str);
  }

  hasCompileResult(functionName: string, type: 'hugr' | 'json' | 'str'): boolean {
    const result = this.compileResults[functionName];
    return result && !!result[type];
  }

  private resetAnalysis(): void {
    this.analysisResult = null;
    this.selectedFunctions.clear();
    this.compileResults = {};
  }

  clearCode(): void {
    this.pythonCode = '';
    this.resetAnalysis();
  }
}
