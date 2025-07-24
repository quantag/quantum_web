// src/app/services/google-auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, map, Observable, catchError, throwError, of, switchMap, tap } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { environment } from '../../environments/environment';
import { IGoogleUser } from '../interfaces/googleUser.interface';

declare const google: any;

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private clientId = environment.clientId;
  private clientSecret = environment.clientSecret;
  private redirectUri = environment.redirectUri;
  private userSubject = new BehaviorSubject<IGoogleUser | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private tokenExpirySubject = new BehaviorSubject<number | null>(null);
  public user$ = this.userSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public refreshToken$ = this.refreshTokenSubject.asObservable();
  public tokenExpiry$ = this.tokenExpirySubject.asObservable();

  private readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
  private readonly GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

  constructor(
    private localStorageService: LocalStorageService,
    private http: HttpClient
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const savedUser = this.localStorageService.getGoogleUser();
    const savedToken = this.localStorageService.getToken();
    const savedRefreshToken = this.localStorageService.getRefreshToken();
    const savedTokenExpiry = this.localStorageService.getTokenExpiry();
    
    if (savedToken) {
      this.tokenSubject.next(savedToken);
    }
    if (savedRefreshToken) {
      this.refreshTokenSubject.next(savedRefreshToken);
    }
    if (savedUser) {
      this.userSubject.next(savedUser);
    }

    if (savedTokenExpiry) {
      this.tokenExpirySubject.next(savedTokenExpiry);
    }
  }

  // Generate OAuth2 authorization URL
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });
    return `${this.GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  getCurrentUser(): IGoogleUser | null {
    return this.userSubject.value;
  }

  isSignedIn(): boolean {
    return this.userSubject.value !== null;
  }

  getAccessToken(): string | null {
    return this.tokenSubject.value;
  }

  getRefreshToken(): string | null {
    return this.refreshTokenSubject.value;
  }

  getExpiresIn(): number | null {
    return this.tokenExpirySubject.value;
  }

  // Exchange authorization code for tokens
  exchangeCodeForTokens(code: string): Observable<GoogleTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<GoogleTokenResponse>(this.GOOGLE_TOKEN_URL, body.toString(), { headers })
      .pipe(
        catchError(error => {
          console.error('Token exchange error:', error);
          return throwError(() => error);
        })
      );
  }

  // Get user info using access token
  getUserInfo(accessToken: string): Observable<IGoogleUser> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${accessToken}`
    });

    return this.http.get<IGoogleUser>(this.GOOGLE_USERINFO_URL, { headers })
      .pipe(
        catchError(error => {
          console.error('Get user info error:', error);
          return throwError(() => error);
        })
      );
  }

  // Refresh access token using refresh token
  refreshAccessToken(refreshToken: string): Observable<GoogleTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<GoogleTokenResponse>(this.GOOGLE_TOKEN_URL, body.toString(), { headers })
      .pipe(
        tap(tokenResponse => {
          this.handleTokenResponse(tokenResponse);
        }),
        catchError(error => {
          console.error('Token refresh error:', error);
          // If refresh fails, clear tokens and require re-authentication
          this.signOut();
          return throwError(() => error);
        })
      );
  }

  // Automatically refresh token if expired
  ensureValidToken(): Observable<string> {
    const currentToken = this.tokenSubject.value;
    const refreshToken = this.refreshTokenSubject.value;

    if (!currentToken) {
      return throwError(() => new Error('No access token available'));
    }

    // Check if token is expired (you might want to store expiry time)
    const currentTime = Math.floor(Date.now());
    const expiryTime = this.getExpiresIn();
    if (expiryTime && expiryTime < currentTime) {
      // Token is expired, try to refresh
      if (refreshToken) {
        console.warn('Token expired, attempting to refresh...');
        return this.refreshAccessToken(refreshToken).pipe(
          map(tokenResponse => {
            this.handleTokenResponse(tokenResponse);
            return tokenResponse.access_token;
          })
        );
      } else {
        return throwError(() => new Error('Token expired and no refresh token available'));
      }
    }

    return of(currentToken);
  }

  // Handle complete authentication flow
  authenticateWithCode(code: string): Observable<IGoogleUser> {
    return this.exchangeCodeForTokens(code).pipe(
      switchMap(tokenResponse => {
        this.handleTokenResponse(tokenResponse);
        return this.getUserInfo(tokenResponse.access_token);
      }),
      map(userInfo => {
        const user: IGoogleUser = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          given_name: userInfo.given_name,
          family_name: userInfo.family_name,
          verified_email: userInfo.verified_email
        };
        this.handleUserInfo(user);
        return user;
      }),
      catchError(error => {
        console.error('Authentication error:', error);
        return throwError(() => error);
      })
    );
  }

  // Redirect to Google OAuth
  signIn(): void {
    const authUrl = this.getAuthorizationUrl();
    window.location.href = authUrl;
  }

  // Revoke tokens and sign out
  signOut(): void {
    const refreshToken = this.refreshTokenSubject.value;
    
    if (refreshToken) {
      // Revoke the refresh token
      const params = new URLSearchParams({
        token: refreshToken
      });
      
      this.http.post(this.GOOGLE_REVOKE_URL, params.toString(), {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded'
        })
      }).subscribe({
        next: () => console.log('Token revoked successfully'),
        error: (error) => console.error('Token revocation error:', error)
      });
    }

    // Clear all stored data
    this.localStorageService.removeGoogleUser();
    this.localStorageService.removeToken();
    this.localStorageService.removeRefreshToken();
    this.localStorageService.removeTokenExpiry();

    // Clear subjects
    this.tokenSubject.next(null);
    this.refreshTokenSubject.next(null);
    this.userSubject.next(null);
    this.tokenExpirySubject.next(null);
  }

  private handleTokenResponse(tokenResponse: GoogleTokenResponse): void {
    // Save tokens
    this.localStorageService.saveToken(tokenResponse.id_token);
    this.tokenSubject.next(tokenResponse.id_token);
    
    if (tokenResponse.refresh_token) {
      this.localStorageService.saveRefreshToken(tokenResponse.refresh_token);
      this.refreshTokenSubject.next(tokenResponse.refresh_token);
    }
    
    // Store token expiry time
    const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
    this.localStorageService.saveTokenExpiry(expiryTime);
  }

  private handleUserInfo(user: IGoogleUser): void {
    this.localStorageService.saveGoogleUser(user);
    this.userSubject.next(user);
  }
}