import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';

@Component({
  selector: 'app-base64',
  templateUrl: './base64.component.html',
  styleUrls: ['./base64.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LabHeaderComponent]
})
export class Base64Component implements OnInit, AfterViewInit {
  @ViewChild('plainTextArea', { static: false }) plainTextArea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('base64TextArea', { static: false }) base64TextArea!: ElementRef<HTMLTextAreaElement>;
  
  plainText: string = '';
  base64Text: string = '';
  isConverting: boolean = false;
  errorMessage: string = '';
  inputMode: 'text' | 'image' = 'text';
  isImagePreview: boolean = false;
  imagePreviewSrc: string = '';
  isDragOver: boolean = false;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private seoService: SeoService) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('base64'));
  }

  ngAfterViewInit(): void {
    this.setupResizeSync();
  }

  private setupResizeSync(): void {
    if (!this.isBrowser) return; // Don't use ResizeObserver during SSR
    
    if (this.plainTextArea && this.base64TextArea) {
      const plainTextElement = this.plainTextArea.nativeElement;
      const base64TextElement = this.base64TextArea.nativeElement;

      // Create a ResizeObserver to watch for size changes
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const target = entry.target as HTMLTextAreaElement;
          const height = target.style.height;
          
          if (target === plainTextElement) {
            base64TextElement.style.height = height;
          } else if (target === base64TextElement) {
            plainTextElement.style.height = height;
          }
        }
      });

      // Start observing both textareas
      resizeObserver.observe(plainTextElement);
      resizeObserver.observe(base64TextElement);
    }
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
      this.processImageFile(files[0]);
    }
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processImageFile(input.files[0]);
    }
  }

  private processImageFile(file: File): void {
    if (file.type === 'image/png') {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        this.imagePreviewSrc = result;
        this.plainText = result.split(',')[1];
        this.isImagePreview = true;
        this.errorMessage = '';
      };
      reader.readAsDataURL(file);
    } else {
      this.errorMessage = 'Only PNG images are supported.';
      this.isImagePreview = false;
      this.imagePreviewSrc = '';
      this.plainText = '';
    }
  }

  encodeToBase64(): void {
    if (this.inputMode === 'image') {
      if (!this.plainText) {
        this.errorMessage = 'Please select a PNG image to encode.';
        return;
      }
      try {
        this.isConverting = true;
        this.errorMessage = '';
        // For images, plainText already contains base64, just add the prefix
        this.base64Text = 'data:image/png;base64,' + this.plainText;
      } catch (error) {
        console.error('Error encoding image to Base64:', error);
        this.errorMessage = 'Error encoding image. Please try again.';
      } finally {
        this.isConverting = false;
      }
      return;
    }

    if (!this.plainText.trim()) {
      this.errorMessage = 'Please enter text to encode.';
      return;
    }

    try {
      this.isConverting = true;
      this.errorMessage = '';
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(this.plainText);
      this.base64Text = btoa(String.fromCharCode(...uint8Array));
    } catch (error) {
      console.error('Error encoding to Base64:', error);
      this.errorMessage = 'Error encoding text. Please check your input and try again.';
    } finally {
      this.isConverting = false;
    }
  }

  decodeFromBase64(): void {
    if (!this.base64Text.trim()) {
      this.errorMessage = 'Please enter Base64 text to decode.';
      return;
    }

    try {
      this.isConverting = true;
      this.errorMessage = '';
      this.isImagePreview = false;
      
      // Check if it's a base64 image
      if (this.isBase64Image(this.base64Text)) {
        this.displayImagePreview();
        this.plainText = '[Image Preview - Original text replaced with image display]';
      } else {
        // Decode Base64 to text using TextDecoder for proper UTF-8 handling
        const binaryString = atob(this.base64Text);
        const uint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder();
        this.plainText = decoder.decode(uint8Array);
      }
      
    } catch (error) {
      console.error('Error decoding from Base64:', error);
      this.errorMessage = 'Error decoding Base64. Please check that your input is valid Base64 text.';
    } finally {
      this.isConverting = false;
    }
  }

  private isBase64Image(base64String: string): boolean {
    // Check if it starts with data:image
    if (base64String.startsWith('data:image/')) {
      return true;
    }
    
    // Check if it's a raw base64 image by trying to decode and checking common image signatures
    try {
      const decoded = atob(base64String);
      // Check for common image file signatures
      const imageSignatures = [
        '\xFF\xD8\xFF', // JPEG
        '\x89PNG\r\n\x1A\n', // PNG
        'GIF8', // GIF
        'RIFF', // WebP (starts with RIFF)
        'BM' // BMP
      ];
      
      return imageSignatures.some(signature => decoded.startsWith(signature));
    } catch {
      return false;
    }
  }

  private displayImagePreview(): void {
    let imageSrc = this.base64Text;
    
    // If it doesn't have data URL prefix, try to detect format and add it
    if (!imageSrc.startsWith('data:image/')) {
      try {
        const decoded = atob(this.base64Text);
        let mimeType = 'image/png'; // default
        
        if (decoded.startsWith('\xFF\xD8\xFF')) {
          mimeType = 'image/jpeg';
        } else if (decoded.startsWith('\x89PNG')) {
          mimeType = 'image/png';
        } else if (decoded.startsWith('GIF8')) {
          mimeType = 'image/gif';
        } else if (decoded.startsWith('RIFF')) {
          mimeType = 'image/webp';
        } else if (decoded.startsWith('BM')) {
          mimeType = 'image/bmp';
        }
        
        imageSrc = `data:${mimeType};base64,${this.base64Text}`;
      } catch {
        imageSrc = `data:image/png;base64,${this.base64Text}`;
      }
    }
    
    this.imagePreviewSrc = imageSrc;
    this.isImagePreview = true;
  }

  copyPlainText(): void {
    if (!this.isBrowser) return; // Don't use navigator.clipboard during SSR
    
    if (this.plainText) {
      navigator.clipboard.writeText(this.plainText).then(() => {
        console.log('Plain text copied to clipboard');
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
  }

  copyBase64Text(): void {
    if (!this.isBrowser) return; // Don't use navigator.clipboard during SSR
    
    if (this.base64Text) {
      navigator.clipboard.writeText(this.base64Text).then(() => {
        console.log('Base64 text copied to clipboard');
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
  }

  clearPlainText(): void {
    this.plainText = '';
    this.errorMessage = '';
    this.isImagePreview = false;
    this.imagePreviewSrc = '';
  }

  clearBase64Text(): void {
    this.base64Text = '';
    this.errorMessage = '';
    this.isImagePreview = false;
    this.imagePreviewSrc = '';
  }

  clearFields(): void {
    this.plainText = '';
    this.base64Text = '';
    this.errorMessage = '';
    this.isImagePreview = false;
    this.imagePreviewSrc = '';
  }

  downloadBase64AsText(): void {
    if (!this.isBrowser) return; // Don't use window/document during SSR
    
    if (this.base64Text) {
      const blob = new Blob([this.base64Text], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'base64-encoded.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  }

  downloadDecodedContent(): void {
    if (!this.plainText) return;

    // Check if the decoded content is an image (base64 starts with data:image)
    if (this.isDecodedImage()) {
      this.downloadAsImage();
    } else {
      this.downloadAsText();
    }
  }

  private downloadAsText(): void {
    if (!this.isBrowser) return; // Don't use window/document during SSR
    
    const blob = new Blob([this.plainText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'decoded-text.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private downloadAsImage(): void {
    if (!this.isBrowser) return; // Don't use document during SSR
    
    try {
      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.href = this.imagePreviewSrc || `data:image/png;base64,${this.plainText}`;
      link.download = 'decoded-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
      this.errorMessage = 'Error downloading image. Please try again.';
    }
  }

  isDecodedImage(): boolean {
    // Check if the base64 text contains image data URL prefix or if we're in image mode with preview
    return this.base64Text.startsWith('data:image/') || (this.inputMode === 'image' && this.isImagePreview);
  }
}
