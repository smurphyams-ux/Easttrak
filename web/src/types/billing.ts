export interface Contract {
  id: string;
  customerId: string;
  containerId: string;
  startDate: Date;
  endDate?: Date;
  monthlyRate: number;
  overageRatePerDay: number;
  allowedDays: number;
  status: 'active' | 'suspended' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  customerId: string;
  contractId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'void';
  paidAt?: Date;
  createdAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  itemType: 'rental' | 'overage' | 'damage' | 'missed_pickup' | 'other';
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PaymentMethod {
  id: string;
  customerId: string;
  type: 'credit_card' | 'ach';
  isDefault: boolean;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  stripePaymentMethodId?: string;
}

export interface BillingCalculation {
  contractId: string;
  containerId: string;
  customerId: string;
  periodStart: Date;
  periodEnd: Date;
  monthlyRental: number;
  overageDays: number;
  overageAmount: number;
  damageAmount: number;
  missedPickupAmount: number;
  total: number;
}
