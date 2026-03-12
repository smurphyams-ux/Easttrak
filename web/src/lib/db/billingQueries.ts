import { db } from './index';
import { Contract, Invoice, InvoiceLineItem, PaymentMethod } from '../../types/billing';

export const billingQueries = {
    async getAllInvoices(): Promise<Invoice[]> {
      const result = await db.query('SELECT * FROM invoices ORDER BY invoice_date DESC');
      return result.rows.map(this.mapToInvoice);
    },

    async getInvoiceById(id: string): Promise<Invoice | null> {
      const result = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
      return result.rows[0] ? this.mapToInvoice(result.rows[0]) : null;
    },

    async deleteInvoice(id: string): Promise<void> {
      await db.query('DELETE FROM invoices WHERE id = $1', [id]);
    },
  // Contract queries
  async getActiveContracts(): Promise<Contract[]> {
    const result = await db.query(`
      SELECT * FROM contracts 
      WHERE status = 'active' 
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    `);
    return result.rows.map(this.mapToContract);
  },

  async getContractById(id: string): Promise<Contract | null> {
    const result = await db.query('SELECT * FROM contracts WHERE id = $1', [id]);
    return result.rows[0] ? this.mapToContract(result.rows[0]) : null;
  },

  async updateContractStatus(contractId: string, status: string): Promise<void> {
    await db.query(
      'UPDATE contracts SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, contractId]
    );
  },

  async createContract(contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract> {
    const result = await db.query(`
      INSERT INTO contracts (customer_id, container_id, start_date, end_date, monthly_rate, overage_rate_per_day, allowed_days, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [contract.customerId, contract.containerId, contract.startDate, contract.endDate, 
        contract.monthlyRate, contract.overageRatePerDay, contract.allowedDays, contract.status]);
    return this.mapToContract(result.rows[0]);
  },

  // Invoice queries
  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const result = await db.query(`
      INSERT INTO invoices (customer_id, contract_id, invoice_number, invoice_date, due_date, subtotal, tax, total, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [invoice.customerId, invoice.contractId, invoice.invoiceNumber, invoice.invoiceDate,
        invoice.dueDate, invoice.subtotal, invoice.tax, invoice.total, invoice.status]);
    return this.mapToInvoice(result.rows[0]);
  },

  async updateInvoiceStatus(invoiceId: string, status: string, paidAt?: Date): Promise<void> {
    if (paidAt) {
      await db.query(
        'UPDATE invoices SET status = $1, paid_at = $2 WHERE id = $3',
        [status, paidAt, invoiceId]
      );
    } else {
      await db.query(
        'UPDATE invoices SET status = $1 WHERE id = $2',
        [status, invoiceId]
      );
    }
  },

  async getOverdueInvoices(): Promise<Invoice[]> {
    const result = await db.query(`
      SELECT * FROM invoices 
      WHERE status IN ('pending', 'overdue')
      AND due_date < CURRENT_DATE
    `);
    return result.rows.map(this.mapToInvoice);
  },

  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    const result = await db.query(
      'SELECT * FROM invoices WHERE customer_id = $1 ORDER BY invoice_date DESC',
      [customerId]
    );
    return result.rows.map(this.mapToInvoice);
  },

  async generateInvoiceNumber(): Promise<string> {
    const result = await db.query(`
      SELECT invoice_number FROM invoices 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return 'INV-10001';
    }
    
    const lastNumber = parseInt(result.rows[0].invoice_number.split('-')[1]);
    return `INV-${(lastNumber + 1).toString().padStart(5, '0')}`;
  },

  // Line item queries
  async createLineItems(items: Omit<InvoiceLineItem, 'id'>[]): Promise<void> {
    const values = items.map((item, idx) => 
      `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`
    ).join(', ');
    
    const params = items.flatMap(item => [
      item.invoiceId, item.description, item.itemType, item.quantity, item.unitPrice, item.amount
    ]);

    await db.query(`
      INSERT INTO invoice_line_items (invoice_id, description, item_type, quantity, unit_price, amount)
      VALUES ${values}
    `, params);
  },

  async getLineItemsByInvoice(invoiceId: string): Promise<InvoiceLineItem[]> {
    const result = await db.query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1',
      [invoiceId]
    );
    return result.rows.map(this.mapToLineItem);
  },

  // Payment method queries
  async getDefaultPaymentMethod(customerId: string): Promise<PaymentMethod | null> {
    const result = await db.query(
      'SELECT * FROM payment_methods WHERE customer_id = $1 AND is_default = true',
      [customerId]
    );
    return result.rows[0] ? this.mapToPaymentMethod(result.rows[0]) : null;
  },

  async createPaymentMethod(paymentMethod: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
    const result = await db.query(`
      INSERT INTO payment_methods (customer_id, type, is_default, last4, expiry_month, expiry_year, stripe_payment_method_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [paymentMethod.customerId, paymentMethod.type, paymentMethod.isDefault, 
        paymentMethod.last4, paymentMethod.expiryMonth, paymentMethod.expiryYear, 
        paymentMethod.stripePaymentMethodId]);
    return this.mapToPaymentMethod(result.rows[0]);
  },

  async getPaymentMethodsByCustomer(customerId: string): Promise<PaymentMethod[]> {
    const result = await db.query(
      'SELECT * FROM payment_methods WHERE customer_id = $1',
      [customerId]
    );
    return result.rows.map(this.mapToPaymentMethod);
  },

  // Container usage queries
  async getContainerUsageDays(containerId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.query(`
      SELECT COUNT(DISTINCT DATE(created_at)) as usage_days
      FROM container_events
      WHERE container_id = $1
      AND created_at BETWEEN $2 AND $3
    `, [containerId, startDate, endDate]);
    
    return parseInt(result.rows[0]?.usage_days || '0');
  },

  async flagContainer(containerId: string, reason: string): Promise<void> {
    await db.query(`
      UPDATE containers 
      SET status = 'flagged', 
          notes = COALESCE(notes || E'\n', '') || $2,
          updated_at = NOW()
      WHERE id = $1
    `, [containerId, `Flagged: ${reason} at ${new Date().toISOString()}`]);
  },

  // Payment transaction queries
  async createPaymentTransaction(transaction: {
    invoiceId: string;
    paymentMethodId: string;
    amount: number;
    status: string;
    transactionId?: string;
    errorMessage?: string;
  }): Promise<void> {
    await db.query(`
      INSERT INTO payment_transactions (invoice_id, payment_method_id, amount, status, transaction_id, error_message)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [transaction.invoiceId, transaction.paymentMethodId, transaction.amount, 
        transaction.status, transaction.transactionId, transaction.errorMessage]);
  },

  // Mappers
  mapToContract(row: any): Contract {
    return {
      id: row.id,
      customerId: row.customer_id,
      containerId: row.container_id,
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      monthlyRate: parseFloat(row.monthly_rate),
      overageRatePerDay: parseFloat(row.overage_rate_per_day),
      allowedDays: row.allowed_days,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },

  mapToInvoice(row: any): Invoice {
    return {
      id: row.id,
      customerId: row.customer_id,
      contractId: row.contract_id,
      invoiceNumber: row.invoice_number,
      invoiceDate: new Date(row.invoice_date),
      dueDate: new Date(row.due_date),
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      total: parseFloat(row.total),
      status: row.status,
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  },

  mapToLineItem(row: any): InvoiceLineItem {
    return {
      id: row.id,
      invoiceId: row.invoice_id,
      description: row.description,
      itemType: row.item_type,
      quantity: parseFloat(row.quantity),
      unitPrice: parseFloat(row.unit_price),
      amount: parseFloat(row.amount),
    };
  },

  mapToPaymentMethod(row: any): PaymentMethod {
    return {
      id: row.id,
      customerId: row.customer_id,
      type: row.type,
      isDefault: row.is_default,
      last4: row.last4,
      expiryMonth: row.expiry_month,
      expiryYear: row.expiry_year,
      stripePaymentMethodId: row.stripe_payment_method_id,
    };
  },
};
