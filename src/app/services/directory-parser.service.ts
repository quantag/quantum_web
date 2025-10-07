import { Injectable } from '@angular/core';

export interface DirectoryFile {
  name: string;
  size: string;
  date: string;
  url: string;
}

export interface SampleScript {
  name: string;
  description: string;
  content: string;
  size: string;
}

@Injectable({
  providedIn: 'root'
})
export class DirectoryParserService {

  constructor() { }

  /**
   * Parse directory listing HTML for XYZ files
   * @param html HTML content from directory listing
   * @param baseUrl Base URL for constructing file URLs
   * @returns Array of DirectoryFile objects
   */
  parseXyzDirectoryListing(html: string, baseUrl: string): DirectoryFile[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const files: DirectoryFile[] = [];
    
    const rows = doc.querySelectorAll('table tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const nameCell = cells[1];
        const dateCell = cells[2];
        const sizeCell = cells[3];
        
        const link = nameCell.querySelector('a');
        if (link && link.getAttribute('href')?.endsWith('.xyz')) {
          const fileName = link.textContent?.trim() || '';
          const fileUrl = baseUrl + link.getAttribute('href');
          const fileDate = dateCell.textContent?.trim() || '';
          const fileSize = sizeCell.textContent?.trim() || '';
          
          files.push({
            name: fileName,
            size: this.formatFileSize(fileSize),
            date: fileDate,
            url: fileUrl
          });
        }
      }
    });
    
    return files;
  }

  /**
   * Parse directory listing HTML for Python sample scripts
   * @param html HTML content from directory listing
   * @param baseUrl Base URL for constructing file URLs
   * @returns Array of SampleScript objects
   */
  parsePythonDirectoryListing(html: string, baseUrl: string): SampleScript[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const files: SampleScript[] = [];
    
    const rows = doc.querySelectorAll('table tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const nameCell = cells[1];
        const link = nameCell.querySelector('a');
        const sizeCell = cells[3];
        
        if (link && link.getAttribute('href')?.endsWith('.py')) {
          const fileName = link.textContent?.trim() || '';
          const fileUrl = baseUrl + link.getAttribute('href');
          const fileSize = sizeCell ? sizeCell.textContent?.trim() || '' : '';
          
          // Create a sample object with URL as content (will be loaded on demand)
          files.push({
            name: fileName.replace('.py', ''),
            description: `Python script: ${fileName}`,
            content: fileUrl, // Store URL, will fetch content when selected
            size: this.formatFileSize(fileSize)
          });
        }
      }
    });
    
    return files;
  }

  /**
   * Parse directory listing HTML for image sample files
   * @param html HTML content from directory listing
   * @param baseUrl Base URL for constructing file URLs
   * @returns Array of SampleScript objects for images
   */
  parseImageDirectoryListing(html: string, baseUrl: string): SampleScript[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const files: SampleScript[] = [];
    
    const rows = doc.querySelectorAll('table tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const nameCell = cells[1];
        const link = nameCell.querySelector('a');
        const sizeCell = cells[3];
        
        if (link && this.isImageFile(link.getAttribute('href') || '')) {
          const fileName = link.textContent?.trim() || '';
          const fileUrl = baseUrl + link.getAttribute('href');
          const fileSize = sizeCell ? sizeCell.textContent?.trim() || '' : '';
          
          // Create a sample object with URL as content (will be loaded on demand)
          files.push({
            name: fileName.replace(/\.(png|jpg|jpeg|gif|bmp|webp)$/i, ''),
            description: `Image file: ${fileName}`,
            content: fileUrl, // Store URL, will fetch content when selected
            size: this.formatFileSize(fileSize)
          });
        }
      }
    });
    
    return files;
  }

  private isImageFile(href: string): boolean {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => href.toLowerCase().endsWith(ext));
  }

  /**
   * Generic directory listing parser that can handle different file types
   * @param html HTML content from directory listing
   * @param baseUrl Base URL for constructing file URLs
   * @param fileExtension File extension to filter by (e.g., '.py', '.xyz')
   * @returns Array of basic file objects
   */
  parseDirectoryListing(html: string, baseUrl: string, fileExtension: string): Array<{name: string, url: string, size: string}> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const files: Array<{name: string, url: string, size: string}> = [];
    
    const rows = doc.querySelectorAll('table tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const nameCell = cells[1];
        const link = nameCell.querySelector('a');
        const sizeCell = cells[3];
        
        if (link && link.getAttribute('href')?.endsWith(fileExtension)) {
          const fileName = link.textContent?.trim() || '';
          const fileUrl = baseUrl + link.getAttribute('href');
          const fileSize = sizeCell ? sizeCell.textContent?.trim() || '' : '';

          files.push({
            name: fileName,
            url: fileUrl,
            size: this.formatFileSize(fileSize)
          });
        }
      }
    });
    
    return files;
  }

  private formatFileSize(input: number | string): string {
    // If input is already a formatted string (like "1.1M", "10.2M"), return as is
    if (typeof input === 'string') {
      
      // Try to parse numeric value from string
      const numericValue = parseFloat(input);
      if (isNaN(numericValue)) {
        return input; // Return original if can't parse
      }
      
      // Check if string has unit suffix and convert to bytes
      if (input.toLowerCase().includes('k')) {
        return this.formatBytes(numericValue * 1024);
      } else if (input.toLowerCase().includes('m')) {
        return this.formatBytes(numericValue * 1024 * 1024);
      } else if (input.toLowerCase().includes('g')) {
        return this.formatBytes(numericValue * 1024 * 1024 * 1024);
      } else {
        return this.formatBytes(numericValue);
      }
    }
    
    // If input is a number, format it normally
    return this.formatBytes(input);
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${Math.round(bytes)} bytes`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  }
}
