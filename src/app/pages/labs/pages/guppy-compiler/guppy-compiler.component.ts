import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
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
import { GuppyAnalysisResponse, GuppyFunction, GuppyCompileResponse, GuppyCompileFunctionResult } from '../../../../interfaces/guppy.interface';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { ButtonComponent } from '../../../../components/button/button.component';
import { UploadSectionComponent, UploadSectionConfig, UploadedContent } from '../../../../components/upload-section/upload-section.component';

@Component({
  selector: 'app-guppy-compiler',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MonacoEditorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatCheckboxModule,
    LabHeaderComponent,
    ButtonComponent,
    UploadSectionComponent
  ],
  templateUrl: './guppy-compiler.component.html',
  styleUrl: './guppy-compiler.component.scss'
})
export class GuppyCompilerComponent implements OnInit, OnDestroy {

  public editorOptions = {
    language: 'python',
    theme: 'vs-dark',
    minimap: { enabled: false },
    fontSize: 14,
    wordWrap: 'on' as const,
    automaticLayout: true
  };

  // Upload section configuration
  uploadConfig: UploadSectionConfig = {
    acceptedFileTypes: ['text/x-python-script'],
    fileExtensions: ['.py'],
    sampleBaseUrl: 'https://quantag-it.com/pub/samples/quantum/guppy/',
    showUrlUpload: true,
    showSampleBrowser: true,
    showClearButton: true,
    showFileUpload: true,
    uploadButtonLabel: 'Upload Python Script',
    urlPlaceholder: 'https://example.com/script.py'
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
  
  // Monaco editor properties
  private monacoEditor: any;
  private decorations: string[] = [];

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

  onUploadError(error: string): void {
    this.errorMessage = error;
  }

  onContentUploaded(uploadedContent: UploadedContent): void {
    this.pythonCode = uploadedContent.content;
    this.resetAnalysis();
    this.errorMessage = '';
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
          // Highlight the detected functions after a short delay to ensure editor is ready
          setTimeout(() => {
            this.highlightGuppyFunctions();
          }, 100);
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

  // Monaco editor methods
  onEditorInit(editor: any): void {
    this.monacoEditor = editor;
  }

  highlightGuppyFunctions(): void {
    if (!this.monacoEditor || !this.analysisResult) return;

    // Clear existing decorations
    this.decorations = this.monacoEditor.deltaDecorations(this.decorations, []);

    // Create new decorations for each function
    const newDecorations = this.analysisResult.functions.map(func => ({
      range: new (window as any).monaco.Range(func.lineno, 1, func.end_lineno, 1),
      options: {
        isWholeLine: true,
        className: 'guppy-function-highlight',
        glyphMarginClassName: 'guppy-function-glyph',
        hoverMessage: { value: `**${func.name}**\nCompile signature: \`${func.compile_sig}\`` }
      }
    }));

    // Apply decorations
    this.decorations = this.monacoEditor.deltaDecorations([], newDecorations);
  }

  clearHighlights(): void {
    if (!this.monacoEditor) return;
    this.decorations = this.monacoEditor.deltaDecorations(this.decorations, []);
  }

  // Scroll to and highlight a specific function in the editor
  scrollToFunction(func: GuppyFunction): void {
    if (!this.monacoEditor) return;
    
    // Scroll to the function
    this.monacoEditor.revealLineInCenter(func.lineno);
    
    // Temporarily highlight the function with a different color
    const tempDecoration = this.monacoEditor.deltaDecorations([], [{
      range: new (window as any).monaco.Range(func.lineno, 1, func.end_lineno, 1),
      options: {
        isWholeLine: true,
        className: 'guppy-function-temp-highlight'
      }
    }]);

    // Remove the temporary highlight after 2 seconds
    setTimeout(() => {
      this.monacoEditor.deltaDecorations(tempDecoration, []);
    }, 2000);
  }

  private resetAnalysis(): void {
    this.analysisResult = null;
    this.selectedFunctions.clear();
    this.compileResults = {};
    this.clearHighlights();
  }

  clearCode(): void {
    this.pythonCode = '';
    this.resetAnalysis();
  }
}
