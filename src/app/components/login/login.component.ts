import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = signal('');
  password = signal('');
  selectedRole = signal<'admin' | 'user'>('admin');
  showPassword = signal(false);
  error = signal('');
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error.set('');
    
    if (!this.email().trim() || !this.password().trim()) {
      this.error.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);
    
    // Call login API
    this.apiService.login(this.email().trim(), this.password()).subscribe({
      next: (response) => {
        // Handle successful login
        // Response format: { username, role, message }
        if (response.username && response.role) {
          if (response.role !== this.selectedRole()) {
            this.error.set(`Please log in using the ${response.role} tab.`);
            this.isLoading.set(false);
            return;
          }
          // Store token if provided
          if (response.token) {
            localStorage.setItem('authToken', response.token);
          }
          
          // Set user from API response
          this.authService.setUserFromApiResponse(
            response.username,
            response.role as 'admin' | 'user',
            this.email().trim()
          );
          
          // Navigate to welcome page
          this.router.navigate(['/welcome']);
        } else {
          this.error.set('Invalid response from server');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        // Handle error
        console.error('Login error:', error);
        this.error.set(error.error?.message || 'Invalid email or password');
        this.isLoading.set(false);
      }
    });
  }

  setRole(role: 'admin' | 'user'): void {
    this.selectedRole.set(role);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }
}

