import { Contract, Invoice, InvoiceLineItem, BillingCalculation } from '../types/billing';
import { billingQueries } from '../lib/db/billingQueries';
import { PaymentProcessor } from './paymentProcessor';

export class BillingEngine {
  private paymentProcessor: PaymentProcessor;

  constructor() {
    this.paymentProcessor = new PaymentProcessor();
  }

  /**
   * Main daily billing process
   */
  async runDailyBilling(): Promise<void> {
    console.log('Starting daily billing run...');
    
    const activeContracts = await this.getActiveContracts();
    
    for (const contract of activeContracts) {
      try {
        await this.processContract(contract);
      } catch (error) {
        console.error(`Error processing contract ${contract.id}:`, error);
      }
    }
    
    await this.processOverdueInvoices();
  }

  /**
   * Process a single contract for billing
   */
  private async processContract(contract: Contract): Promise<void> {
    const calculation = await this.calculateCharges(contract);
    
    // Only create invoice if there are charges
    if (calculation.total > 0) {
      const invoice = await this.createInvoice(calculation);
      await this.attemptAutoCharge(invoice);
    }
  }

  /**
   * Calculate all charges for a contract
   */
  private async calculateCharges(contract: Contract): Promise<BillingCalculation> {
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const periodEnd = today;

    // Calculate monthly rental (pro-rated if needed)
    const monthlyRental = this.calculateMonthlyRental(contract, periodStart, periodEnd);

    // Calculate overage charges
    const { overageDays, overageAmount } = await this.calculateOverage(contract, periodStart, periodEnd);

    // Calculate damage fees
    const damageAmount = await this.calculateDamageFees(contract.containerId, periodStart, periodEnd);

    // Calculate missed pickup fees
    const missedPickupAmount = await this.calculateMissedPickupFees(contract.containerId, periodStart, periodEnd);

    return {
      contractId: contract.id,
      containerId: contract.containerId,
      customerId: contract.customerId,
      periodStart,
      periodEnd,
      monthlyRental,
      overageDays,
      overageAmount,
      damageAmount,
      missedPickupAmount,
      total: monthlyRental + overageAmount + damageAmount + missedPickupAmount,
    };
  }

  private calculateMonthlyRental(contract: Contract, periodStart: Date, periodEnd: Date): number {
    // Pro-rate if contract started mid-month
    const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
    const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return (contract.monthlyRate / daysInMonth) * daysInPeriod;
  }

  private async calculateOverage(contract: Contract, periodStart: Date, periodEnd: Date): Promise<{ overageDays: number; overageAmount: number }> {
    // Query container usage days
    const usageDays = await this.getContainerUsageDays(contract.containerId, periodStart, periodEnd);
    const overageDays = Math.max(0, usageDays - contract.allowedDays);
    const overageAmount = overageDays * contract.overageRatePerDay;
    
    return { overageDays, overageAmount };
  }

  private async calculateDamageFees(containerId: string, periodStart: Date, periodEnd: Date): Promise<number> {
    // Query damage reports and sum fees
    // TODO: Implement damage tracking integration
    return 0;
  }

  private async calculateMissedPickupFees(containerId: string, periodStart: Date, periodEnd: Date): Promise<number> {
    // Query missed pickups and calculate fees
    // TODO: Implement pickup tracking integration
    return 0;
  }

  /**
   * Create invoice from billing calculation
   */
  private async createInvoice(calculation: BillingCalculation): Promise<Invoice> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

    const invoice: Invoice = {
      id: this.generateId(),
      customerId: calculation.customerId,
      contractId: calculation.contractId,
      invoiceNumber: await this.generateInvoiceNumber(),
      invoiceDate: new Date(),
      dueDate,
      subtotal: calculation.total,
      tax: calculation.total * 0.08, // 8% tax example
      total: calculation.total * 1.08,
      status: 'pending',
      createdAt: new Date(),
    };

    // Save invoice
    await this.saveInvoice(invoice);

    // Create line items
    await this.createLineItems(invoice.id, calculation);

