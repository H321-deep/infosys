import { Injectable, signal } from '@angular/core';
import { ApiService, Transaction } from './api.service';

// Re-export Transaction type for convenience (type-only to satisfy isolatedModules)
export type { Transaction } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  transactions = signal<Transaction[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(private apiService: ApiService) {
    // Don't load transactions in constructor - wait for user to be authenticated
    // Transactions will be loaded when components call loadTransactions() explicitly
  }

  /**
   * Load transactions from API
   */
  loadTransactions(params?: {
    type?: 'purchase' | 'sale' | 'all';
    startDate?: string;
    endDate?: string;
    productId?: string;
    userId?: string;
    search?: string;
  }): void {
    this.isLoading.set(true);
    this.error.set(null);

    console.log('🔄 Loading transactions from API...', params);

    this.apiService.getTransactions(params).subscribe({
      next: (transactions) => {
        console.log('✅ Transactions loaded successfully:', transactions.length, 'transactions');
        this.transactions.set(transactions);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading transactions:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.error.set(error.error?.message || 'Failed to load transactions');
        this.isLoading.set(false);
        this.transactions.set([]);
      }
    });
  }

  /**
   * Get all transactions (returns current signal value)
   */
  getTransactions(): Transaction[] {
    return this.transactions();
  }

  /**
   * Get transaction by ID
   */
  getTransactionById(id: string): Transaction | undefined {
    return this.transactions().find(t => t.id === id);
  }

  /**
   * Get transactions by product ID
   */
  getTransactionsByProduct(productId: string): Transaction[] {
    return this.transactions().filter(t => t.productId === productId);
  }

  /**
   * Get transactions by date range
   */
  getTransactionsByDateRange(startDate: string, endDate: string): Transaction[] {
    return this.transactions().filter(t => {
      const transactionDate = new Date(t.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return transactionDate >= start && transactionDate <= end;
    });
  }

  /**
   * Create transaction via API
   */
  createTransaction(transaction: Omit<Transaction, 'id' | 'date' | 'userId' | 'userName' | 'productName' | 'productSku' | 'totalAmount'>): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      this.apiService.createTransaction({
        productId: transaction.productId,
        type: transaction.type,
        quantity: transaction.quantity,
        unitPrice: transaction.unitPrice,
        notes: transaction.notes
      }).subscribe({
        next: (newTransaction) => {
          // Refresh transactions list
          this.loadTransactions();
          resolve(newTransaction);
        },
        error: (error) => {
          console.error('Error creating transaction:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Delete transaction via API
   */
  deleteTransaction(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.apiService.deleteTransaction(id).subscribe({
        next: () => {
          // Refresh transactions list
          this.loadTransactions();
          resolve(true);
        },
        error: (error) => {
          console.error('Error deleting transaction:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Get total sales (calculated from current transactions)
   */
  getTotalSales(startDate?: string, endDate?: string): number {
    let sales = this.transactions().filter(t => t.type === 'sale');
    
    if (startDate && endDate) {
      sales = this.getTransactionsByDateRange(startDate, endDate).filter(t => t.type === 'sale');
    }

    return sales.reduce((sum, t) => sum + t.totalAmount, 0);
  }

  /**
   * Get total purchases (calculated from current transactions)
   */
  getTotalPurchases(startDate?: string, endDate?: string): number {
    let purchases = this.transactions().filter(t => t.type === 'purchase');
    
    if (startDate && endDate) {
      purchases = this.getTransactionsByDateRange(startDate, endDate).filter(t => t.type === 'purchase');
    }

    return purchases.reduce((sum, t) => sum + t.totalAmount, 0);
  }

  /**
   * Refresh transactions from API
   */
  refresh(): void {
    this.loadTransactions();
  }
}
