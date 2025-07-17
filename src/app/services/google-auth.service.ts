// src/app/services/google-auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { environment } from '../../environments/environment.development';

declare const google: any;

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private clientId = '845732993158-84saq5d7sen58bfa6u5c65doa5c9fcug.apps.googleusercontent.com'; // Use the client ID from environment
  private userSubject = new BehaviorSubject<GoogleUser | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private localStorageService: LocalStorageService) {
    this.loadUserFromStorage();
    this.initializeGoogleAuth();
  }

  private loadUserFromStorage(): void {
    const savedUser = this.localStorageService.getGoogleUser();
    if (savedUser) {
      this.userSubject.next(savedUser);
    }
  }

  private initializeGoogleAuth(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: (response: any) => this.handleCredentialResponse(response),
        auto_select: false,
        cancel_on_tap_outside: true
      });
    } else {
      // Retry initialization after a short delay
      setTimeout(() => this.initializeGoogleAuth(), 100);
    }
  }

  private handleCredentialResponse(response: any): void {
    const payload = this.parseJwt(response.credential);
    const user: GoogleUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name
    };
    
    // Save user to localStorage
    this.localStorageService.saveGoogleUser(user);
    this.userSubject.next(user);
    console.log('User signed in:', user);
  }

  private parseJwt(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  signIn(): void {
    google.accounts.id.prompt();
  }

  signOut(): void {
    google.accounts.id.disableAutoSelect();
    // Clear user from localStorage
    this.localStorageService.removeGoogleUser();
    this.userSubject.next(null);
    console.log('User signed out');
  }

  renderButton(element: HTMLElement): void {
    google.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular'
    });
  }

  getCurrentUser(): GoogleUser | null {
    return this.userSubject.value;
  }

  isSignedIn(): boolean {
    return this.userSubject.value !== null;
  }
}