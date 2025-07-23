import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { switchMap, take, catchError, throwError, retry, tap, finalize } from 'rxjs';
import { GoogleAuthService } from '../services/google-auth.service';

// Define which URLs should include the auth token
const protectedUrls = [
  'getuser_by_googleid',
  // Add more protected endpoints as needed
];

// Keep track of requests being retried to avoid infinite loops
const retryingRequests = new Set<string>();

// Generate a unique key for each request
const getRequestKey = (req: any): string => {
  return `${req.method}-${req.url}`;
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const googleAuthService = inject(GoogleAuthService);
  
  // Check if the request URL matches any protected URLs
  const shouldAddToken = protectedUrls.some(url => req.url.includes(url));
  
  if (!shouldAddToken) {
    // If not a protected URL, proceed without adding token
    return next(req);
  }

  const requestKey = getRequestKey(req);
  
  // Use ensureValidToken to automatically refresh if needed
  return googleAuthService.ensureValidToken().pipe(
    take(1),
    switchMap(token => {
      // Clone the request and add the Authorization header
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log(`🔐 Adding auth token to request: ${req.method} ${req.url}`);
      return next(authReq);
    }),
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized errors specifically
      if (error.status === 401 && !retryingRequests.has(requestKey)) {
        console.warn(`🔄 Token expired for ${req.method} ${req.url}, attempting refresh...`);
        
        // Mark this request as being retried to prevent infinite loops
        retryingRequests.add(requestKey);
        
        // Try to refresh the token and retry the request
        const refreshToken = googleAuthService.getRefreshToken();
        if (refreshToken) {
          return googleAuthService.refreshAccessToken(refreshToken).pipe(
            switchMap(tokenResponse => {
              // Token refreshed successfully, retry the original request
              const newToken = tokenResponse.id_token;
              
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              
              console.log(`✅ Token refreshed, retrying request: ${req.method} ${req.url}`);
              return next(retryReq);
            }),
            catchError(refreshError => {
              console.error(`❌ Token refresh failed for ${req.method} ${req.url}:`, refreshError);
              // If refresh fails, sign out the user
              googleAuthService.signOut();
              return throwError(() => new Error('Token refresh failed. Please sign in again.'));
            }),
            // Clean up the retry tracking regardless of success or failure
            finalize(() => {
              retryingRequests.delete(requestKey);
            })
          );
        } else {
          console.error(`❌ No refresh token available for ${req.method} ${req.url}`);
          retryingRequests.delete(requestKey);
          // No refresh token available, sign out the user
          googleAuthService.signOut();
          return throwError(() => new Error('No refresh token available. Please sign in again.'));
        }
      } else if (error.status === 401 && retryingRequests.has(requestKey)) {
        // Already tried to refresh for this request, don't retry again
        console.error(`❌ Auth retry failed for ${req.method} ${req.url} - already attempted refresh`);
        retryingRequests.delete(requestKey);
        googleAuthService.signOut();
        return throwError(() => new Error('Authentication failed after token refresh. Please sign in again.'));
      }
      
      // For other errors, just pass them through
      console.error(`❌ Error in auth interceptor for ${req.method} ${req.url}:`, error);
      return throwError(() => error);
    })
  );
};
