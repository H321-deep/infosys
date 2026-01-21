import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { ApiService, AlertSettings } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss'
})
export class AlertsComponent implements OnInit {
  lowStockProducts = signal<Product[]>([]);
  lowStockCount = computed(() => this.lowStockProducts().length);
  outOfStockCount = computed(() =>
    this.lowStockProducts().filter(product => product.stockLevel === 0).length
  );
  alertSettings = signal<AlertSettings>({
    enabled: true,
    emailAlerts: false,
    smsAlerts: false
  });
  defaultThreshold = signal(20);
  
  error = signal('');
  success = signal('');
  isLoading = signal(false);

  constructor(
    private productService: ProductService,
    private apiService: ApiService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
    this.loadSettings();
  }

  loadAlerts(): void {
    this.isLoading.set(true);
    // Try to load from API first, fallback to local filtering
    this.apiService.getLowStockAlerts().subscribe({
      next: (products) => {
        this.lowStockProducts.set(products);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading low stock alerts from API:', error);
        // Fallback to local filtering
        this.lowStockProducts.set(this.productService.getLowStockProducts());
        this.isLoading.set(false);
      }
    });
  }

  loadSettings(): void {
    // Try to load from API first, fallback to localStorage
    this.apiService.getAlertSettings().subscribe({
      next: (settings) => {
        this.alertSettings.set(settings);
      },
      error: (error) => {
        console.error('Error loading alert settings from API:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem('alertSettings');
        if (stored) {
          try {
            this.alertSettings.set(JSON.parse(stored));
          } catch (e) {
            console.error('Error parsing alert settings from localStorage:', e);
          }
        }
      }
    });
  }

  saveSettings(): void {
    this.error.set('');
    this.apiService.updateAlertSettings(this.alertSettings()).subscribe({
      next: (settings) => {
        this.alertSettings.set(settings);
        // Also save to localStorage as backup
        localStorage.setItem('alertSettings', JSON.stringify(settings));
        this.success.set('Alert settings saved successfully');
        setTimeout(() => {
          this.success.set('');
        }, 2000);
      },
      error: (error) => {
        console.error('Error saving alert settings:', error);
        // Fallback to localStorage
        localStorage.setItem('alertSettings', JSON.stringify(this.alertSettings()));
        this.error.set(error.error?.message || 'Failed to save settings to server. Saved locally.');
        setTimeout(() => {
          this.error.set('');
        }, 3000);
      }
    });
  }

  updateThreshold(product: Product, threshold: number): void {
    if (threshold < 0) {
      this.error.set('Threshold must be non-negative');
      return;
    }

    this.productService.updateProduct(product.id, { minStockThreshold: threshold })
      .then(() => {
        this.success.set('Threshold updated successfully');
        this.loadAlerts();
        setTimeout(() => {
          this.success.set('');
        }, 2000);
      })
      .catch((error) => {
        this.error.set(error.error?.message || 'Failed to update threshold');
      });
  }

  navigateToWelcome(): void {
    this.router.navigate(['/welcome']);
  }

  navigateToProduct(productId: string): void {
    this.router.navigate(['/products']);
  }
}

