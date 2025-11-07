import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  if (localStorage.getItem('adminAuth') === 'true') {
    return true;
  }
  
  router.navigate(['/admin']);
  return false;
};
