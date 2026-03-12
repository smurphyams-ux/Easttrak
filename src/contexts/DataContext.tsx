import React, { createContext, useContext, useState, useEffect } from 'react';

// Interfaces
interface Invoice {
  id: string;
  customerName: string;
  serviceAddress: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
  date: string;
  dueDate: string;
  items: { description: string; quantity: number; rate: number; amount: number }[];
  notes: string;
}

interface Vehicle {
  id: string;
  type: string;
  driver: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  licensePlate: string;
  year: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'Active' | 'Inactive';
  accountBalance: number;
}

interface DataContextType {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  vehicles: Vehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  getStats: () => {
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalRevenue: number;
    monthlyRevenue: number;
    activeVehicles: number;
    totalVehicles: number;
    maintenanceVehicles: number;
    activeCustomers: number;
    totalCustomers: number;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedInvoices = localStorage.getItem('invoices');
    const savedVehicles = localStorage.getItem('vehicles');
    const savedCustomers = localStorage.getItem('customers');

    if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
    if (savedVehicles) setVehicles(JSON.parse(savedVehicles));
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

  const getStats = () => {
    // Invoice stats
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue').length;
    
    // Revenue calculation
    const totalRevenue = invoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    // Monthly revenue (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = invoices
      .filter(inv => {
        const invDate = new Date(inv.date);
        return inv.status === 'Paid' && 
               invDate.getMonth() === currentMonth && 
               invDate.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Vehicle stats
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === 'Active').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'Maintenance').length;

    // Customer stats
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'Active').length;

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalRevenue,
      monthlyRevenue,
      activeVehicles,
      totalVehicles,
      maintenanceVehicles,
      activeCustomers,
      totalCustomers,
    };
  };

  return (
    <DataContext.Provider value={{
      invoices,
      setInvoices,
      vehicles,
      setVehicles,
      customers,
      setCustomers,
      getStats,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
