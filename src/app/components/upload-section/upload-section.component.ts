import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { isPlatformBrowser } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { DirectoryParserService } from '../../services/directory-parser.service';

export interface UploadSectionConfig {
  acceptedFileTypes: string[];
  fileExtensions: string[];
  sampleBaseUrl?: string;
  showUrlUpload?: boolean;
  showSampleBrowser?: boolean;
  showClearButton?: boolean;
  showFileUpload?: boolean;
  uploadButtonLabel?: string;
  urlPlaceholder?: string;
}

export interface UploadedContent {
  content: string;
  fileName?: string;
  source: 'file' | 'url' | 'sample';
  file?: File;
}

@Component({
  selector: 'app-upload-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    ButtonComponent
  ],
  templateUrl: './upload-section.component.html',
  styleUrl: './upload-section.component.scss'
})
export class UploadSectionComponent {
  @ViewChild('fileInput', { static: true }) fileInputRef!: ElementRef<HTMLInputElement>;

  @Input() config: UploadSectionConfig = {
    acceptedFileTypes: ['text/x-python-script'],
    fileExtensions: ['.py'],
    showUrlUpload: true,
    showSampleBrowser: true,
    showClearButton: true,
    showFileUpload: true,
    uploadButtonLabel: 'Upload File',
    urlPlaceholder: 'https://example.com/file.py'
  };

  @Input() currentContent: string = '';
  @Input() disabled: boolean = false;

  @Output() contentUploaded = new EventEmitter<UploadedContent>();
  @Output() contentCleared = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  public urlValue: string = '';
  public isDownloading: boolean = false;
  public isBrowsing: boolean = false;
  public showSampleBrowser: boolean = false;
  public availableSamples: Array<{name: string, description: string, content: string}> = [];

  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private directoryParser: DirectoryParserService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  onFileSelect(): void {
    if (!this.isBrowser || this.disabled) return;
    this.fileInputRef.nativeElement.click();
  }

