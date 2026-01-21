import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'currentUser';
  private readonly USERS_KEY = 'users';
  
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor(private router: Router) {
    this.loadUserFromStorage();
  }

  // Initialize with default admin user if no users exist
  private initializeUsers(): void {
    const users = this.getUsers();
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: '1',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        name: 'Admin User'
      };
      users.push(defaultAdmin);
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }
  }

  signup(email: string, password: string, name: string): boolean {
    this.initializeUsers();
    const users = this.getUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      return false;
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      password, // In production, hash this password
      role: 'user',
      name
    };

    users.push(newUser);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    return true;
  }

  createUser(email: string, password: string, name: string, role: 'admin' | 'user' = 'user'): boolean {
    this.initializeUsers();
    const users = this.getUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      return false;
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      password, // In production, hash this password
      role,
      name
    };

    users.push(newUser);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    return true;
  }

  login(email: string, password: string): boolean {
    this.initializeUsers();
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      // Remove password before storing
      const { password: _, ...userWithoutPassword } = user;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userWithoutPassword));
      this.currentUser.set(user);
      this.isAuthenticated.set(true);
      return true;
    }

    return false;
  }

  /**
   * Set user from API login response
   * @param username - Username from API response
   * @param role - Role from API response
   * @param email - Optional email (can be same as username if not provided)
   */
  setUserFromApiResponse(username: string, role: 'admin' | 'user', email?: string): void {
    const user: User = {
      id: Date.now().toString(),
      email: email || username,
      password: '', // Password not stored after login
      role: role as 'admin' | 'user',
      name: username
    };

    // Remove password before storing
    const { password: _, ...userWithoutPassword } = user;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userWithoutPassword));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  private loadUserFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      // Get full user with password from users list
      const users = this.getUsers();
      const fullUser = users.find(u => u.id === user.id);
      if (fullUser) {
        this.currentUser.set(fullUser);
        this.isAuthenticated.set(true);
      }
    }
  }

  getUsers(): User[] {
    const stored = localStorage.getItem(this.USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  updateUser(userId: string, updates: Partial<User>): boolean {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
      
      // Update current user if it's the logged-in user
      if (this.currentUser()?.id === userId) {
        this.currentUser.set(users[index]);
        const { password: _, ...userWithoutPassword } = users[index];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userWithoutPassword));
      }
      return true;
    }
    return false;
  }

  deleteUser(userId: string): boolean {
    const users = this.getUsers();
    const filtered = users.filter(u => u.id !== userId);
    if (filtered.length < users.length) {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(filtered));
      
      // If deleted user is current user, logout
      if (this.currentUser()?.id === userId) {
        this.logout();
      }
      return true;
    }
    return false;
  }
}

