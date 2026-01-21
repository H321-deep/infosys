import { Injectable, signal } from '@angular/core';
import { ApiService, Product } from './api.service';

// Re-export Product type for convenience (type-only to satisfy isolatedModules)
export type { Product } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  products = signal<Product[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(private apiService: ApiService) {
    // Don't load products in constructor - wait for user to be authenticated
    // Products will be loaded when components call loadProducts() explicitly
  }

  /**
   * Load all products from API
   */
  loadProducts(search?: string, category?: string, lowStock?: boolean): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    console.log('🔄 Loading products from API...', { search, category, lowStock });
    
    this.apiService.getProducts(search, category, lowStock).subscribe({
      next: (products) => {
        console.log('✅ Products loaded successfully:', products.length, 'products');
        this.products.set(products);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading products:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.error.set(error.error?.message || 'Failed to load products');
        this.isLoading.set(false);
        this.products.set([]);
      }
    });
  }

  /**
   * Get all products (returns current signal value)
   */
  getProducts(): Product[] {
    return this.products();
  }

  /**
   * Get product by ID
   */
  getProductById(id: string): Product | undefined {
    return this.products().find(p => p.id === id);
  }

  /**
   * Get product by SKU
   */
  getProductBySku(sku: string): Product | undefined {
    return this.products().find(p => p.sku === sku);
  }

  /**
   * Create product via API
   */
  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stockLevel'>): Promise<Product> {
    return new Promise((resolve, reject) => {
      this.apiService.createProduct({
        sku: product.sku,
        name: product.name,
        category: product.category,
        supplier: product.supplier,
        unitPrice: product.unitPrice,
        minStockThreshold: product.minStockThreshold
      }).subscribe({
        next: (newProduct) => {
          // Refresh products list
          this.loadProducts();
          resolve(newProduct);
        },
        error: (error) => {
          console.error('Error creating product:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Update product via API
   */
  updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const updateData: any = {};
      if (updates.sku !== undefined) updateData.sku = updates.sku;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.supplier !== undefined) updateData.supplier = updates.supplier;
      if (updates.unitPrice !== undefined) updateData.unitPrice = updates.unitPrice;
      if (updates.minStockThreshold !== undefined) updateData.minStockThreshold = updates.minStockThreshold;

      this.apiService.updateProduct(id, updateData).subscribe({
        next: () => {
          // Refresh products list
          this.loadProducts();
          resolve(true);
        },
        error: (error) => {
          console.error('Error updating product:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Delete product via API
   */
  deleteProduct(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.apiService.deleteProduct(id).subscribe({
        next: () => {
          // Refresh products list
          this.loadProducts();
          resolve(true);
        },
        error: (error) => {
          console.error('Error deleting product:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Update stock level via API
   */
  updateStockLevel(id: string, quantity: number, type: 'in' | 'out', notes?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.apiService.updateStockLevel(id, {
        quantity,
        type,
        notes
      }).subscribe({
        next: () => {
          // Refresh products list
          this.loadProducts();
          resolve(true);
        },
        error: (error) => {
          console.error('Error updating stock:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Get low stock products (from API)
   */
  getLowStockProducts(): Product[] {
    // Return current low stock products from signal
    return this.products().filter(p => p.stockLevel <= p.minStockThreshold);
  }

  /**
   * Load low stock products from API
   */
  loadLowStockProducts(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.apiService.getLowStockProducts().subscribe({
      next: (products) => {
        // Update products signal with low stock products
        this.products.set(products);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading low stock products:', error);
        this.error.set(error.error?.message || 'Failed to load low stock products');
        this.isLoading.set(false);
        // Fallback to local filtering
        this.products.set(this.products().filter(p => p.stockLevel <= p.minStockThreshold));
      }
    });
  }

  /**
   * Search products (client-side filtering for now, can be enhanced with API search)
   */
  searchProducts(term: string): Product[] {
    const searchTerm = term.toLowerCase();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      p.sku.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm) ||
      p.supplier.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Refresh products from API
   */
  refresh(): void {
    this.loadProducts();
  }
}
