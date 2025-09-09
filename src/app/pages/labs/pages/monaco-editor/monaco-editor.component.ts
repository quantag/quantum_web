import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';

declare const monaco: any;

interface FileItem {
  name: string;
  content: string;
  language: string;
  isDirectory?: boolean;
  children?: FileItem[];
  isOpen?: boolean;
}

@Component({
  selector: 'app-monaco-editor',
  templateUrl: './monaco-editor.component.html',
  styleUrls: ['./monaco-editor.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LabHeaderComponent]
})
export class MonacoEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: false }) editorContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('newFileNameInput', { static: false }) newFileNameInput!: ElementRef<HTMLInputElement>;

  private editor: any;
  private isBrowser: boolean;
  private models: Map<string, any> = new Map();

  // Resize properties
  private isResizing = false;
  private startX = 0;
  private startWidth = 0;
  private fileExplorerWidth = 300;

  currentFile: FileItem | null = null;
  showNewFileDialog: boolean = false;
  newFileName: string = '';
  newFileType: 'file' | 'folder' = 'file';
  selectedLanguage: string = 'typescript';

  fileSystem: FileItem[] = [
    {
      name: 'src',
      content: '',
      language: '',
      isDirectory: true,
      isOpen: true,
      children: [
        {
          name: 'main.ts',
          content: `// Welcome to Monaco Editor Lab!\n// This is a sample TypeScript file\n\ninterface User {\n  id: number;\n  name: string;\n  email: string;\n}\n\nclass UserService {\n  private users: User[] = [];\n\n  addUser(user: User): void {\n    this.users.push(user);\n    console.log('User added:', user);\n  }\n\n  getUser(id: number): User | undefined {\n    return this.users.find(user => user.id === id);\n  }\n\n  getAllUsers(): User[] {\n    return [...this.users];\n  }\n}\n\n// Create a new user service\nconst userService = new UserService();\n\n// Add some users\nuserService.addUser({ id: 1, name: 'John Doe', email: 'john@example.com' });\nuserService.addUser({ id: 2, name: 'Jane Smith', email: 'jane@example.com' });\n\nconsole.log('All users:', userService.getAllUsers());`,
          language: 'typescript'
        },
        {
          name: 'styles.css',
          content: `/* Sample CSS file */\n\nbody {\n  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\n  margin: 0;\n  padding: 20px;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: #333;\n}\n\n.container {\n  max-width: 1200px;\n  margin: 0 auto;\n  background: white;\n  border-radius: 12px;\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);\n  padding: 2rem;\n}\n\n.header {\n  text-align: center;\n  margin-bottom: 2rem;\n}\n\n.header h1 {\n  color: #2c3e50;\n  font-size: 2.5rem;\n  margin-bottom: 0.5rem;\n}\n\n.button {\n  background: #667eea;\n  color: white;\n  border: none;\n  padding: 12px 24px;\n  border-radius: 6px;\n  cursor: pointer;\n  font-weight: 600;\n  transition: all 0.3s ease;\n}\n\n.button:hover {\n  background: #5a6fd8;\n  transform: translateY(-2px);\n}`,
          language: 'css'
        },
        {
          name: 'utils',
          content: '',
          language: '',
          isDirectory: true,
          isOpen: false,
          children: [
            {
              name: 'helpers.js',
              content: `// JavaScript utility functions\n\n/**\n * Debounce function to limit the rate of function calls\n * @param {Function} func - The function to debounce\n * @param {number} wait - The delay in milliseconds\n * @returns {Function} - The debounced function\n */\nfunction debounce(func, wait) {\n  let timeout;\n  return function executedFunction(...args) {\n    const later = () => {\n      clearTimeout(timeout);\n      func(...args);\n    };\n    clearTimeout(timeout);\n    timeout = setTimeout(later, wait);\n  };\n}\n\n/**\n * Deep clone an object\n * @param {Object} obj - The object to clone\n * @returns {Object} - The cloned object\n */\nfunction deepClone(obj) {\n  if (obj === null || typeof obj !== 'object') {\n    return obj;\n  }\n  \n  if (obj instanceof Date) {\n    return new Date(obj.getTime());\n  }\n  \n  if (obj instanceof Array) {\n    return obj.map(item => deepClone(item));\n  }\n  \n  const cloned = {};\n  for (let key in obj) {\n    if (obj.hasOwnProperty(key)) {\n      cloned[key] = deepClone(obj[key]);\n    }\n  }\n  \n  return cloned;\n}\n\n/**\n * Format bytes as human-readable text\n * @param {number} bytes - Number of bytes\n * @param {number} decimals - Number of decimal places\n * @returns {string} - Formatted string\n */\nfunction formatBytes(bytes, decimals = 2) {\n  if (bytes === 0) return '0 Bytes';\n  \n  const k = 1024;\n  const dm = decimals < 0 ? 0 : decimals;\n  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];\n  \n  const i = Math.floor(Math.log(bytes) / Math.log(k));\n  \n  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];\n}\n\nexport { debounce, deepClone, formatBytes };`,
              language: 'javascript'
            }
          ]
        }
      ]
    },
    {
      name: 'README.md',
      content: `# Monaco Editor Lab\n\nWelcome to the Monaco Editor Lab! This is a powerful code editor that runs in your browser.\n\n## Features\n\n- **Syntax Highlighting**: Support for multiple programming languages\n- **IntelliSense**: Code completion and suggestions\n- **File System**: Virtual file explorer with folders and files\n- **Multiple Languages**: TypeScript, JavaScript, CSS, HTML, JSON, Markdown, and more\n- **Themes**: Light and dark themes available\n- **Code Folding**: Collapse and expand code blocks\n- **Find & Replace**: Powerful search and replace functionality\n\n## Supported Languages\n\n- TypeScript (.ts)\n- JavaScript (.js)\n- CSS (.css)\n- HTML (.html)\n- JSON (.json)\n- Markdown (.md)\n- Python (.py)\n- SQL (.sql)\n- XML (.xml)\n- YAML (.yml, .yaml)\n\n## Getting Started\n\n1. Click on any file in the file explorer to open it\n2. Edit the code directly in the editor\n3. Create new files and folders using the + button\n4. Download your files when you're done\n\n## Tips\n\n- Use **Ctrl+S** to save (downloads the file)\n- Use **Ctrl+F** to find text\n- Use **Ctrl+H** for find and replace\n- Use **F1** to open the command palette\n- Use **Ctrl+Space** for code completion\n\nEnjoy coding!`,
      language: 'markdown'
    }
  ];

  availableLanguages = [
    { id: 'typescript', name: 'TypeScript', extensions: ['.ts'] },
    { id: 'javascript', name: 'JavaScript', extensions: ['.js'] },
    { id: 'css', name: 'CSS', extensions: ['.css'] },
    { id: 'html', name: 'HTML', extensions: ['.html', '.htm'] },
    { id: 'json', name: 'JSON', extensions: ['.json'] },
    { id: 'markdown', name: 'Markdown', extensions: ['.md'] },
    { id: 'python', name: 'Python', extensions: ['.py'] },
    { id: 'sql', name: 'SQL', extensions: ['.sql'] },
    { id: 'xml', name: 'XML', extensions: ['.xml'] },
    { id: 'yaml', name: 'YAML', extensions: ['.yml', '.yaml'] }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private seoService: SeoService) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('monaco-editor'));
    
    // Initialize CSS custom property for file explorer width
    if (this.isBrowser) {
      document.documentElement.style.setProperty('--explorer-width', `${this.fileExplorerWidth}px`);
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.loadMonacoEditor();
    }
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.dispose();
    }
    // Dispose all models
    this.models.forEach(model => model.dispose());
    this.models.clear();

    // Clean up resize listeners if still active
    if (this.isResizing) {
      document.removeEventListener('mousemove', this.onResize.bind(this));
      document.removeEventListener('mouseup', this.stopResize.bind(this));
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  }

  private async loadMonacoEditor(): Promise<void> {
    try {
      // Check if Monaco is already loaded
      if (typeof monaco !== 'undefined') {
        this.initializeEditor();
        return;
      }

      // Load Monaco Editor from CDN
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/monaco-editor@0.45.0/min/vs/loader.js';
      script.onload = () => {
        const require = (window as any).require;
        require.config({ 
          paths: { 
            vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' 
          } 
        });
        require(['vs/editor/editor.main'], () => {
          this.initializeEditor();
        });
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Failed to load Monaco Editor:', error);
    }
  }

  private initializeEditor(): void {
    if (!this.editorContainer) return;

    this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
      value: 'Welcome to Monaco Editor Lab!\n\nSelect a file from the file explorer to start editing.',
      language: 'markdown',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      minimap: { enabled: true }
    });

    // Add keyboard shortcuts
    this.editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        this.saveCurrentFile();
      }
    });

    // Open the README.md file by default
    const readmeFile = this.fileSystem.find(f => f.name === 'README.md');
    if (readmeFile) {
      this.openFile(readmeFile);
    }
  }

  toggleFolder(folder: FileItem): void {
    folder.isOpen = !folder.isOpen;
  }

  openFile(file: FileItem): void {
    if (file.isDirectory) {
      this.toggleFolder(file);
      return;
    }

    this.currentFile = file;
    
    // Update editor content and language
    if (this.editor) {
      // Get or create model for this file
      const uri = monaco.Uri.parse(`file:///${file.name}`);
      let model = this.models.get(file.name);
      
      if (!model) {
        model = monaco.editor.createModel(file.content, file.language, uri);
        this.models.set(file.name, model);
      }
      
      this.editor.setModel(model);
      this.editor.focus();
    }
  }

  saveCurrentFile(): void {
    if (!this.currentFile || !this.editor) return;

    const content = this.editor.getValue();
    this.currentFile.content = content;

    // Download the file
    this.downloadFile(this.currentFile.name, content);
  }

  private downloadFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  showCreateFileDialog(): void {
    this.showNewFileDialog = true;
    this.newFileName = '';
    this.newFileType = 'file';
    setTimeout(() => {
      if (this.newFileNameInput) {
        this.newFileNameInput.nativeElement.focus();
      }
    }, 100);
  }

  cancelCreateFile(): void {
    this.showNewFileDialog = false;
    this.newFileName = '';
  }

  createNewFile(): void {
    if (!this.newFileName.trim()) return;

    const language = this.getLanguageFromFilename(this.newFileName);
    
    const newFile: FileItem = {
      name: this.newFileName.trim(),
      content: this.newFileType === 'file' ? this.getDefaultContent(language) : '',
      language: language,
      isDirectory: this.newFileType === 'folder',
      children: this.newFileType === 'folder' ? [] : undefined,
      isOpen: this.newFileType === 'folder' ? false : undefined
    };

    this.fileSystem.push(newFile);
    this.showNewFileDialog = false;
    this.newFileName = '';

    // If it's a file, open it immediately
    if (this.newFileType === 'file') {
      this.openFile(newFile);
    }
  }

  private getLanguageFromFilename(filename: string): string {
    const extension = '.' + filename.split('.').pop()?.toLowerCase();
    
    for (const lang of this.availableLanguages) {
      if (lang.extensions.includes(extension)) {
        return lang.id;
      }
    }
    
    return 'plaintext';
  }

  private getDefaultContent(language: string): string {
    const templates: { [key: string]: string } = {
      typescript: `// New TypeScript file\n\nexport class MyClass {\n  constructor() {\n    console.log('Hello, TypeScript!');\n  }\n}\n`,
      javascript: `// New JavaScript file\n\nfunction hello() {\n  console.log('Hello, JavaScript!');\n}\n\nhello();\n`,
      css: `/* New CSS file */\n\n.my-class {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n`,
      html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n`,
      json: `{\n  "name": "example",\n  "version": "1.0.0",\n  "description": "A new JSON file"\n}\n`,
      markdown: `# New Markdown File\n\nThis is a new markdown file.\n\n## Features\n\n- Item 1\n- Item 2\n- Item 3\n`,
      python: `# New Python file\n\ndef main():\n    print("Hello, Python!")\n\nif __name__ == "__main__":\n    main()\n`,
      sql: `-- New SQL file\n\nSELECT * FROM users\nWHERE active = 1\nORDER BY created_at DESC;\n`
    };

    return templates[language] || `// New ${language} file\n\n`;
  }

  deleteFile(file: FileItem, event: Event): void {
    event.stopPropagation();
    
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      this.removeFileFromSystem(file, this.fileSystem);
      
      // If the deleted file was currently open, clear the editor
      if (this.currentFile === file) {
        this.currentFile = null;
        if (this.editor) {
          this.editor.setValue('// File deleted. Select another file to continue editing.');
          this.editor.updateOptions({ readOnly: true });
        }
      }
      
      // Remove model if exists
      if (this.models.has(file.name)) {
        const model = this.models.get(file.name);
        model?.dispose();
        this.models.delete(file.name);
      }
    }
  }

  private removeFileFromSystem(fileToRemove: FileItem, files: FileItem[]): boolean {
    const index = files.findIndex(f => f === fileToRemove);
    if (index !== -1) {
      files.splice(index, 1);
      return true;
    }
    
    // Search in subdirectories
    for (const file of files) {
      if (file.isDirectory && file.children) {
        if (this.removeFileFromSystem(fileToRemove, file.children)) {
          return true;
        }
      }
    }
    
    return false;
  }

  getFileIcon(file: FileItem): string {
    if (file.isDirectory) {
      return file.isOpen ? '📁' : '📂';
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'ts': '📘',
      'js': '📙',
      'css': '🎨',
      'html': '🌐',
      'json': '📋',
      'md': '📝',
      'py': '🐍',
      'sql': '🗃️',
      'xml': '📄',
      'yml': '⚙️',
      'yaml': '⚙️'
    };
    
    return iconMap[extension || ''] || '📄';
  }

  private collectAllFiles(files: FileItem[], currentPath: string, zip: { [key: string]: string }): void {
    for (const file of files) {
      const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
      
      if (file.isDirectory && file.children) {
        this.collectAllFiles(file.children, filePath, zip);
      } else {
        zip[filePath] = file.content;
      }
    }
  }

  // Resize functionality
  startResize(event: MouseEvent): void {
    if (!this.isBrowser) return;
    
    event.preventDefault();
    this.isResizing = true;
    this.startX = event.clientX;
    this.startWidth = this.fileExplorerWidth;

    // Add resizing class
    const resizer = event.target as HTMLElement;
    resizer.classList.add('resizing');

    // Add global event listeners
    document.addEventListener('mousemove', this.onResize.bind(this));
    document.addEventListener('mouseup', this.stopResize.bind(this));

    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }

  private onResize(event: MouseEvent): void {
    if (!this.isResizing) return;

    const deltaX = event.clientX - this.startX;
    const newWidth = this.startWidth + deltaX;

    // Constrain width between min and max values
    const minWidth = 200;
    const maxWidth = Math.min(600, window.innerWidth * 0.5);
    
    this.fileExplorerWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    // Update CSS custom property
    document.documentElement.style.setProperty('--explorer-width', `${this.fileExplorerWidth}px`);

    // Trigger Monaco Editor resize
    if (this.editor) {
      setTimeout(() => this.editor.layout(), 0);
    }
  }

  private stopResize(): void {
    if (!this.isResizing) return;
    
    this.isResizing = false;

    // Remove resizing class
    const resizer = document.querySelector('.resizer.resizing');
    if (resizer) {
      resizer.classList.remove('resizing');
    }

    // Remove global event listeners
    document.removeEventListener('mousemove', this.onResize.bind(this));
    document.removeEventListener('mouseup', this.stopResize.bind(this));

    // Restore normal cursor and text selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Final Monaco Editor resize
    if (this.editor) {
      setTimeout(() => this.editor.layout(), 50);
    }
  }
}
