import { Invoice, PaymentMethod } from '../types/billing';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export class PaymentProcessor {
  async processPayment(invoice: Invoice, paymentMethod: PaymentMethod): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(invoice.total * 100), // Convert to cents
        currency: 'usd',
        payment_method: paymentMethod.stripePaymentMethodId,
        confirm: true,
        description: `Invoice ${invoice.invoiceNumber}`,
        metadata: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
        },
      });

      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: paymentIntent.id,
      };
    } catch (error: any) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createCustomer(email: string, name: string): Promise<string> {
    const customer = await stripe.customers.create({
      email,
      name,
    });
    return customer.id;
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  async createSetupIntent(customerId: string): Promise<string> {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return setupIntent.client_secret!;
  }
}
