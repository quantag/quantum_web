import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import JSZip from 'jszip';
import { ProcessImgResponse } from '../../../../interfaces/proccessImgResponse.interface';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../services/seo.service';

interface CompressedImage {
  src: string;
  name: string;
  size: number;
  compressionRatio: number;
  algorithm: string;
}

interface OriginalImage {
  src: string;
  name: string;
  size: number;
  file: File;
}

@Component({
  selector: 'app-qic',
  templateUrl: './qic.component.html',
  styleUrls: ['./qic.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink]
})
export class QicComponent implements OnInit {
  originalImage: OriginalImage | null = null;
  compressedImages: CompressedImage[] = [];
  isDragOver: boolean = false;
  isCompressing: boolean = false;
  isCreatingZip: boolean = false;
  errorMessage: string = '';

  constructor(private http: HttpClient, private seoService: SeoService) { }

  private apiUrl = 'https://quantum.quantag-it.com/image-handling-api/process';

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('qic'));
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

  private async processImageFile(file: File): Promise<void> {
    console.log('Processing file:', file);
    const isValidDimensions = await this.isValidImageDimensions(file);
    if (this.isValidImageType(file.type) && isValidDimensions) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        this.originalImage = {
          src: result,
          name: file.name,
          size: file.size,
          file: file
        };
        this.compressedImages = [];
        this.errorMessage = '';
      };
      reader.readAsDataURL(file);
    } else {
      this.errorMessage = 'Unsupported file format. Please use PNG format with dimensions up to 64x64 pixels.';
      this.originalImage = null;
      this.compressedImages = [];
    }
  }

  private isValidImageType(type: string): boolean {
    const validTypes = ['image/png'];
    return validTypes.includes(type);
  }

  private isValidImageDimensions(file: File): Promise<boolean> {
    const maxWidth = 64;
    const maxHeight = 64;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    return new Promise<boolean>((resolve) => {
      img.onload = () => {
        console.log(`Image dimensions: ${img.width}x${img.height}`);
        resolve(img.width <= maxWidth && img.height <= maxHeight);
      };
      img.onerror = () => {
        resolve(false);
      };
    });

  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  compressImage(): void {
    if (!this.originalImage) return;

    this.isCompressing = true;
    this.errorMessage = '';
    this.compressedImages = [];

    const base64Image = this.convertImageToBase64(this.originalImage);

    this.http.post<ProcessImgResponse>(this.apiUrl, { image: base64Image }).subscribe({
      next: (response) => {
        if (response) {
          // Create compressed images from the response
          const compressedImages: CompressedImage[] = [];
          
          // Main compressed image
          compressedImages.push({
            src: `data:image/png;base64,${response.compressed}`,
            name: `${this.originalImage!.name.split('.')[0]}_compressed.png`,
            size: this.estimateBase64Size(response.compressed),
            compressionRatio: this.calculateCompressionRatio(this.originalImage!.size, this.estimateBase64Size(response.compressed)),
            algorithm: 'Quantum Compression'
          });

          // Reconstructed image
          compressedImages.push({
            src: `data:image/png;base64,${response.reconstructed}`,
            name: `${this.originalImage!.name.split('.')[0]}_reconstructed.png`,
            size: this.estimateBase64Size(response.reconstructed),
            compressionRatio: this.calculateCompressionRatio(this.originalImage!.size, this.estimateBase64Size(response.reconstructed)),
            algorithm: 'Quantum Reconstructed'
          });

          // Overlay images
          response.overlays.forEach((overlay, index) => {
            compressedImages.push({
              src: `data:image/png;base64,${overlay}`,
              name: `${this.originalImage!.name.split('.')[0]}_overlay_${index + 1}.png`,
              size: this.estimateBase64Size(overlay),
              compressionRatio: this.calculateCompressionRatio(this.originalImage!.size, this.estimateBase64Size(overlay)),
              algorithm: `Quantum Overlay ${index + 1}`
            });
          });

          this.compressedImages = compressedImages;
        } else {
          this.errorMessage = 'No response received from the server.';
        }
        this.isCompressing = false;
      },
      error: (error) => {
        console.error('Error compressing image:', error);
        this.errorMessage = 'Error compressing image. Please try again.';
        this.isCompressing = false;
      },
      complete: () => {
        this.isCompressing = false;
      }
    });
  }


  downloadImage(compressed: CompressedImage): void {
    const link = document.createElement('a');
    link.download = compressed.name;
    link.href = compressed.src;
    link.click();
  }

  downloadAllImages(): void {
    if (this.compressedImages.length === 0) return;

    this.isCreatingZip = true;
    this.errorMessage = '';
    
    const zip = new JSZip();
    const promises: Promise<void>[] = [];

    // Create promises for each image processing
    this.compressedImages.forEach((compressed, index) => {
      const promise = this.addImageToZip(zip, compressed);
      promises.push(promise);
    });

    // Wait for all images to be processed, then generate ZIP
    Promise.allSettled(promises)
      .then(async (results) => {
        // Check if any images were successfully added
        const successCount = results.filter(result => result.status === 'fulfilled').length;
        
        if (successCount === 0) {
          this.errorMessage = 'Failed to process any images for ZIP creation.';
          this.isCreatingZip = false;
          return;
        }

        // Generate and download ZIP
        await this.generateAndDownloadZip(zip);
        this.isCreatingZip = false;
      })
      .catch((error) => {
        console.error('Error in ZIP creation process:', error);
        this.errorMessage = 'Error creating ZIP file. Please try again.';
        this.isCreatingZip = false;
      });
  }

  private async addImageToZip(zip: JSZip, compressed: CompressedImage): Promise<void> {
    try {
      // Convert data URL to blob
      const response = await fetch(compressed.src);
      const blob = await response.blob();
      
      // Add to zip with proper filename
      zip.file(compressed.name, blob);
    } catch (error) {
      console.error(`Error processing image ${compressed.name}:`, error);
      throw error; // Re-throw to be caught by Promise.allSettled
    }
  }

  private async generateAndDownloadZip(zip: JSZip): Promise<void> {
    try {
      // Generate zip file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(zipBlob);
      
      // Set download attributes
      const originalFileName = this.originalImage?.name.split('.')[0] || 'quantum_images';
      link.href = url;
      link.download = `${originalFileName}_quantum_processed.zip`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating ZIP file:', error);
      this.errorMessage = 'Error creating ZIP file. Please try downloading images individually.';
      // Reset loading state on error
      this.isCreatingZip = false;
    }
  }

  getCompressedImages(): CompressedImage[] {
    return this.compressedImages.filter(img => img.algorithm === 'Quantum Compression');
  }

  getReconstructedImages(): CompressedImage[] {
    return this.compressedImages.filter(img => img.algorithm === 'Quantum Reconstructed');
  }

  getOverlayImages(): CompressedImage[] {
    return this.compressedImages.filter(img => img.algorithm.startsWith('Quantum Overlay'));
  }

  private estimateBase64Size(base64String: string): number {
    // Remove padding and calculate approximate size
    const paddingChars = (base64String.match(/=/g) || []).length;
    return Math.round((base64String.length * 3) / 4 - paddingChars);
  }

  private calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  }

  convertImageToBase64(image: OriginalImage): string {
    return image.src.replace('data:image/png;base64,', '');
  }
}
