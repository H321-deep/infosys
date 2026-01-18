import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  name = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  error = signal('');
  success = signal(false);
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error.set('');
    this.success.set(false);

    if (!this.name().trim() || !this.email().trim() || !this.password().trim()) {
      this.error.set('Please fill in all fields');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.error.set('Passwords do not match');
      return;
    }

    if (this.password().length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }

    this.isLoading.set(true);

    // Call create user API
    this.apiService.createUser(
      this.name().trim(), // username
      this.email().trim(), // email
      this.password(), // password
      'user' // role - default to 'user' for signup
    ).subscribe({
      next: (response) => {
        // Handle successful user creation
        this.success.set(true);
        // Also update local AuthService for backward compatibility
        this.authService.signup(this.email(), this.password(), this.name());
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
        this.isLoading.set(false);
      },
      error: (error) => {
        // Handle error
        console.error('Create user error:', error);
        this.error.set(error.error?.message || 'Failed to create account. Email or username may already exist.');
        this.isLoading.set(false);
      }
    });
  }
}

