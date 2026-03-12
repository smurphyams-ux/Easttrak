import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DataPanel.css';

export default function ReportsPanel() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<'revenue' | 'customers' | 'overview' | 'profitloss'>('overview');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: 'fuel' as 'fuel' | 'maintenance' | 'labor' | 'supplies' | 'insurance' | 'other',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Load data from localStorage
    const customersData = localStorage.getItem('customers');
    const invoicesData = localStorage.getItem('invoices');
    const expensesData = localStorage.getItem('expenses');
    
    if (customersData) setCustomers(JSON.parse(customersData));
    if (invoicesData) setInvoices(JSON.parse(invoicesData));
    if (expensesData) setExpenses(JSON.parse(expensesData));
  }, []);

  // Save expenses to localStorage when they change
  useEffect(() => {
    if (expenses.length >= 0) {
      localStorage.setItem('expenses', JSON.stringify(expenses));
    }
  }, [expenses]);

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) {
      alert('Please fill in all required fields');
      return;
    }

    const expense = {
      id: Date.now().toString(),
      description: newExpense.description,
      category: newExpense.category,
      amount: parseFloat(newExpense.amount),
      date: newExpense.date
    };

    setExpenses([...expenses, expense]);
    setNewExpense({
      description: '',
      category: 'fuel',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowExpenseModal(false);
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  const calculateStats = () => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    const pendingRevenue = invoices.filter(i => i.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
    const overdueRevenue = invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);
    
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const totalCustomers = customers.length;
    const commercialCustomers = customers.filter(c => c.accountType === 'commercial').length;
    const residentialCustomers = customers.filter(c => c.accountType === 'residential').length;
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const expensesByCategory = {
      fuel: expenses.filter(e => e.category === 'fuel').reduce((sum, e) => sum + e.amount, 0),
      maintenance: expenses.filter(e => e.category === 'maintenance').reduce((sum, e) => sum + e.amount, 0),
      labor: expenses.filter(e => e.category === 'labor').reduce((sum, e) => sum + e.amount, 0),
      supplies: expenses.filter(e => e.category === 'supplies').reduce((sum, e) => sum + e.amount, 0),
      insurance: expenses.filter(e => e.category === 'insurance').reduce((sum, e) => sum + e.amount, 0),
      other: expenses.filter(e => e.category === 'other').reduce((sum, e) => sum + e.amount, 0)
    };
    const netProfit = paidRevenue - totalExpenses;
    
    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      overdueRevenue,
      activeCustomers,
      totalCustomers,
      commercialCustomers,
      residentialCustomers,
      totalExpenses,
      expensesByCategory,
      netProfit
    };
  };

  const stats = calculateStats();

  return (
    <div className="data-panel">
      <header className="panel-header">
        <div className="header-left">
          <img src="/EZTrakLogo-fancy.svg" alt="EZTrak Logo" style={{ width: 140, height: 35, marginBottom: 8 }} />
          <button onClick={() => navigate('/dashboard')} className="back-btn">← Dashboard</button>
          <h1>📊 Reports & Analytics</h1>
        </div>
      </header>

      <div className="panel-container">
        {/* Report Type Selection */}
        <div className="filters-bar card fade-in">
          <button 
            className={`btn-${selectedReport === 'overview' ? 'primary' : 'secondary'}`}
            onClick={() => setSelectedReport('overview')}
          >
            Overview
          </button>
          <button 
            className={`btn-${selectedReport === 'revenue' ? 'primary' : 'secondary'}`}
            onClick={() => setSelectedReport('revenue')}
          >
            Revenue Report
          </button>
          <button 
            className={`btn-${selectedReport === 'customers' ? 'primary' : 'secondary'}`}
            onClick={() => setSelectedReport('customers')}
          >
            Customer Report
          </button>
          <button 
            className={`btn-${selectedReport === 'profitloss' ? 'primary' : 'secondary'}`}
            onClick={() => setSelectedReport('profitloss')}
          >
            Profit & Loss
          </button>
        </div>

        {/* Overview Report */}
        {selectedReport === 'overview' && (
          <div className="fade-in">
            <div className="summary-stats">
              <div className="summary-card">
                <h3>${stats.totalRevenue.toLocaleString()}</h3>
                <p>Total Revenue</p>
              </div>
              <div className="summary-card">
                <h3>{stats.totalCustomers}</h3>
                <p>Total Customers</p>
              </div>
              <div className="summary-card">
                <h3>{invoices.length}</h3>
                <p>Total Invoices</p>
              </div>
              <div className="summary-card">
                <h3>{stats.activeCustomers}</h3>
                <p>Active Customers</p>
              </div>
            </div>

            <div className="data-table-container card" style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Quick Stats</h3>
              <table className="data-table">
                <tbody>
                  <tr>
                    <td><strong>Paid Invoices</strong></td>
                    <td className="fw-bold text-success">${stats.paidRevenue.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td><strong>Pending Invoices</strong></td>
                    <td className="fw-bold text-warning">${stats.pendingRevenue.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td><strong>Overdue Invoices</strong></td>
                    <td className="fw-bold text-danger">${stats.overdueRevenue.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td><strong>Commercial Customers</strong></td>
                    <td className="fw-bold">{stats.commercialCustomers}</td>
                  </tr>
                  <tr>
                    <td><strong>Residential Customers</strong></td>
                    <td className="fw-bold">{stats.residentialCustomers}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Revenue Report */}
        {selectedReport === 'revenue' && (
          <div className="fade-in">
            <div className="summary-stats">
              <div className="summary-card">
                <h3>${stats.paidRevenue.toLocaleString()}</h3>
                <p>Paid Revenue</p>
                <span className="badge badge-success">Collected</span>
              </div>
              <div className="summary-card">
                <h3>${stats.pendingRevenue.toLocaleString()}</h3>
                <p>Pending Revenue</p>
                <span className="badge badge-warning">Awaiting Payment</span>
              </div>
              <div className="summary-card">
                <h3>${stats.overdueRevenue.toLocaleString()}</h3>
                <p>Overdue Revenue</p>
                <span className="badge badge-danger">Action Required</span>
              </div>
              <div className="summary-card">
                <h3>{stats.paidRevenue > 0 ? ((stats.paidRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}%</h3>
                <p>Collection Rate</p>
              </div>
            </div>

            <div className="data-table-container card" style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Invoice Breakdown</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td className="fw-bold">{invoice.id}</td>
                      <td>{invoice.customerName}</td>
                      <td className="fw-bold">${invoice.amount.toFixed(2)}</td>
                      <td>
                        <span className={`badge badge-${
                          invoice.status === 'paid' ? 'success' : 
                          invoice.status === 'pending' ? 'warning' : 'danger'
                        }`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td>{invoice.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customer Report */}
        {selectedReport === 'customers' && (
          <div className="fade-in">
            <div className="summary-stats">
              <div className="summary-card">
                <h3>{stats.activeCustomers}</h3>
                <p>Active Customers</p>
                <span className="badge badge-success">Active</span>
              </div>
              <div className="summary-card">
                <h3>{stats.totalCustomers - stats.activeCustomers}</h3>
                <p>Inactive Customers</p>
              </div>
              <div className="summary-card">
                <h3>{stats.commercialCustomers}</h3>
                <p>Commercial</p>
              </div>
              <div className="summary-card">
                <h3>{stats.residentialCustomers}</h3>
                <p>Residential</p>
              </div>
            </div>

            <div className="data-table-container card" style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Customer List</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Dumpsters</th>
                    <th>Monthly Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.name}</strong><br/>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>{customer.address}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${customer.accountType === 'commercial' ? 'primary' : 'secondary'}`}>
                          {customer.accountType}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${
                          customer.status === 'active' ? 'success' : 
                          customer.status === 'inactive' ? 'danger' : 'warning'
                        }`}>
                          {customer.status}
                        </span>
                      </td>
                      <td>{customer.dumpsters}</td>
                      <td className="fw-bold">${customer.monthlyRevenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Profit & Loss Statement */}
        {selectedReport === 'profitloss' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
              <h2 style={{ marginBottom: '2rem', borderBottom: '2px solid #007bff', paddingBottom: '1rem' }}>
                Profit & Loss Statement
              </h2>
              
              {/* Revenue Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#28a745', marginBottom: '1rem' }}>Revenue</h3>
                <table className="data-table" style={{ marginBottom: '1rem' }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Paid Invoices</td>
                      <td style={{ textAlign: 'right', width: '200px' }}>${stats.paidRevenue.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Pending Invoices</td>
                      <td style={{ textAlign: 'right', color: '#ffc107' }}>${stats.pendingRevenue.toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #dee2e6' }}>
                      <td><strong>Total Revenue (Invoiced)</strong></td>
                      <td style={{ textAlign: 'right' }}><strong>${stats.totalRevenue.toLocaleString()}</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Collected Revenue</strong></td>
                      <td style={{ textAlign: 'right', color: '#28a745' }}><strong>${stats.paidRevenue.toLocaleString()}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Revenue by Customer Type */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem', color: '#666' }}>Revenue by Customer Type</h4>
                <table className="data-table">
                  <tbody>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Commercial Customers</td>
                      <td style={{ textAlign: 'right', width: '200px' }}>
                        ${customers
                          .filter(c => c.accountType === 'commercial')
                          .reduce((sum, c) => sum + c.monthlyRevenue, 0)
                          .toLocaleString()} / month
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Residential Customers</td>
                      <td style={{ textAlign: 'right' }}>
                        ${customers
                          .filter(c => c.accountType === 'residential')
                          .reduce((sum, c) => sum + c.monthlyRevenue, 0)
                          .toLocaleString()} / month
                      </td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #dee2e6' }}>
                      <td><strong>Monthly Recurring Revenue</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>${customers.reduce((sum, c) => sum + c.monthlyRevenue, 0).toLocaleString()} / month</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Expenses Section */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: '#dc3545', margin: 0 }}>Expenses</h3>
                  <button onClick={() => setShowExpenseModal(true)} className="btn-primary btn-sm">
                    + Add Expense
                  </button>
                </div>
                <table className="data-table" style={{ marginBottom: '1rem' }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Fuel</td>
                      <td style={{ textAlign: 'right', width: '200px' }}>${stats.expensesByCategory.fuel.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Maintenance</td>
                      <td style={{ textAlign: 'right' }}>${stats.expensesByCategory.maintenance.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Labor</td>
                      <td style={{ textAlign: 'right' }}>${stats.expensesByCategory.labor.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Supplies</td>
                      <td style={{ textAlign: 'right' }}>${stats.expensesByCategory.supplies.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Insurance</td>
                      <td style={{ textAlign: 'right' }}>${stats.expensesByCategory.insurance.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: '2rem' }}>Other</td>
                      <td style={{ textAlign: 'right' }}>${stats.expensesByCategory.other.toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #dee2e6' }}>
                      <td><strong>Total Expenses</strong></td>
                      <td style={{ textAlign: 'right' }}><strong>${stats.totalExpenses.toLocaleString()}</strong></td>
                    </tr>
                  </tbody>
                </table>

                {/* Recent Expenses */}
                {expenses.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#666' }}>Recent Expenses</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Category</th>
                          <th>Amount</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.slice(-10).reverse().map(expense => (
                          <tr key={expense.id}>
                            <td>{expense.date}</td>
                            <td>{expense.description}</td>
                            <td>
                              <span className="badge badge-secondary">
                                {expense.category}
                              </span>
                            </td>
                            <td className="fw-bold">${expense.amount.toFixed(2)}</td>
                            <td>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="btn-danger btn-sm"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div style={{ 
                background: '#f8f9fa', 
                padding: '1.5rem', 
                borderRadius: '8px',
                borderTop: '3px solid #007bff'
              }}>
                <table className="data-table">
                  <tbody>
                    <tr>
                      <td><strong style={{ fontSize: '1.1rem' }}>Total Revenue (Collected)</strong></td>
                      <td style={{ textAlign: 'right', width: '200px' }}>
                        <strong style={{ fontSize: '1.1rem', color: '#28a745' }}>
                          ${stats.paidRevenue.toLocaleString()}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td><strong style={{ fontSize: '1.1rem' }}>Total Expenses</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '1.1rem', color: '#dc3545' }}>${stats.totalExpenses.toLocaleString()}</strong>
                      </td>
                    </tr>
                    <tr style={{ borderTop: '3px solid #007bff' }}>
                      <td><strong style={{ fontSize: '1.2rem', color: stats.netProfit >= 0 ? '#28a745' : '#dc3545' }}>Net Profit</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '1.2rem', color: stats.netProfit >= 0 ? '#28a745' : '#dc3545' }}>
                          ${stats.netProfit.toLocaleString()}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                          Uncollected Revenue (Pending + Overdue)
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#ffc107' }}>
                          ${(stats.pendingRevenue + stats.overdueRevenue).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Add Expense Modal */}
        {showExpenseModal && (
          <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Add New Expense</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleAddExpense(); }} style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.95rem'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Category *
                    </label>
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="fuel">Fuel</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="labor">Labor</option>
                      <option value="supplies">Supplies</option>
                      <option value="insurance">Insurance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Description *
                    </label>
                    <input
                      type="text"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="Enter expense description"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.95rem'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.95rem'
                      }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                      Add Expense
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setShowExpenseModal(false)}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
