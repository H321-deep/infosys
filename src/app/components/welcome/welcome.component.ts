import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ProductService } from '../../services/product.service';
import { TransactionService } from '../../services/transaction.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss'
})
export class WelcomeComponent implements OnInit {
  totalProducts = signal(0);
  lowStockCount = signal(0);
  outOfStockCount = signal(0);
  totalSales = signal(0);
  totalPurchases = signal(0);
  isLoading = signal(false);
  searchTerm = signal('');
  recentAlerts = computed(() =>
    this.productService.getLowStockProducts().slice(0, 5)
  );
  recentTransactions = computed(() => {
    const transactions = [...this.transactionService.getTransactions()];
    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  });
  filteredAlerts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.recentAlerts();
    return this.recentAlerts().filter(alert =>
      alert.name.toLowerCase().includes(term) ||
      alert.sku.toLowerCase().includes(term) ||
      alert.category.toLowerCase().includes(term)
    );
  });
  filteredTransactions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.recentTransactions();
    return this.recentTransactions().filter(transaction =>
      transaction.productName.toLowerCase().includes(term) ||
      transaction.productSku.toLowerCase().includes(term) ||
      transaction.userName.toLowerCase().includes(term) ||
      transaction.type.toLowerCase().includes(term)
    );
  });
  stockSummary = computed(() => {
    const total = this.totalProducts();
    const outOfStock = this.outOfStockCount();
    const lowStockRaw = this.lowStockCount();
    const lowStock = Math.max(lowStockRaw - outOfStock, 0);
    const available = Math.max(total - lowStock - outOfStock, 0);
    const safeTotal = Math.max(total, 1);

    return {
      total,
      available,
      lowStock,
      outOfStock,
      availablePct: Math.round((available / safeTotal) * 100),
      lowStockPct: Math.round((lowStock / safeTotal) * 100),
      outOfStockPct: Math.round((outOfStock / safeTotal) * 100)
    };
  });
  salesPurchasesSummary = computed(() => {
    const sales = this.totalSales();
    const purchases = this.totalPurchases();
    const total = sales + purchases;
    const safeTotal = total > 0 ? total : 1;

    return {
      sales,
      purchases,
      salesPct: Math.round((sales / safeTotal) * 100),
      purchasesPct: Math.round((purchases / safeTotal) * 100)
    };
  });

  constructor(
    public authService: AuthService,
    private apiService: ApiService,
    private productService: ProductService,
    private transactionService: TransactionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.productService.loadProducts();
    this.transactionService.loadTransactions();
  }

  loadStats(): void {
    this.isLoading.set(true);
    
    // Get stats for last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Use dashboard stats API
    this.apiService.getDashboardStats(startDateStr, endDate).subscribe({
      next: (stats) => {
        this.totalProducts.set(stats.totalProducts);
        this.lowStockCount.set(stats.lowStockCount);
        this.outOfStockCount.set(
          this.productService.getProducts().filter(product => product.stockLevel === 0).length
        );
        this.totalSales.set(stats.totalSales);
        this.totalPurchases.set(stats.totalPurchases);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        // Fallback to local calculation if API fails
        const products = this.productService.getProducts();
        this.totalProducts.set(products.length);
        this.lowStockCount.set(this.productService.getLowStockProducts().length);
        this.outOfStockCount.set(products.filter(product => product.stockLevel === 0).length);
        this.totalSales.set(this.transactionService.getTotalSales(startDateStr, endDate));
        this.totalPurchases.set(this.transactionService.getTotalPurchases(startDateStr, endDate));
        this.isLoading.set(false);
      }
    });
  }

  navigateToProducts(): void {
    this.router.navigate(['/products']);
  }

  navigateToTransactions(): void {
    this.router.navigate(['/transactions']);
  }

  navigateToAlerts(): void {
    this.router.navigate(['/alerts']);
  }

  logout(): void {
    this.authService.logout();
  }
}

