import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IGoogleUser } from '../interfaces/googleUser.interface';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private isBrowser: boolean;
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Set item in localStorage
  setItem(key: string, value: any): void {
    if (!this.isBrowser) return;
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  // Get item from localStorage
  getItem<T>(key: string): T | null {
    if (!this.isBrowser) return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  // Remove item from localStorage
  removeItem(key: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  // Clear all localStorage
  clear(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Check if key exists
  hasItem(key: string): boolean {
    if (!this.isBrowser) return false;
    return localStorage.getItem(key) !== null;
  }

  // Get all keys
  getAllKeys(): string[] {
    if (!this.isBrowser) return [];
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('Error getting localStorage keys:', error);
      return [];
    }
  }

  // Get localStorage size in bytes
  getStorageSize(): number {
    if (!this.isBrowser) return 0;
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return total;
    } catch (error) {
      console.error('Error calculating localStorage size:', error);
      return 0;
    }
  }

  getGoogleUser(): IGoogleUser | null {
    const user = this.getItem<IGoogleUser>('googleUser');
    return user ? user : null;
  }

  saveGoogleUser(user: IGoogleUser): void {
    this.setItem('googleUser', user);
  }

  removeGoogleUser(): void {
      this.removeItem('googleUser');
  }

  getToken(): string | null {
    return this.getItem<string>('token');
  }

  saveToken(token: string): void {
    this.setItem('token', token);
  }

  removeToken(): void {
    this.removeItem('token');
  }

  getRefreshToken(): string | null {
    return this.getItem<string>('refreshToken');
  }

  saveRefreshToken(refreshToken: string): void {
    this.setItem('refreshToken', refreshToken);
  }

  removeRefreshToken(): void {
    this.removeItem('refreshToken');
  }

  getTokenExpiry(): number | null {
    return this.getItem<number>('tokenExpiry');
  }

  saveTokenExpiry(expiry: number): void {
    this.setItem('tokenExpiry', expiry);
  }

  removeTokenExpiry(): void {
    this.removeItem('tokenExpiry');
  }

  getDarkMode(): boolean {
    const darkMode = this.getItem<boolean>('darkMode');
    return darkMode !== null ? darkMode : false; // Default to false if not set
  }

  setDarkMode(enabled: boolean): void {
    this.setItem('darkMode', enabled);
  }
}
