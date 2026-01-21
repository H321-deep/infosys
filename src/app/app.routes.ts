import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'signup',
    loadComponent: () => import('./components/signup/signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'welcome',
    loadComponent: () => import('./components/welcome/welcome.component').then(m => m.WelcomeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'products',
    loadComponent: () => import('./components/products/products.component').then(m => m.ProductsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'transactions',
    loadComponent: () => import('./components/transactions/transactions.component').then(m => m.TransactionsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'alerts',
    loadComponent: () => import('./components/alerts/alerts.component').then(m => m.AlertsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/reports/reports.component').then(m => m.ReportsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'user-management',
    loadComponent: () => import('./components/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [adminGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
