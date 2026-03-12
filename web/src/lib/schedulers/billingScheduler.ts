import { BillingEngine } from '../../services/billingEngine';

export class BillingScheduler {
  private engine: BillingEngine;
  private isRunning: boolean = false;

  constructor() {
    this.engine = new BillingEngine();
  }

  /**
   * Start the daily billing scheduler
   */
  start(): void {
    console.log('Starting billing scheduler...');
    
    // Run at 2 AM daily
    this.scheduleDaily('02:00', () => this.runBilling());
  }

  private async runBilling(): Promise<void> {
    if (this.isRunning) {
      console.log('Billing already running, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      await this.engine.runDailyBilling();
      console.log('Billing completed successfully');
    } catch (error) {
      console.error('Billing failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private scheduleDaily(time: string, callback: () => void): void {
    const [hours, minutes] = time.split(':').map(Number);
    
    const schedule = () => {
      const now = new Date();
      const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      
      if (now > scheduledTime) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
      
      const timeUntilRun = scheduledTime.getTime() - now.getTime();
      
      setTimeout(() => {
        callback();
        schedule(); // Reschedule for next day
      }, timeUntilRun);
    };
    
    schedule();
  }
}

// Export singleton instance
export const billingScheduler = new BillingScheduler();
