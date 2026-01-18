import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { TransactionService } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  startDate = signal('');
  endDate = signal('');
  reportType = signal<'summary' | 'transactions' | 'products'>('summary');
  error = signal('');
  success = signal('');

  constructor(
    public productService: ProductService,
    public transactionService: TransactionService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set default date range to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    this.endDate.set(end.toISOString().split('T')[0]);
    this.startDate.set(start.toISOString().split('T')[0]);
  }

  exportToCSV(): void {
    try {
      let csvContent = '';
      let filename = '';

      if (this.reportType() === 'summary') {
        csvContent = this.generateSummaryCSV();
        filename = `inventory-summary-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (this.reportType() === 'transactions') {
        csvContent = this.generateTransactionsCSV();
        filename = `transactions-${this.startDate()}-to-${this.endDate()}.csv`;
      } else if (this.reportType() === 'products') {
        csvContent = this.generateProductsCSV();
        filename = `products-${new Date().toISOString().split('T')[0]}.csv`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.success.set('Report exported successfully');
      setTimeout(() => {
        this.success.set('');
      }, 2000);
    } catch (error) {
      this.error.set('Failed to export report');
      console.error('Export error:', error);
    }
  }

  exportToPDF(): void {
    // For PDF, we'll create a simple HTML representation and use browser print
    // In production, you might want to use a library like jsPDF or pdfmake
    this.error.set('PDF export will open print dialog. For full PDF generation, please install a PDF library like jsPDF.');
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.error.set('Please allow popups to generate PDF');
      return;
    }

    let htmlContent = '';
    if (this.reportType() === 'summary') {
      htmlContent = this.generateSummaryHTML();
    } else if (this.reportType() === 'transactions') {
      htmlContent = this.generateTransactionsHTML();
    } else if (this.reportType() === 'products') {
      htmlContent = this.generateProductsHTML();
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2d3748; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f7fafc; font-weight: bold; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  private generateSummaryCSV(): string {
    const products = this.productService.getProducts();
    const transactions = this.transactionService.getTransactionsByDateRange(
      this.startDate(),
      this.endDate()
    );
    const totalSales = this.transactionService.getTotalSales(this.startDate(), this.endDate());
    const totalPurchases = this.transactionService.getTotalPurchases(this.startDate(), this.endDate());

    let csv = 'Inventory Summary Report\n';
    csv += `Date Range: ${this.startDate()} to ${this.endDate()}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += 'Overall Statistics\n';
    csv += `Total Products,${products.length}\n`;
    csv += `Total Sales,$${totalSales.toFixed(2)}\n`;
    csv += `Total Purchases,$${totalPurchases.toFixed(2)}\n`;
    csv += `Net Profit,$${(totalSales - totalPurchases).toFixed(2)}\n\n`;
    csv += 'Low Stock Products\n';
    csv += 'Name,SKU,Stock Level,Threshold\n';
    
    const lowStock = this.productService.getLowStockProducts();
    lowStock.forEach(p => {
      csv += `"${p.name}",${p.sku},${p.stockLevel},${p.minStockThreshold}\n`;
    });

    return csv;
  }

  private generateTransactionsCSV(): string {
    const transactions = this.transactionService.getTransactionsByDateRange(
      this.startDate(),
      this.endDate()
    );

    let csv = 'Transaction Report\n';
    csv += `Date Range: ${this.startDate()} to ${this.endDate()}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += 'Date,Product Name,SKU,Type,Quantity,Unit Price,Total Amount,User\n';

    transactions.forEach(t => {
      csv += `"${new Date(t.date).toLocaleString()}","${t.productName}",${t.productSku},${t.type},${t.quantity},$${t.unitPrice.toFixed(2)},$${t.totalAmount.toFixed(2)},"${t.userName}"\n`;
    });

    return csv;
  }

  private generateProductsCSV(): string {
    const products = this.productService.getProducts();

    let csv = 'Products Report\n';
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += 'Name,SKU,Category,Supplier,Unit Price,Stock Level,Threshold\n';

    products.forEach(p => {
      csv += `"${p.name}",${p.sku},"${p.category}","${p.supplier}",$${p.unitPrice.toFixed(2)},${p.stockLevel},${p.minStockThreshold}\n`;
    });

    return csv;
  }

  private generateSummaryHTML(): string {
    const products = this.productService.getProducts();
    const totalSales = this.transactionService.getTotalSales(this.startDate(), this.endDate());
    const totalPurchases = this.transactionService.getTotalPurchases(this.startDate(), this.endDate());
    const lowStock = this.productService.getLowStockProducts();

    return `
      <h1>Inventory Summary Report</h1>
      <p>Date Range: ${this.startDate()} to ${this.endDate()}</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <h2>Statistics</h2>
      <table>
        <tr><th>Total Products</th><td>${products.length}</td></tr>
        <tr><th>Total Sales</th><td>$${totalSales.toFixed(2)}</td></tr>
        <tr><th>Total Purchases</th><td>$${totalPurchases.toFixed(2)}</td></tr>
        <tr><th>Net Profit</th><td>$${(totalSales - totalPurchases).toFixed(2)}</td></tr>
      </table>
      <h2>Low Stock Products (${lowStock.length})</h2>
      <table>
        <tr><th>Name</th><th>SKU</th><th>Stock Level</th><th>Threshold</th></tr>
        ${lowStock.map(p => `<tr><td>${p.name}</td><td>${p.sku}</td><td>${p.stockLevel}</td><td>${p.minStockThreshold}</td></tr>`).join('')}
      </table>
    `;
  }

  private generateTransactionsHTML(): string {
    const transactions = this.transactionService.getTransactionsByDateRange(
      this.startDate(),
      this.endDate()
    );

    return `
      <h1>Transaction Report</h1>
      <p>Date Range: ${this.startDate()} to ${this.endDate()}</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table>
        <tr><th>Date</th><th>Product</th><th>SKU</th><th>Type</th><th>Quantity</th><th>Amount</th><th>User</th></tr>
        ${transactions.map(t => `<tr><td>${new Date(t.date).toLocaleString()}</td><td>${t.productName}</td><td>${t.productSku}</td><td>${t.type}</td><td>${t.quantity}</td><td>$${t.totalAmount.toFixed(2)}</td><td>${t.userName}</td></tr>`).join('')}
      </table>
    `;
  }

  private generateProductsHTML(): string {
    const products = this.productService.getProducts();

    return `
      <h1>Products Report</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table>
        <tr><th>Name</th><th>SKU</th><th>Category</th><th>Stock Level</th><th>Price</th></tr>
        ${products.map(p => `<tr><td>${p.name}</td><td>${p.sku}</td><td>${p.category}</td><td>${p.stockLevel}</td><td>$${p.unitPrice.toFixed(2)}</td></tr>`).join('')}
      </table>
    `;
  }

  navigateToWelcome(): void {
    this.router.navigate(['/welcome']);
  }
}

