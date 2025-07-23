import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { switchMap, take, catchError } from 'rxjs';
import { GoogleAuthService } from '../services/google-auth.service';

// Define which URLs should include the auth token
const protectedUrls = [
  'getuser_by_googleid',
  // Add more protected endpoints as needed
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const googleAuthService = inject(GoogleAuthService);
  
  // Check if the request URL matches any protected URLs
  const shouldAddToken = protectedUrls.some(url => req.url.includes(url));
  
  if (!shouldAddToken) {
    // If not a protected URL, proceed without adding token
    return next(req);
  }

  // Get the current token from the auth service
  return googleAuthService.token$.pipe(
    take(1),
    switchMap(token => {
      if (token) {
        // Clone the request and add the Authorization header
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log(`🔐 Adding auth token to request: ${req.method} ${req.url}`);
        return next(authReq);
      } else {
        // No token available, proceed without authorization
        console.warn(`⚠️ No auth token available for protected endpoint: ${req.method} ${req.url}`);
        return next(req);
      }
    }),
    catchError(error => {
      console.error(`❌ Error in auth interceptor for ${req.method} ${req.url}:`, error);
      throw error;
    })
  );
};
