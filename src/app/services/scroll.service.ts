import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  /**
   * Scrolls the window to the top of the page
   * @param options - Scrolling options
   */
  scrollToTop(options: { smooth?: boolean } = {}): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: options.smooth ? 'smooth' : 'auto'
    });
  }

  /**
   * Scrolls the window up by a specific amount of pixels
   * @param pixels - Number of pixels to scroll up
   * @param options - Scrolling options
   */
  scrollUp(pixels: number = 100, options: { smooth?: boolean } = {}): void {
    const currentPosition = window.pageYOffset || document.documentElement.scrollTop;
    window.scrollTo({
      top: Math.max(currentPosition - pixels, 0),
      left: 0,
      behavior: options.smooth ? 'smooth' : 'auto'
    });
  }
}
