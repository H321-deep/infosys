import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  users = signal<User[]>([]);
  searchTerm = signal('');
  editingUser = signal<User | null>(null);
  isCreating = signal(false);
  editForm = {
    name: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  };
  error = signal('');
  success = signal('');

  constructor(
    public authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.users.set(this.authService.getUsers());
  }

  get filteredUsers(): User[] {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.users();
    return this.users().filter(u => 
      u.name.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term)
    );
  }

  startCreate(): void {
    this.isCreating.set(true);
    this.editingUser.set(null);
    this.editForm = {
      name: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      role: 'user'
    };
    this.error.set('');
    this.success.set('');
  }

  startEdit(user: User): void {
    this.isCreating.set(false);
    this.editingUser.set(user);
    this.editForm = {
      name: user.name,
      fullName: user.name,
      email: user.email,
      phone: '',
      password: '', // Don't show password when editing
      role: user.role
    };
    this.error.set('');
    this.success.set('');
  }

  cancelEdit(): void {
    this.editingUser.set(null);
    this.isCreating.set(false);
    this.error.set('');
    this.success.set('');
  }

  saveUser(): void {
    if (this.isCreating()) {
      this.createUser();
    } else {
      this.updateUser();
    }
  }

  createUser(): void {
    if (!this.editForm.name.trim() || !this.editForm.email.trim()) {
      this.error.set('Username and email are required');
      return;
    }

    const baseUsername = this.editForm.name.trim().replace(/\s+/g, '');
    const generatedPassword = `${baseUsername.slice(0, 4).toLowerCase()}123`;
    const passwordToUse = this.editForm.password.trim() || generatedPassword;

    if (passwordToUse.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }

    // Check if email is already taken (local check)
    const existingUser = this.users().find(u => u.email === this.editForm.email);
    if (existingUser) {
      this.error.set('Email already exists');
      return;
    }

    // Call create user API
    this.apiService.createUser(
      this.editForm.name.trim(), // username
      this.editForm.email.trim(), // email
      passwordToUse, // password
      this.editForm.role // role
    ).subscribe({
      next: (response) => {
        // Handle successful user creation
        this.success.set('User created successfully');
        // Also update local AuthService for backward compatibility
        this.authService.createUser(
          this.editForm.email,
          passwordToUse,
          this.editForm.name,
          this.editForm.role
        );
        this.loadUsers();
        setTimeout(() => {
          this.cancelEdit();
          this.success.set('');
        }, 2000);
      },
      error: (error) => {
        // Handle error
        console.error('Create user error:', error);
        this.error.set(error.error?.message || 'Failed to create user. Email or username may already exist.');
      }
    });
  }

  updateUser(): void {
    const user = this.editingUser();
    if (!user) return;

    if (!this.editForm.name.trim() || !this.editForm.email.trim()) {
      this.error.set('Name and email are required');
      return;
    }

    // Check if email is already taken by another user
    const existingUser = this.users().find(u => 
      u.email === this.editForm.email && u.id !== user.id
    );
    if (existingUser) {
      this.error.set('Email already exists');
      return;
    }

    // Prepare update data for API (only include password if it was changed)
    const updateData: any = {
      username: this.editForm.name.trim(),
      email: this.editForm.email.trim(),
      role: this.editForm.role
    };

    if (this.editForm.password.trim()) {
      updateData.password = this.editForm.password;
    }

    // Use original username (user.name) as the identifier for the API
    const username = user.name;

    // Call update user API
    this.apiService.updateUser(username, updateData).subscribe({
      next: (response) => {
        // Handle successful user update
        this.success.set('User updated successfully');
        // Also update local AuthService for backward compatibility
        const updates: Partial<User> = {
          name: this.editForm.name,
          email: this.editForm.email,
          role: this.editForm.role
        };
        if (this.editForm.password.trim()) {
          updates.password = this.editForm.password;
        }
        this.authService.updateUser(user.id, updates);
        this.loadUsers();
        setTimeout(() => {
          this.cancelEdit();
          this.success.set('');
        }, 2000);
      },
      error: (error) => {
        // Handle error
        console.error('Update user error:', error);
        this.error.set(error.error?.message || 'Failed to update user');
      }
    });
  }

  deleteUser(userId: string): void {
    // Find the user to get their username (name field)
    const user = this.users().find(u => u.id === userId);
    if (!user) {
      Swal.fire({
        title: 'Error!',
        text: 'User not found',
        icon: 'error',
        confirmButtonColor: '#fc8181'
      });
      return;
    }

    const username = user.name;

    Swal.fire({
      title: 'Delete User?',
      text: `Are you sure you want to delete user "${username}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#fc8181',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      background: '#ffffff'
    }).then((result) => {
      if (result.isConfirmed) {
        // Call delete user API
        this.apiService.deleteUser(username).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Deleted!',
              text: 'User has been deleted successfully.',
              icon: 'success',
              confirmButtonColor: '#5a67d8',
              timer: 2000,
              showConfirmButton: false
            });
            // Also update local AuthService for backward compatibility
            this.authService.deleteUser(userId);
            this.loadUsers();
          },
          error: (error) => {
            Swal.fire({
              title: 'Error!',
              text: error.error?.message || 'Failed to delete user',
              icon: 'error',
              confirmButtonColor: '#fc8181'
            });
          }
        });
      }
    });
  }

  getRoleBadgeClass(role: string): string {
    return role === 'admin' ? 'badge-admin' : 'badge-user';
  }

  navigateToWelcome(): void {
    this.router.navigate(['/welcome']);
  }
}