    return invoice;
  }

  private async createLineItems(invoiceId: string, calculation: BillingCalculation): Promise<void> {
    const lineItems: InvoiceLineItem[] = [];

    if (calculation.monthlyRental > 0) {
      lineItems.push({
        id: this.generateId(),
        invoiceId,
        description: 'Monthly Container Rental',
        itemType: 'rental',
        quantity: 1,
        unitPrice: calculation.monthlyRental,
        amount: calculation.monthlyRental,
      });
    }

    if (calculation.overageAmount > 0) {
      lineItems.push({
        id: this.generateId(),
        invoiceId,
        description: `Overage Fee (${calculation.overageDays} days)`,
        itemType: 'overage',
        quantity: calculation.overageDays,
        unitPrice: calculation.overageAmount / calculation.overageDays,
        amount: calculation.overageAmount,
      });
    }

    if (calculation.damageAmount > 0) {
      lineItems.push({
        id: this.generateId(),
        invoiceId,
        description: 'Container Damage Fee',
        itemType: 'damage',
        quantity: 1,
        unitPrice: calculation.damageAmount,
        amount: calculation.damageAmount,
      });
    }

    if (calculation.missedPickupAmount > 0) {
      lineItems.push({
        id: this.generateId(),
        invoiceId,
        description: 'Missed Pickup Fee',
        itemType: 'missed_pickup',
        quantity: 1,
        unitPrice: calculation.missedPickupAmount,
        amount: calculation.missedPickupAmount,
      });
    }

    await this.saveLineItems(lineItems);
  }

  /**
   * Attempt to auto-charge payment
   */
  private async attemptAutoCharge(invoice: Invoice): Promise<void> {
    try {
      const paymentMethod = await this.getDefaultPaymentMethod(invoice.customerId);
      
      if (!paymentMethod) {
        console.log(`No default payment method for customer ${invoice.customerId}`);
        return;
      }

      await this.processPayment(invoice, paymentMethod);
      
      // Update invoice status
      await this.updateInvoiceStatus(invoice.id, 'paid', new Date());
    } catch (error) {
      console.error(`Auto-charge failed for invoice ${invoice.id}:`, error);
    }
  }

  /**
   * Process overdue invoices and suspend service
   */
  private async processOverdueInvoices(): Promise<void> {
    const overdueInvoices = await this.getOverdueInvoices();
    
    for (const invoice of overdueInvoices) {
      await this.updateInvoiceStatus(invoice.id, 'overdue');
      await this.suspendService(invoice.contractId, invoice.containerId);
    }
  }

  private async suspendService(contractId: string, containerId: string): Promise<void> {
    // Update contract status
    await this.updateContractStatus(contractId, 'suspended');
    
    // Flag container
    await this.flagContainer(containerId, 'payment_overdue');
  }

  private async getActiveContracts(): Promise<Contract[]> {
    return billingQueries.getActiveContracts();
  }

  private async getContainerUsageDays(containerId: string, start: Date, end: Date): Promise<number> {
    return billingQueries.getContainerUsageDays(containerId, start, end);
  }

  private async saveInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    return billingQueries.createInvoice(invoice);
  }

  private async saveLineItems(items: Omit<InvoiceLineItem, 'id'>[]): Promise<void> {
    return billingQueries.createLineItems(items);
  }

  private async getDefaultPaymentMethod(customerId: string): Promise<any> {
    return billingQueries.getDefaultPaymentMethod(customerId);
  }

  private async processPayment(invoice: Invoice, paymentMethod: any): Promise<void> {
    const result = await this.paymentProcessor.processPayment(invoice, paymentMethod);
    
    await billingQueries.createPaymentTransaction({
      invoiceId: invoice.id,
      paymentMethodId: paymentMethod.id,
      amount: invoice.total,
      status: result.success ? 'success' : 'failed',
      transactionId: result.transactionId,
      errorMessage: result.error,
    });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  private async updateInvoiceStatus(invoiceId: string, status: string, paidAt?: Date): Promise<void> {
    return billingQueries.updateInvoiceStatus(invoiceId, status, paidAt);
  }

  private async getOverdueInvoices(): Promise<Invoice[]> {
    return billingQueries.getOverdueInvoices();
  }

  private async updateContractStatus(contractId: string, status: string): Promise<void> {
    return billingQueries.updateContractStatus(contractId, status);
  }

  private async flagContainer(containerId: string, reason: string): Promise<void> {
    return billingQueries.flagContainer(containerId, reason);
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private async generateInvoiceNumber(): Promise<string> {
    return billingQueries.generateInvoiceNumber();
  }
}
