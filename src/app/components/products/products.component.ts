import { Component, signal, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { TransactionService } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  paginatedProducts = computed(() => {
    const filtered = this.filteredProducts();
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  });
  searchTerm = signal('');
  editingProduct = signal<Product | null>(null);
  isCreating = signal(false);
  showStockModal = signal(false);
  stockModalProduct = signal<Product | null>(null);
  stockType = signal<'in' | 'out'>('in');
  stockQuantity = signal(0);
  
  // Pagination
  currentPage = signal(1);
  pageSize = 12;
  totalPages = computed(() => {
    const pages = Math.ceil(this.filteredProducts().length / this.pageSize);
    return pages > 0 ? pages : 1;
  });
  
  editForm = {
    sku: '',
    name: '',
    category: '',
    supplier: '',
    unitPrice: 0,
    minStockThreshold: 0
  };
  
  error = signal('');
  success = signal('');

  categories = ['Electronics', 'Clothing', 'Food & Beverages', 'Furniture', 'Office Supplies', 'Tools', 'Other'];
  
  constructor(
    private productService: ProductService,
    private transactionService: TransactionService,
    public authService: AuthService,
    private router: Router
  ) {
    // Sync products signal with productService
    effect(() => {
      this.products.set(this.productService.products());
      this.applyFilters();
    });
    
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    // Refresh products from API
    this.productService.loadProducts();
    // Filters will be applied automatically via effect
  }

  applyFilters(): void {
    const term = this.searchTerm();
    let filtered: Product[];
    
    if (!term) {
      filtered = [...this.products()];
    } else {
      filtered = this.productService.searchProducts(term);
    }
    
    this.filteredProducts.set(filtered);
    this.currentPage.set(1); // Reset to page 1 when filters change
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
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
  
  // Expose Math for template
  Math = Math;

  startCreate(): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can add products.');
      return;
    }
    this.isCreating.set(true);
    this.editingProduct.set(null);
    this.editForm = {
      sku: '',
      name: '',
      category: '',
      supplier: '',
      unitPrice: 0,
      minStockThreshold: 0
    };
    this.error.set('');
    this.success.set('');
  }

  startEdit(product: Product): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can edit products.');
      return;
    }
    this.isCreating.set(false);
    this.editingProduct.set(product);
    this.editForm = {
      sku: product.sku,
      name: product.name,
      category: product.category,
      supplier: product.supplier,
      unitPrice: product.unitPrice,
      minStockThreshold: product.minStockThreshold
    };
    this.error.set('');
    this.success.set('');
  }

  cancelEdit(): void {
    this.editingProduct.set(null);
    this.isCreating.set(false);
    this.error.set('');
    this.success.set('');
  }

  saveProduct(): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can update products.');
      return;
    }
    if (this.isCreating()) {
      this.createProduct();
    } else {
      this.updateProduct();
    }
  }

  createProduct(): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can create products.');
      return;
    }
    if (!this.editForm.sku.trim() || !this.editForm.name.trim() || !this.editForm.category.trim()) {
      this.error.set('SKU, name, and category are required');
      return;
    }

    if (this.editForm.unitPrice < 0) {
      this.error.set('Unit price must be non-negative');
      return;
    }

    if (this.editForm.minStockThreshold < 0) {
      this.error.set('Minimum stock threshold must be non-negative');
      return;
    }

    // Check if SKU already exists (client-side check)
    const existingProduct = this.productService.getProductBySku(this.editForm.sku.trim());
    if (existingProduct) {
      this.error.set('SKU already exists');
      return;
    }

    this.productService.createProduct({
      sku: this.editForm.sku.trim(),
      name: this.editForm.name.trim(),
      category: this.editForm.category,
      supplier: this.editForm.supplier.trim(),
      unitPrice: this.editForm.unitPrice,
      minStockThreshold: this.editForm.minStockThreshold
    }).then(() => {
      this.success.set('Product created successfully');
      this.loadProducts();
      setTimeout(() => {
        this.cancelEdit();
        this.success.set('');
      }, 2000);
    }).catch((error) => {
      this.error.set(error.error?.message || 'Failed to create product');
    });
  }

  updateProduct(): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can update products.');
      return;
    }
    const product = this.editingProduct();
    if (!product) return;

    if (!this.editForm.sku.trim() || !this.editForm.name.trim() || !this.editForm.category.trim()) {
      this.error.set('SKU, name, and category are required');
      return;
    }

    if (this.editForm.unitPrice < 0) {
      this.error.set('Unit price must be non-negative');
      return;
    }

    if (this.editForm.minStockThreshold < 0) {
      this.error.set('Minimum stock threshold must be non-negative');
      return;
    }

    // Check if SKU is taken by another product (client-side check)
    const existingProduct = this.productService.getProductBySku(this.editForm.sku.trim());
    if (existingProduct && existingProduct.id !== product.id) {
      this.error.set('SKU already exists');
      return;
    }

    this.productService.updateProduct(product.id, {
      sku: this.editForm.sku.trim(),
      name: this.editForm.name.trim(),
      category: this.editForm.category,
      supplier: this.editForm.supplier.trim(),
      unitPrice: this.editForm.unitPrice,
      minStockThreshold: this.editForm.minStockThreshold
    }).then(() => {
      this.success.set('Product updated successfully');
      this.loadProducts();
      setTimeout(() => {
        this.cancelEdit();
        this.success.set('');
      }, 2000);
    }).catch((error) => {
      this.error.set(error.error?.message || 'Failed to update product');
    });
  }

  deleteProduct(productId: string): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can delete products.');
      return;
    }
    Swal.fire({
      title: 'Delete Product?',
      text: 'Are you sure you want to delete this product? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#fc8181',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      background: '#ffffff'
    }).then((result) => {
      if (result.isConfirmed) {
        this.productService.deleteProduct(productId).then(() => {
          Swal.fire({
            title: 'Deleted!',
            text: 'Product has been deleted successfully.',
            icon: 'success',
            confirmButtonColor: '#5a67d8',
            timer: 2000,
            showConfirmButton: false
          });
          this.loadProducts();
        }).catch((error) => {
          Swal.fire({
            title: 'Error!',
            text: error.error?.message || 'Failed to delete product',
            icon: 'error',
            confirmButtonColor: '#fc8181'
          });
        });
      }
    });
  }

  openStockModal(product: Product, type: 'in' | 'out'): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can adjust stock.');
      return;
    }
    this.stockModalProduct.set(product);
    this.stockType.set(type);
    this.stockQuantity.set(0);
    this.showStockModal.set(true);
    this.error.set('');
  }

  closeStockModal(): void {
    this.showStockModal.set(false);
    this.stockModalProduct.set(null);
    this.stockQuantity.set(0);
  }

  updateStock(): void {
    if (!this.authService.isAdmin()) {
      this.error.set('Only administrators can adjust stock.');
      return;
    }
    const product = this.stockModalProduct();
    if (!product) return;

    const quantity = this.stockQuantity();
    if (quantity <= 0) {
      this.error.set('Quantity must be greater than 0');
      return;
    }

    if (this.stockType() === 'out' && quantity > product.stockLevel) {
      this.error.set('Insufficient stock');
      return;
    }

    const user = this.authService.currentUser();
    if (!user) return;

    // Update stock level (API automatically creates transaction)
    this.productService.updateStockLevel(
      product.id, 
      quantity, 
      this.stockType(),
      `${this.stockType() === 'in' ? 'Stock In' : 'Stock Out'} - Manual adjustment`
    ).then(() => {
      this.success.set(`Stock ${this.stockType() === 'in' ? 'added' : 'removed'} successfully`);
      this.loadProducts();
      this.transactionService.refresh(); // Refresh transactions
      this.closeStockModal();
      setTimeout(() => {
        this.success.set('');
      }, 2000);
    }).catch((error) => {
      this.error.set(error.error?.message || 'Failed to update stock');
    });
  }

  isLowStock(product: Product): boolean {
    return product.stockLevel <= product.minStockThreshold;
  }

  getStockStatusClass(product: Product): string {
    if (product.stockLevel === 0) return 'status-out';
    if (this.isLowStock(product)) return 'status-low';
    return 'status-ok';
  }

  navigateToWelcome(): void {
    this.router.navigate(['/welcome']);
  }
}

