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
            size: fileSize,
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
        
        if (link && link.getAttribute('href')?.endsWith('.py')) {
          const fileName = link.textContent?.trim() || '';
          const fileUrl = baseUrl + link.getAttribute('href');
          
          // Create a sample object with URL as content (will be loaded on demand)
          files.push({
            name: fileName.replace('.py', ''),
            description: `Python script: ${fileName}`,
            content: fileUrl // Store URL, will fetch content when selected
          });
        }
      }
    });
    
    return files;
  }

  /**
   * Generic directory listing parser that can handle different file types
   * @param html HTML content from directory listing
   * @param baseUrl Base URL for constructing file URLs
   * @param fileExtension File extension to filter by (e.g., '.py', '.xyz')
   * @returns Array of basic file objects
   */
  parseDirectoryListing(html: string, baseUrl: string, fileExtension: string): Array<{name: string, url: string}> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const files: Array<{name: string, url: string}> = [];
    
    const rows = doc.querySelectorAll('table tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const nameCell = cells[1];
        const link = nameCell.querySelector('a');
        
        if (link && link.getAttribute('href')?.endsWith(fileExtension)) {
          const fileName = link.textContent?.trim() || '';
          const fileUrl = baseUrl + link.getAttribute('href');
          
          files.push({
            name: fileName,
            url: fileUrl
          });
        }
      }
    });
    
    return files;
  }
}
