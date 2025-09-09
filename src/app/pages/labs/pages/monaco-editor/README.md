# Monaco Editor Lab

A powerful web-based code editor with virtual file system capabilities, built using Monaco Editor (the same editor that powers VS Code).

## Features

### 🖥️ Advanced Code Editor
- **Monaco Editor Integration**: Full-featured code editor with VS Code capabilities
- **Syntax Highlighting**: Support for TypeScript, JavaScript, CSS, HTML, JSON, Markdown, Python, SQL, XML, and YAML
- **IntelliSense**: Code completion, error detection, and suggestions
- **Find & Replace**: Powerful search functionality with regex support
- **Code Folding**: Collapse and expand code blocks
- **Multi-cursor Editing**: Edit multiple locations simultaneously

### 📁 Virtual File System
- **File Explorer**: Tree-view file browser with folder support
- **Create Files/Folders**: Add new files and directories
- **Delete Files**: Remove unwanted files with confirmation
- **File Icons**: Visual file type identification
- **Nested Directories**: Support for folder structures

### 💾 File Management
- **Save & Download**: Save individual files with Ctrl+S
- **Download All**: Export all files in a single archive
- **File Templates**: Pre-built templates for different languages
- **Auto-detection**: Language detection based on file extensions

### 🎨 User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Monaco Editor theme support
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Loading States**: Smooth loading and error handling

## Supported Languages

| Language   | Extensions        | Features                    |
|------------|------------------|-----------------------------|
| TypeScript | `.ts`            | Full IntelliSense, errors   |
| JavaScript | `.js`            | Syntax highlighting, linting|
| CSS        | `.css`           | Property completion         |
| HTML       | `.html`, `.htm`  | Tag completion              |
| JSON       | `.json`          | Schema validation           |
| Markdown   | `.md`            | Preview support             |
| Python     | `.py`            | Syntax highlighting         |
| SQL        | `.sql`           | Query highlighting          |
| XML        | `.xml`           | Tag completion              |
| YAML       | `.yml`, `.yaml`  | Structure validation        |

## Usage

### Getting Started
1. Navigate to `/labs/monaco-editor`
2. The README.md file opens automatically
3. Explore the sample files in the file tree
4. Click on any file to open it in the editor

### Creating Files
1. Click the `+` button in the file explorer
2. Choose "File" or "Folder"
3. Enter the name (with extension for files)
4. Select the appropriate language
5. Click "Create"

### Keyboard Shortcuts
- **Ctrl+S**: Save and download current file
- **Ctrl+F**: Find text in current file  
- **Ctrl+H**: Find and replace
- **F1**: Open command palette
- **Ctrl+Space**: Trigger IntelliSense
- **Alt+Click**: Add cursor at click position

### File Operations
- **Open File**: Click on file name in explorer
- **Delete File**: Click the × button when hovering over file
- **Toggle Folder**: Click on folder name to expand/collapse
- **Save File**: Use Ctrl+S or click Save button
- **Download All**: Click "Download All" button in explorer

## Sample Projects

The lab comes with pre-loaded sample files:

### TypeScript Example
- User service implementation
- Interface definitions  
- Class structure with methods
- Console logging examples

### CSS Styling
- Modern CSS with flexbox
- CSS variables and gradients
- Button animations and hover effects
- Responsive design principles

### JavaScript Utilities
- Debounce function implementation
- Deep clone utility
- File size formatting
- Export/import patterns

## Technical Details

### Architecture
- **Framework**: Angular standalone component
- **Editor**: Monaco Editor 0.45.0 via CDN
- **Styling**: SCSS with responsive design
- **State Management**: Component-based state

### Performance
- **Lazy Loading**: Monaco Editor loads asynchronously
- **Model Management**: Efficient editor model handling
- **Memory Management**: Proper cleanup on destroy
- **Virtual File System**: In-memory file storage

### Browser Support
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: Touch-friendly interface
- **Offline Capability**: Works without internet after initial load

## Development

### Component Structure
```
monaco-editor/
├── monaco-editor.component.ts    # Main component logic
├── monaco-editor.component.html  # Template with file explorer
├── monaco-editor.component.scss  # Responsive styles
└── README.md                     # This documentation
```

### Key Methods
- `loadMonacoEditor()`: Initializes Monaco Editor from CDN
- `openFile()`: Opens file in editor with proper model
- `saveCurrentFile()`: Downloads current file content
- `createNewFile()`: Adds new files to virtual file system
- `deleteFile()`: Removes files with confirmation

### Customization
- Modify `availableLanguages` array to add new language support
- Update `getDefaultContent()` method for custom templates
- Extend `FileItem` interface for additional metadata
- Customize themes through Monaco Editor API

## Future Enhancements

- [ ] File upload from local system
- [ ] Real-time collaboration
- [ ] Git integration
- [ ] Plugin system
- [ ] Custom themes
- [ ] Terminal emulator
- [ ] Debugger integration
- [ ] Live preview for HTML/CSS
- [ ] Project templates
- [ ] Cloud storage integration

## Contributing

To add new language support:
1. Add language definition to `availableLanguages`
2. Create template in `getDefaultContent()`
3. Update documentation
4. Test syntax highlighting and features

For bug reports or feature requests, please create an issue in the repository.
