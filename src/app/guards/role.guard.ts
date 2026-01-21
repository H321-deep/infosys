import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  // Redirect to welcome page if authenticated but not admin
  if (authService.isAuthenticated()) {
    router.navigate(['/welcome']);
    return false;
  }

  // Redirect to login if not authenticated
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

