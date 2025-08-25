import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
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
import { DirectoryParserService } from '../../../../services/directory-parser.service';
import { GuppyAnalysisResponse, GuppyFunction, GuppyCompileResponse, GuppyCompileFunctionResult } from '../../../../interfaces/guppy.interface';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { ButtonComponent } from '../../../../components/button/button.component';

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
    ButtonComponent
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
  
  // URL and sample upload properties
  public urlValue: string = '';
  public isDownloading: boolean = false;
  public isBrowsing: boolean = false;
  public showSampleBrowser: boolean = false;
  public availableSamples: Array<{name: string, description: string, content: string}> = [];
  
  // Monaco editor properties
  private monacoEditor: any;
  private decorations: string[] = [];

  // API endpoints (to be updated with actual endpoints)
  private apiEndpoint = 'https://quantum.quantag-it.com/guppy-compile-api';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private seoService: SeoService,
    private themeService: ThemeService,
    private directoryParser: DirectoryParserService
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

  // URL and sample upload methods
  downloadFromUrl(): void {
    if (!this.urlValue.trim()) return;
    
    this.isDownloading = true;
    this.errorMessage = '';

    console.log(this.isValidUrl(this.urlValue));
    console.log(this.urlValue);

    //check if original URL is valid
    if (!this.isValidUrl(this.urlValue)) {
      this.errorMessage = 'Invalid URL. Please enter a valid Python (.py) URL.';
      this.isDownloading = false;
      return;
    }

    this.http.get(this.urlValue, { responseType: 'text' })
      .subscribe({
        next: (data) => {
          // Validate that we received Python code, not HTML
          if (this.isPythonCode(data)) {
            this.pythonCode = data;
            this.resetAnalysis();
            // Clear URL input after successful download
            this.urlValue = '';
          } else {
            this.errorMessage = 'The URL did not return valid Python code. Please check the URL and ensure it points to a raw Python file.';
          }
        },
        error: (error) => {
          console.error('Error downloading file:', error);
          this.errorMessage = 'Error downloading file. Please check the URL and try again.';
        },
        complete: () => {
          this.isDownloading = false;
        }
      });
  }

  browseSamples(): void {
    this.isBrowsing = true;
    const baseUrl = 'https://quantag-it.com/pub/samples/quantum/guppy/';
    
    this.http.get(baseUrl, { responseType: 'text' })
      .subscribe({
        next: (html) => {
          this.availableSamples = this.directoryParser.parsePythonDirectoryListing(html, baseUrl);
          this.showSampleBrowser = true;
        },
        error: (error) => {
          console.error('Error browsing sample files:', error);
          this.errorMessage = 'Error browsing sample files. Please try again.';
        },
        complete: () => {
          this.isBrowsing = false;
        }
      });
  }

  closeSampleBrowser(): void {
    this.showSampleBrowser = false;
  }

  loadSampleScript(sample: {name: string, description: string, content: string}): void {
    // Check if content is a URL (starts with http)
    if (sample.content.startsWith('http')) {
      this.isDownloading = true;
      this.showSampleBrowser = false;
      
      this.http.get(sample.content, { responseType: 'text' })
        .subscribe({
          next: (data) => {
            // Validate that we received Python code
            if (this.isPythonCode(data)) {
              this.pythonCode = data;
              this.resetAnalysis();
            } else {
              this.errorMessage = `The file ${sample.name} did not return valid Python code.`;
            }
          },
          error: (error) => {
            console.error('Error downloading sample file:', error);
            this.errorMessage = `Error downloading ${sample.name}. Please try again.`;
          },
          complete: () => {
            this.isDownloading = false;
          }
        });
    } else {
      // Content is already the Python code (fallback for hardcoded samples)
      this.pythonCode = sample.content;
      this.resetAnalysis();
      this.showSampleBrowser = false;
    }
  }


  private isValidUrl(url: string): boolean {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z0-9][a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}|localhost|' + // domain name
      '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|' + // OR ip (v4) address
      '\\[?[a-f0-9]*:[a-f0-9:]+\\]?)' + // OR ipv6
      '(\\:\\d+)?(\\/[-a-z0-9%_.~+]*)*' + // port and path
      '(\\?[;&a-z0-9%_.~+=-]*)?' + // query string
      '(\\#[-a-z0-9_]*)?$','i'); // fragment locator
    
    // Check if URL is valid and ends with .py
    return !!pattern.test(url) && url.toLowerCase().endsWith('.py');
  }

  private isPythonCode(content: string): boolean {
    // Check if content looks like HTML (most common issue)
    if (content.trim().toLowerCase().startsWith('<!doctype html') || 
        content.trim().toLowerCase().startsWith('<html') ||
        content.includes('<head>') || 
        content.includes('<body>')) {
      return false;
    }

    // Check for common Python patterns
    const pythonPatterns = [
      /^import\s+\w+/m,           // import statements
      /^from\s+\w+\s+import/m,    // from import statements  
      /^def\s+\w+\s*\(/m,         // function definitions
      /^class\s+\w+/m,            // class definitions
      /^@\w+/m,                   // decorators
      /^#.*$/m,                   // comments
      /^if\s+__name__\s*==\s*['"]['"]__main__['"]['"]:/m // main block
    ];

    // Content should match at least one Python pattern
    const hasPythonPattern = pythonPatterns.some(pattern => pattern.test(content));

    return hasPythonPattern;
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
