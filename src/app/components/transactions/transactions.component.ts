import { Component, signal, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  transactions = signal<Transaction[]>([]);
  filteredTransactions = signal<Transaction[]>([]);
  paginatedTransactions = computed(() => {
    const filtered = this.filteredTransactions();
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  });
  searchTerm = signal('');
  filterType = signal<'all' | 'purchase' | 'sale'>('all');
  startDate = signal('');
  endDate = signal('');
  showCreateModal = signal(false);
  
  // Pagination
  currentPage = signal(1);
  pageSize = 10;
  totalPages = computed(() => {
    const pages = Math.ceil(this.filteredTransactions().length / this.pageSize);
    return pages > 0 ? pages : 1;
  });
  
  createForm = {
    productId: '',
    type: 'purchase' as 'purchase' | 'sale',
    quantity: 0,
    notes: ''
  };
  
  error = signal('');
  success = signal('');

  constructor(
    private transactionService: TransactionService,
    public productService: ProductService,
    public authService: AuthService,
    private router: Router
  ) {
    // Sync transactions signal with transactionService
    effect(() => {
      this.transactions.set(this.transactionService.transactions());
      this.applyFilters();
    });
    
  }

  ngOnInit(): void {
    this.loadTransactions();
    // Load products for the transaction form
    this.productService.loadProducts();
  }

  loadTransactions(): void {
    // Load transactions from API with current filters
    const params: any = {};
    if (this.filterType() !== 'all') params.type = this.filterType();
    if (this.startDate()) params.startDate = this.startDate();
    if (this.endDate()) params.endDate = this.endDate();
    if (this.searchTerm()) params.search = this.searchTerm();
    
    this.transactionService.loadTransactions(Object.keys(params).length > 0 ? params : undefined);
  }

  applyFilters(): void {
    let filtered = [...this.transactions()];

    // Filter by type
    if (this.filterType() !== 'all') {
      filtered = filtered.filter(t => t.type === this.filterType());
    }

    // Filter by date range
    if (this.startDate() && this.endDate()) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        const start = new Date(this.startDate());
        const end = new Date(this.endDate());
        end.setHours(23, 59, 59, 999);
        return transactionDate >= start && transactionDate <= end;
      });
    }

    // Filter by search term
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(t =>
        t.productName.toLowerCase().includes(term) ||
        t.productSku.toLowerCase().includes(term) ||
        t.userName.toLowerCase().includes(term)
      );
    }

    this.filteredTransactions.set(filtered);
    // Reset to page 1 when filters change
    this.currentPage.set(1);
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }
  
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can create transactions.');
      return;
    }
    // Ensure products are loaded before opening modal
    if (this.productService.getProducts().length === 0) {
      this.productService.loadProducts();
    }
    
    this.showCreateModal.set(true);
    this.createForm = {
      productId: '',
      type: 'purchase',
      quantity: 0,
      notes: ''
    };
    this.error.set('');
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.error.set('');
  }

  createTransaction(): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can create transactions.');
      return;
    }
    if (!this.createForm.productId || this.createForm.quantity <= 0) {
      this.error.set('Please select a product and enter a valid quantity');
      return;
    }

    const product = this.productService.getProductById(this.createForm.productId);
    if (!product) {
      this.error.set('Product not found');
      return;
    }

    if (this.createForm.type === 'sale' && this.createForm.quantity > product.stockLevel) {
      this.error.set('Insufficient stock');
      return;
    }

    // Create transaction via API (API will automatically update stock)
    this.transactionService.createTransaction({
      productId: product.id,
      type: this.createForm.type,
      quantity: this.createForm.quantity,
      unitPrice: product.unitPrice,
      notes: this.createForm.notes
    }).then(() => {
      this.success.set('Transaction created successfully');
      this.productService.refresh(); // Refresh products to update stock levels
      this.loadTransactions();
      this.closeCreateModal();
      setTimeout(() => {
        this.success.set('');
      }, 2000);
    }).catch((error) => {
      this.error.set(error.error?.message || 'Failed to create transaction');
    });
  }

  deleteTransaction(id: string): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can delete transactions.');
      return;
    }
    Swal.fire({
      title: 'Delete Transaction?',
      text: 'Are you sure you want to delete this transaction? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#fc8181',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      background: '#ffffff',
      customClass: {
        popup: 'swal-popup',
        confirmButton: 'swal-confirm-button',
        cancelButton: 'swal-cancel-button'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.transactionService.deleteTransaction(id).then(() => {
          Swal.fire({
            title: 'Deleted!',
            text: 'Transaction has been deleted successfully.',
            icon: 'success',
            confirmButtonColor: '#5a67d8',
            timer: 2000,
            showConfirmButton: false
          });
          this.productService.refresh(); // Refresh products as stock may have been reversed
          this.loadTransactions();
        }).catch((error) => {
          Swal.fire({
            title: 'Error!',
            text: error.error?.message || 'Failed to delete transaction',
            icon: 'error',
            confirmButtonColor: '#fc8181'
          });
        });
      }
    });
  }

  getTotalSales(): number {
    return this.transactionService.getTotalSales(this.startDate() || undefined, this.endDate() || undefined);
  }

  getTotalPurchases(): number {
    return this.transactionService.getTotalPurchases(this.startDate() || undefined, this.endDate() || undefined);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  navigateToWelcome(): void {
    this.router.navigate(['/welcome']);
  }

  get availableProducts() {
    return this.productService.getProducts();
  }
  
  // Expose Math for template
  Math = Math;
  
  // Helper to generate page array
  getPageNumbers(): number[] {
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const current = this.currentPage();
    if (current <= 3) {
      return [1, 2, 3, 4, 5];
    } else if (current >= total - 2) {
      return [total - 4, total - 3, total - 2, total - 1, total];
    } else {
      return [current - 1, current, current + 1];
    }
  }
}

