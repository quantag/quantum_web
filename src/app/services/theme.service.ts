import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  public isDarkMode$ = this.isDarkModeSubject.asObservable();
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.loadTheme();
  }

  private loadTheme(): void {
    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('darkMode');
      const isDarkMode = savedTheme ? JSON.parse(savedTheme) : false;
      this.isDarkModeSubject.next(isDarkMode);
    }
  }

  toggleTheme(): void {
    const currentTheme = this.isDarkModeSubject.value;
    const newTheme = !currentTheme;
    this.setTheme(newTheme);
  }

  setTheme(isDarkMode: boolean): void {
    this.isDarkModeSubject.next(isDarkMode);
    if (this.isBrowser) {
      localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    }
  }

  getCurrentTheme(): boolean {
    return this.isDarkModeSubject.value;
  }

  // Monaco Editor theme based on current theme
  getMonacoEditorTheme(): string {
    return this.isDarkModeSubject.value ? 'vs-dark' : 'vs';
  }

  // Monaco Editor options with theme
  getMonacoEditorOptions(language: string = 'python'): any {
    return {
      language: language,
      theme: this.getMonacoEditorTheme(),
      minimap: { enabled: false },
      fontSize: 14,
      wordWrap: 'on' as const,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      selectOnLineNumbers: true,
      tabSize: 2,
      insertSpaces: true
    };
  }
}
