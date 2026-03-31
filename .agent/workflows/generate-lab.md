---
description: Workflow for generating a new Lab page in the Quantum project
---

This workflow describes the process of creating a new "Lab" page, ensuring it follows the project's architectural patterns and styling rules.

### 1. Generate the Page Component
Use the Angular CLI to generate a new component in `src/app/pages/labs/pages/` or create it manually.
The component **MUST** be standalone and have `.ts`, `.scss`, and `.html` files.

```bash
# Example
ng generate component pages/labs/pages/my-new-lab --standalone
```

### 2. Update SEO Service
Every lab must have its own SEO metadata. Add a new entry to the `private seoData` map in `src/app/services/seo.service.ts`.

```typescript
// src/app/services/seo.service.ts
'my-new-lab': {
  title: 'My New Lab - Descriptive Title',
  description: 'A detailed description of what this lab does.',
  keywords: 'quantum, lab, specific, keywords'
}
```

### 3. Implement Component Logic (TS)
Ensure the component includes the following:
- `standalone: true`
- Necessary imports in the `@Component` decorator (e.g., `CommonModule`, `LabHeaderComponent`, `MatIconModule`, `MatDialogModule`).
- Inject and use `SeoService` in `ngOnInit`.

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../../../services/seo.service';
import { LabHeaderComponent } from '../../../../components/lab-header/lab-header.component';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
// ... other imports

@Component({
  selector: 'app-my-new-lab',
  standalone: true,
  imports: [
    CommonModule, 
    LabHeaderComponent, 
    MatIconModule, 
    MatDialogModule,
    // Add other shared components or material modules here
  ],
  templateUrl: './my-new-lab.component.html',
  styleUrls: ['./my-new-lab.component.scss']
})
export class MyNewLabComponent implements OnInit {
  constructor(
    private seoService: SeoService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Pass the key used in SeoService
    this.seoService.updateSeoTags(this.seoService.getSeoData('my-new-lab'));
  }

  // Use MatDialog for any modals
  openModal() {
    // const dialogRef = this.dialog.open(MyModalComponent, { ... });
  }
}
```

### 4. Design the Layout (HTML)
Use the standard components and patterns.
- Use `app-lab-header` for the page header.
- Use `mat-icon` for icons where possible (import `MatIconModule`).
- If a custom icon is needed, use SVG manually.

```html
<div class="lab-container">
    <app-lab-header title="My New Lab"></app-lab-header>

    <div class="lab-content">
        <section class="description-section">
            <h3>About My New Lab</h3>
            <p>Description text goes here...</p>
        </section>

        <!-- Use mat-icon for icons -->
        <button (click)="openModal()">
            <mat-icon>settings</mat-icon>
            Configure
        </button>
    </div>
</div>
```

### 5. Styling with SCSS
- Use `@use 'colors' as *;` to access global color variables.
- Use variables like `$primary-900`, `$grey-400`.
- **CRITICAL**: Every lab **MUST** follow the "Envi Visualizer" design system:
    - Main container background: `$primary-900`.
    - Content area: Maximum width of 1000px-1400px, centered.
    - Content blocks: Use white cards with `border-radius: 12px` and subtle `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1)`.
    - Section Headers: Light gray background (`#f8f9fa`) with bottom border and blue icons (`#667eea`).
    - Buttons: Use gradients for primary actions (Green: `#48bb78` to `#38a169`, Blue: `#667eea` to `#5568d3`, Orange: `#ed8936` to `#dd6b20`).

```scss
@use 'colors' as *;

.envi-container {
  min-height: calc(100vh - 64px - 90px);
  background: $primary-900;
  display: flex;
  flex-direction: column;
}

.upload-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
```

### 6. Reference Patterns
If unsure about specific UI patterns (e.g., file uploads, grid layouts), refer to the **QIC Component**:
- `src/app/pages/labs/pages/qic/qic.component.ts`
- `src/app/pages/labs/pages/qic/qic.component.html`
- `src/app/pages/labs/pages/qic/qic.component.scss`