  onFileChange(event: any): void {
    if (this.disabled) return;
    
    const file = event.target.files[0];
    if (!file) return;

    // Check if file type is accepted
    const isValidType = this.config.acceptedFileTypes.some(type => file.type === type) ||
                       this.config.fileExtensions.some(ext => file.name.toLowerCase().endsWith(ext.toLowerCase()));

    if (isValidType) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        this.contentUploaded.emit({
          content,
          fileName: file.name,
          source: 'file',
          file: file
        });
      };
      if (file.type === 'text/x-python') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    } else {
      const extensions = this.config.fileExtensions.join(', ');
      this.error.emit(`Please select a valid file with one of these extensions: ${extensions}`);
    }

    // Clear the input so the same file can be selected again
    event.target.value = '';
  }

  downloadFromUrl(): void {
    if (!this.urlValue.trim() || this.disabled) return;
    
    this.isDownloading = true;

    // Validate URL format and extension
    if (!this.isValidUrl(this.urlValue)) {
      const extensions = this.config.fileExtensions.join(', ');
      this.error.emit(`Invalid URL. Please enter a valid URL ending with: ${extensions}`);
      this.isDownloading = false;
      return;
    }

    // Determine response type based on file type
    const isImageFile = this.config.acceptedFileTypes.some(type => type.startsWith('image/'));

    if (isImageFile) {
      // Handle image files with blob response
      this.http.get(this.urlValue, { responseType: 'blob' })
        .subscribe({
          next: (blob: Blob) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (this.isValidContent(reader.result as string)) {
                this.contentUploaded.emit({
                  content: reader.result as string,
                  fileName: this.getFileNameFromUrl(this.urlValue),
                  source: 'url',
                  file: new File([blob], this.getFileNameFromUrl(this.urlValue), {type: blob.type})
                });
                // Clear URL input after successful download
                this.urlValue = '';
              } else {
                const extensions = this.config.fileExtensions.join(', ');
                this.error.emit(`The URL did not return valid content. Please check the URL and ensure it points to a raw file with extension: ${extensions}`);
              }
            };
            reader.readAsDataURL(blob);
          },
          error: (error) => {
            console.error('Error downloading file:', error);
            this.error.emit('Error downloading file. Please check the URL and try again.');
            this.isDownloading = false;
          },
          complete: () => {
            this.isDownloading = false;
          }
        });
    } else {
      // Handle text files (like Python) with text response
      this.http.get(this.urlValue, { responseType: 'text' })
        .subscribe({
          next: (textContent: string) => {
            if (this.isValidContent(textContent)) {
              this.contentUploaded.emit({
                content: textContent,
                fileName: this.getFileNameFromUrl(this.urlValue),
                source: 'url'
              });
              // Clear URL input after successful download
              this.urlValue = '';
            } else {
              const extensions = this.config.fileExtensions.join(', ');
              this.error.emit(`The URL did not return valid content. Please check the URL and ensure it points to a raw file with extension: ${extensions}`);
            }
          },
          error: (error) => {
            console.error('Error downloading file:', error);
            this.error.emit('Error downloading file. Please check the URL and try again.');
            this.isDownloading = false;
          },
          complete: () => {
            this.isDownloading = false;
          }
        });
    }
  }

  browseSamples(): void {
    if (!this.config.sampleBaseUrl || this.disabled) return;
    
    this.isBrowsing = true;
    
    this.http.get(this.config.sampleBaseUrl, { responseType: 'text' })
      .subscribe({
        next: (html) => {
          // Parse the directory listing based on file extension
          if (this.config.fileExtensions.some(ext => ext === '.py')) {
            this.availableSamples = this.directoryParser.parsePythonDirectoryListing(html, this.config.sampleBaseUrl!);
          } else if (this.config.acceptedFileTypes.some(type => type.startsWith('image/'))) {
            this.availableSamples = this.directoryParser.parseImageDirectoryListing(html, this.config.sampleBaseUrl!);
          } else {
            // For other file types, use a generic parser
            const genericFiles = this.directoryParser.parseDirectoryListing(html, this.config.sampleBaseUrl!, this.config.fileExtensions[0]);
            this.availableSamples = genericFiles.map(file => ({
              name: file.name.replace(this.config.fileExtensions[0], ''),
              description: `File: ${file.name}`,
              content: file.url
            }));
          }
          this.showSampleBrowser = true;
        },
        error: (error) => {
          console.error('Error browsing sample files:', error);
          this.error.emit('Error browsing sample files. Please try again.');
          this.isBrowsing = false;
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
    if (this.disabled) return;
    
    // Check if content is a URL (starts with http)
    if (sample.content.startsWith('http')) {
      this.isDownloading = true;
      this.showSampleBrowser = false;
      
      // Determine response type based on file type
      const isImageFile = this.config.acceptedFileTypes.some(type => type.startsWith('image/'));
      
      if (isImageFile) {
        // Handle image files with blob response
        this.http.get(sample.content, { responseType: 'blob' })
          .subscribe({
            next: (blob: Blob) => {
              const reader = new FileReader();
              reader.onload = () => {
                if (this.isValidContent(reader.result as string)) {
                  this.contentUploaded.emit({
                    content: reader.result as string,
                    fileName: sample.name,
                    source: 'sample',
                    file: new File([blob], sample.name, {type: blob.type})
                  });
                } else {
                  this.error.emit(`The file ${sample.name} did not return valid content.`);
                }
              };
              reader.readAsDataURL(blob);
            },
            error: (error) => {
              console.error('Error downloading sample file:', error);
              this.error.emit(`Error downloading ${sample.name}. Please try again.`);
              this.isDownloading = false;
            },
            complete: () => {
              this.isDownloading = false;
            }
          });
      } else {
        // Handle text files (like Python) with text response
        this.http.get(sample.content, { responseType: 'text' })
          .subscribe({
            next: (textContent: string) => {
              if (this.isValidContent(textContent)) {
                this.contentUploaded.emit({
                  content: textContent,
                  fileName: sample.name,
                  source: 'sample'
                });
              } else {
                this.error.emit(`The file ${sample.name} did not return valid content.`);
              }
            },
            error: (error) => {
                console.error('Error downloading sample file:', error);
                this.error.emit(`Error downloading ${sample.name}. Please try again.`);
                this.isDownloading = false;
            },
            complete: () => {
                this.isDownloading = false;
            }
          });
      }
    } else {
      // Content is already the code (fallback for hardcoded samples)
      this.contentUploaded.emit({
        content: sample.content,
        fileName: sample.name,
        source: 'sample'
      });
      this.showSampleBrowser = false;
    }
  }

  clearContent(): void {
    if (this.disabled) return;
    this.contentCleared.emit();
  }

  private isValidUrl(url: string): boolean {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z0-9][a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}|localhost|' + // domain name
      '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|' + // OR ip (v4) address
      '\\[?[a-f0-9]*:[a-f0-9:]+\\]?)' + // OR ipv6
      '(\\:\\d+)?(\\/[-a-z0-9%_.~+]*)*' + // port and path
      '(\\?[;&a-z0-9%_.~+=-]*)?' + // query string
      '(\\#[-a-z0-9_]*)?$','i'); // fragment locator
    
    // Check if URL is valid and ends with one of the accepted extensions
    const hasValidExtension = this.config.fileExtensions.some(ext => 
      url.toLowerCase().endsWith(ext.toLowerCase())
    );
    
    return !!pattern.test(url) && hasValidExtension;
  }

  private isValidContent(content: string): boolean {

    // Check if content looks like HTML (most common issue)
    if (content.trim().toLowerCase().startsWith('<!doctype html') || 
        content.trim().toLowerCase().startsWith('<html') ||
        content.includes('<head>') || 
        content.includes('<body>')) {
      return false;
    }

    // For image files, check if it's a valid data URL
    if (this.config.acceptedFileTypes.some(type => type.startsWith('image/'))) {
      return content.startsWith('data:image/');
    }

    // For Python files, check for Python patterns
    if (this.config.fileExtensions.includes('.py')) {
      return this.isPythonCode(content);
    }

    // For other file types, accept any non-HTML content
    return true;
  }

  private isPythonCode(content: string): boolean {
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

    console.log(content)
    // Content should match at least one Python pattern
    return pythonPatterns.some(pattern => pattern.test(content));
  }

  private getFileNameFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop() || 'downloaded_file';
    } catch {
      return 'downloaded_file';
    }
  }

  get acceptAttribute(): string {
    return this.config.fileExtensions.join(',');
  }

  get hasContent(): boolean {
    return this.currentContent.length > 0;
  }
}
