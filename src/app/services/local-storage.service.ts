import { Injectable } from '@angular/core';
import { IGoogleUser } from '../interfaces/googleUser.interface';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  
  constructor() { }

  // Set item in localStorage
  setItem(key: string, value: any): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  // Get item from localStorage
  getItem<T>(key: string): T | null {
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
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  // Clear all localStorage
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Check if key exists
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  // Get all keys
  getAllKeys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('Error getting localStorage keys:', error);
      return [];
    }
  }

  // Get localStorage size in bytes
  getStorageSize(): number {
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

  getDarkMode(): boolean {
    const darkMode = this.getItem<boolean>('darkMode');
    return darkMode !== null ? darkMode : false; // Default to false if not set
  }

  setDarkMode(enabled: boolean): void {
    this.setItem('darkMode', enabled);
  }
}
