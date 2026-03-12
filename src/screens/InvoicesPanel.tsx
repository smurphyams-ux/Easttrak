import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api';
import './DataPanel.css';

interface Invoice {
  id: string;
  customerName: string;
  serviceAddress: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
  dueDate: string;
  items: Array<{ description: string; quantity: number; rate: number }>;
  notes: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  address: string;
}

export default function InvoicesPanel() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Load customers from localStorage (same as CustomerPanel)
  const [existingCustomers, setExistingCustomers] = useState<CustomerInfo[]>([]);

  // Predefined line items catalog
  const [lineItemsCatalog, setLineItemsCatalog] = useState<Array<{ description: string; rate: number }>>([]);
  const [showAddLineItemModal, setShowAddLineItemModal] = useState(false);
    
  useEffect(() => {
    // Load invoices from backend
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/invoices`)
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setInvoices(data.invoices.map((inv: any) => ({
            id: inv.invoiceNumber || inv.id,
            customerName: inv.customerId || inv.customerName,
            serviceAddress: inv.serviceAddress || '',
            amount: inv.total || inv.amount,
            status: inv.status,
            date: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : inv.date,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : inv.dueDate,
            items: inv.items || [],
            notes: inv.notes || ''
          })));
        } else {
          setError('Failed to load invoices from API.');
        }
      })
      .catch(err => {
        setError('Error loading invoices: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, []);
  const [newCatalogItem, setNewCatalogItem] = useState({ description: '', rate: 0 });

  useEffect(() => {
    // Load customers from localStorage
    const customersData = localStorage.getItem('customers');
    if (customersData) {
      const customers = JSON.parse(customersData);
      const customerInfo = customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        address: c.address
      }));
      setExistingCustomers(customerInfo);
    }

    // Load line items catalog from localStorage
    const catalogData = localStorage.getItem('lineItemsCatalog');
    if (catalogData) {
      setLineItemsCatalog(JSON.parse(catalogData));
    } else {
      // Initialize with common items
      const defaultCatalog = [
        { description: 'Dumpster Rental - 10 Yard', rate: 350 },
        { description: 'Dumpster Rental - 20 Yard', rate: 450 },
        { description: 'Dumpster Rental - 30 Yard', rate: 550 },
        { description: 'Dumpster Rental - 40 Yard', rate: 650 },
        { description: 'Weekly Service', rate: 125 },
        { description: 'Overage Fee', rate: 75 },
        { description: 'Additional Pickup', rate: 100 },
        { description: 'Late Fee', rate: 50 },
      ];
      setLineItemsCatalog(defaultCatalog);
      localStorage.setItem('lineItemsCatalog', JSON.stringify(defaultCatalog));
    }
  }, []);

  // Save catalog when it changes
  useEffect(() => {
    if (lineItemsCatalog.length > 0) {
      localStorage.setItem('lineItemsCatalog', JSON.stringify(lineItemsCatalog));
    }
  }, [lineItemsCatalog]);

  const handleAddToCatalog = () => {
    if (!newCatalogItem.description || newCatalogItem.rate <= 0) {
      alert('Please fill in all fields');
      return;
    }
    setLineItemsCatalog([...lineItemsCatalog, newCatalogItem]);
    setNewCatalogItem({ description: '', rate: 0 });
    setShowAddLineItemModal(false);
  };

  const handleSelectCatalogItem = (index: number, catalogItem: { description: string; rate: number }) => {
    updateLineItem(index, 'description', catalogItem.description);
    updateLineItem(index, 'rate', catalogItem.rate);
  };
  

  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    customerName: '',
    serviceAddress: '',
    propertyAddress: '',
    amount: '',
    status: 'pending' as 'pending' | 'paid' | 'overdue',
    dueDate: '',
    items: [{ description: '', quantity: 1, rate: 0 }],
    notes: ''
  });

  const handleCustomerSelect = (customerId: string) => {
    if (customerId === '') {
      // Clear customer info if "Select Customer" is chosen
      setNewInvoice({ ...newInvoice, customerId: '', customerName: '', serviceAddress: '', propertyAddress: '' });
      return;
    }
    
    const customer = existingCustomers.find(c => c.id === customerId);
    if (customer) {
      setNewInvoice({
        ...newInvoice,
        customerId: customerId,
        customerName: customer.name,
        serviceAddress: customer.address
      });
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.customerName || !newInvoice.amount) {
      alert('Please fill in all required fields');
      return;
    }

    const invoicePayload = {
      customerId: newInvoice.customerId,
      customerName: newInvoice.customerName,
      serviceAddress: newInvoice.serviceAddress,
      amount: parseFloat(newInvoice.amount),
      status: newInvoice.status,
      date: new Date().toISOString().split('T')[0],
      dueDate: newInvoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: newInvoice.notes
    };
    const lineItems = newInvoice.items.filter(item => item.description);

    try {
      const res = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: invoicePayload, lineItems })
      });
      const data = await res.json();
      if (data.success) {
        // Reload invoices from backend
        fetch(`${API_URL}/invoices`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setInvoices(data.invoices.map((inv: any) => ({
                id: inv.invoiceNumber || inv.id,
                customerName: inv.customerId || inv.customerName,
                serviceAddress: inv.serviceAddress || '',
                amount: inv.total || inv.amount,
                status: inv.status,
                date: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : inv.date,
                dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : inv.dueDate,
                items: inv.items || [],
                notes: inv.notes || ''
              })));
            }
          });
        setShowModal(false);
        setNewInvoice({
          customerId: '',
          customerName: '',
          serviceAddress: '',
          propertyAddress: '',
          amount: '',
          status: 'pending',
          dueDate: '',
          items: [{ description: '', quantity: 1, rate: 0 }],
          notes: ''
        });
      } else {
        alert('Failed to save invoice.');
      }
    } catch (err) {
      alert('Error saving invoice.');
    }
  };

  const addLineItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, rate: 0 }]
    });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate total amount
    const total = updatedItems.reduce((sum, item) => 
      sum + (item.quantity * item.rate), 0
    );
    
    setNewInvoice({
      ...newInvoice,
      items: updatedItems,
      amount: total.toFixed(2)
    });
  };

  const removeLineItem = (index: number) => {
    const updatedItems = newInvoice.items.filter((_, i) => i !== index);
    const total = updatedItems.reduce((sum, item) => 
      sum + (item.quantity * item.rate), 0
    );
    
    setNewInvoice({
      ...newInvoice,
      items: updatedItems,
      amount: total.toFixed(2)
    });
  };

  const handlePrint = () => {
    if (!viewInvoice) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${viewInvoice.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #4169B1; padding-bottom: 20px; }
          .invoice-logo img { width: 250px; }
          .invoice-company-info { text-align: right; font-size: 12px; line-height: 1.5; }
          .invoice-details-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .invoice-meta h2 { font-size: 32px; color: #4169B1; margin-bottom: 10px; }
          .invoice-number { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
          .invoice-dates div { margin: 8px 0; }
          .invoice-customer { background: #f5f5f5; padding: 15px; border-radius: 5px; }
          .invoice-customer h3 { font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 10px; }
          .invoice-customer div { margin: 5px 0; }
          .invoice-items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          .invoice-items-table thead { background: #4169B1; color: white; }
          .invoice-items-table th, .invoice-items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          .invoice-items-table tfoot { background: #f5f5f5; }
          .invoice-total td { padding: 15px 12px; font-size: 18px; font-weight: bold; border-top: 2px solid #666; border-bottom: 2px solid #666; }
          .badge { padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
          .badge-success { background: #d4edda; color: #155724; }
          .badge-warning { background: #fff3cd; color: #856404; }
          .badge-danger { background: #f8d7da; color: #721c24; }
          .invoice-notes { background: #fff9e6; padding: 15px; border-left: 4px solid #ffc107; margin: 30px 0; }
          .invoice-notes h3 { font-size: 14px; margin-bottom: 8px; }
          .invoice-terms { margin-top: 30px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; font-size: 11px; line-height: 1.6; }
          .invoice-terms p { margin: 8px 0; }
          .signature-line { margin-top: 30px; padding-top: 15px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="invoice-logo">
            <img src="/images/logo.svg" alt="TrashGoAway.com" />
          </div>
          <div class="invoice-company-info">
            <p>TrashGoAway.com</p>
            <p>2466 Emmons Rd.</p>
            <p>Jackson, MI 49201</p>
            <p>248-388-1000</p>
            <p>www.trashgoaway.com</p>
          </div>
        </div>
        
        <div class="invoice-details-section">
          <div class="invoice-meta">
            <h2>INVOICE</h2>
            <div class="invoice-number">#${viewInvoice.id}</div>
            <div class="invoice-dates">
              <div><strong>Date:</strong> ${viewInvoice.date}</div>
              <div><strong>Due Date:</strong> ${viewInvoice.dueDate}</div>
              <div><strong>Status:</strong> <span class="badge badge-${
                viewInvoice.status === 'paid' ? 'success' : 
                viewInvoice.status === 'pending' ? 'warning' : 
                'danger'
              }">${viewInvoice.status.charAt(0).toUpperCase() + viewInvoice.status.slice(1)}</span></div>
            </div>
          </div>
          <div class="invoice-customer">
            <h3>Bill To:</h3>
            <div><strong>${viewInvoice.customerName}</strong></div>
            <div>Service Address:</div>
            <div>${viewInvoice.serviceAddress}</div>
          </div>
        </div>
        
        <table class="invoice-items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${viewInvoice.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">$${item.rate.toFixed(2)}</td>
                <td style="text-align: right;">$${(item.quantity * item.rate).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="invoice-total">
              <td colspan="3" style="text-align: right;"><strong>TOTAL:</strong></td>
              <td style="text-align: right;"><strong>$${viewInvoice.amount.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
        
        ${viewInvoice.notes ? `
          <div class="invoice-notes">
            <h3>Notes:</h3>
            <p>${viewInvoice.notes}</p>
          </div>
        ` : ''}
        
        <div class="invoice-terms">
          <p>All materials must be inside the trailer. Please do not fill up the trailer over the top of the trailer. By law we are required to tarp each load for transport. All materials that exceed the top of the trailer must be removed. We can not haul trailers that are too full. You will be responsible for removing excess and a $50.00 return trip fee will be charged to return and pick up trailer. ***Rate is for up to 7 days of use, $25 per day after 7 days or $135 per week.***</p>
          <p><strong>Note:</strong></p>
          <p>BATTERIES WILL ONLY BE ACCEPTED IF THEY ARE STACKED OUTSIDE OF THE TRAILER ON THE GROUND ITEMS NOT ACCEPTED:</p>
          <p><strong>ITEMS NOT ACCEPTED:</strong></p>
          <p>Animals • Flammable Liquids • Antifreeze • Hazardous Waste • Asbestos containing materials • Herbicides/Pesticides • Medical Waste • Bricks • Oil Filters • Oil of any kind • Cement • Paint • Gravel • Propane and Propane Tanks • Retaining Blocks • Railroad Ties • Compost • Solvents • Dirt • Radioactive Materials • Explosives • Stones/Rocks • Lead Containing materials</p>
          <p><strong>PLEASE DO NOT MOVE OR ATTEMPT TO MOVE THE TRAILER OR A $100.00 FEE WILL BE ASSESSED PLUS THE COST OF REPAIR OF ANY DAMAGES CAUSED.</strong></p>
          <div class="signature-line">
            <p>Signature: ______________________________________</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };


  const handleDeleteInvoice = (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(invoices.filter(inv => inv.id !== invoiceId));
      if (viewInvoice && viewInvoice.id === invoiceId) {
        setViewInvoice(null);
      }
    }
  };

  const handleStatusChange = (invoiceId: string, newStatus: 'paid' | 'pending' | 'overdue') => {
    const updatedInvoices = invoices.map(inv => 
      inv.id === invoiceId ? { ...inv, status: newStatus } : inv
    );
    setInvoices(updatedInvoices);
    
    // Update the viewed invoice if it's the one being changed
    if (viewInvoice && viewInvoice.id === invoiceId) {
      setViewInvoice({ ...viewInvoice, status: newStatus });
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading invoices...</div>;
  }
  if (error) {
    return <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>Error: {error}</div>;
  }

  return (
    <div className="data-panel">
      <header className="panel-header">
        <div className="header-left">
          <img src="/EZTrakLogo-fancy.svg" alt="EZTrak Logo" style={{ width: 140, height: 35, marginBottom: 8 }} />
          <button onClick={() => navigate('/dashboard')} className="back-btn">← Back</button>
          <h1>Invoices</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Create Invoice</button>
      </header>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paid</div>
          <div className="stat-value text-success">${paidAmount.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value text-warning">${pendingAmount.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue</div>
          <div className="stat-value text-danger">${overdueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          className="search-box"
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Invoice Date</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <tr key={invoice.id}>
                <td className="fw-bold">{invoice.id}</td>
                <td>{invoice.customerName}</td>
                <td className="fw-bold">${invoice.amount.toFixed(2)}</td>
                <td>
                  <span className={`badge badge-${
                    invoice.status === 'paid' ? 'success' : 
                    invoice.status === 'pending' ? 'warning' : 
                    'danger'
                  }`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </td>
                <td>{invoice.date}</td>
                <td>{invoice.dueDate}</td>
                <td>
                  <button className="btn-sm" onClick={() => setViewInvoice(invoice)}>View</button>
                  <button 
                    className="btn-sm btn-warning"
                    style={{ marginLeft: '0.5rem', color: '#fff' }}
                    onClick={() => {
                      setNewInvoice({
                        customerId: '',
                        customerName: invoice.customerName,
                        serviceAddress: invoice.serviceAddress,
                        propertyAddress: invoice.propertyAddress || '',
                        amount: invoice.amount.toString(),
                        status: invoice.status,
                        dueDate: invoice.dueDate,
                        items: invoice.items.map(item => ({ ...item })),
                        notes: invoice.notes || ''
                      });
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-sm btn-danger" 
                    onClick={() => handleDeleteInvoice(invoice.id)}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Invoice</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Customer *</label>
                <select
                  value={newInvoice.customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.95rem',
                    marginBottom: '1rem'
                  }}
                  required
                >
                  <option value="">-- Select a customer --</option>
                  {existingCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.address}
                    </option>
                  ))}
                </select>
                {existingCustomers.length === 0 && (
                  <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    No customers found. Please add customers in Customer Management first.
                  </p>
                )}
              </div>

              {newInvoice.customerName && (
                <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>
                    <strong>Customer:</strong> {newInvoice.customerName}<br/>
                    <strong>Address:</strong> {newInvoice.serviceAddress}
                  </p>
                </div>
              )}

              <div className="form-group">
                <label>Property Address</label>
                <input
                  type="text"
                  value={newInvoice.propertyAddress}
                  onChange={(e) => setNewInvoice({ ...newInvoice, propertyAddress: e.target.value })}
                  placeholder="Enter property address (if different from service address)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newInvoice.status}
                    onChange={(e) => setNewInvoice({ ...newInvoice, status: e.target.value as any })}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Line Items</label>
                  <button 
                    type="button"
                    onClick={() => setShowAddLineItemModal(true)}
                    className="btn-sm"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                  >
                    + Manage Catalog
                  </button>
                </div>
                {newInvoice.items.map((item, index) => (
                  <div key={index} className="line-item">
                    <select
                      onChange={(e) => {
                        const selectedItem = lineItemsCatalog.find(cat => cat.description === e.target.value);
                        if (selectedItem) {
                          handleSelectCatalogItem(index, selectedItem);
                        }
                      }}
                      style={{ flex: 0.8 }}
                    >
                      <option value="">Quick Select...</option>
                      {lineItemsCatalog.map((catalogItem, i) => (
                        <option key={i} value={catalogItem.description}>
                          {catalogItem.description} (${catalogItem.rate})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      style={{ flex: 2, marginLeft: '0.5rem' }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      style={{ width: '80px' }}
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      style={{ width: '100px' }}
                    />
                    <span style={{ minWidth: '80px', fontWeight: 'bold' }}>
                      ${(item.quantity * item.rate).toFixed(2)}
                    </span>
                    {newInvoice.items.length > 1 && (
                      <button 
                        onClick={() => removeLineItem(index)}
                        className="btn-danger btn-sm"
                        style={{ marginLeft: '8px' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addLineItem} className="btn-secondary" style={{ marginTop: '8px' }}>
                  + Add Line Item
                </button>
              </div>

              <div className="form-group">
                <label>Total Amount</label>
                <input
                  type="text"
                  value={`$${newInvoice.amount || '0.00'}`}
                  readOnly
                  style={{ fontWeight: 'bold', fontSize: '1.2em' }}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  placeholder="Add any additional notes or comments..."
                  rows={4}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: 'var(--border-radius)',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateInvoice} className="btn-primary">Create Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice View/Print Modal */}
      {viewInvoice && (
        <div className="modal-overlay" onClick={() => setViewInvoice(null)}>
          <div className="invoice-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h2>Invoice Details</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Status:</label>
                  <select
                    value={viewInvoice.status}
                    onChange={(e) => handleStatusChange(viewInvoice.id, e.target.value as any)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--gray-300)',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <button className="btn-primary" onClick={handlePrint}>🖨️ Print Invoice</button>
                <button className="modal-close" onClick={() => setViewInvoice(null)}>×</button>
              </div>
            </div>
            
            {/* Printable Invoice */}
            <div className="printable-invoice">
              {/* Header with Logo */}
              <div className="invoice-header">
                <div className="invoice-logo">
                  <img src="/images/logo.svg" alt="TrashGoAway.com" />
                </div>
                <div className="invoice-company-info">
                  <p>TrashGoAway.com</p>
                  <p>2466 Emmons Rd.</p>
                  <p>Jackson, MI 49201</p>
                  <p>248-388-1000</p>
                  <p>www.trashgoaway.com</p>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="invoice-details-section">
                <div className="invoice-meta">
                  <h2>INVOICE</h2>
                  <div className="invoice-number">#{viewInvoice.id}</div>
                  <div className="invoice-dates">
                    <div><strong>Date:</strong> {viewInvoice.date}</div>
                    <div><strong>Due Date:</strong> {viewInvoice.dueDate}</div>
                    <div>
                      <strong>Status:</strong>{' '}
                      <span className={`badge badge-${
                        viewInvoice.status === 'paid' ? 'success' : 
                        viewInvoice.status === 'pending' ? 'warning' : 
                        'danger'
                      }`}>
                        {viewInvoice.status.charAt(0).toUpperCase() + viewInvoice.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="invoice-customer">
                  <h3>Bill To:</h3>
                  <div><strong>{viewInvoice.customerName}</strong></div>
                  <div>Service Address:</div>
                  <div>{viewInvoice.serviceAddress}</div>
                </div>
              </div>

              {/* Line Items */}
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'center' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Rate</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoice.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>${item.rate.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>${(item.quantity * item.rate).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="invoice-total">
                    <td colSpan={3} style={{ textAlign: 'right' }}><strong>TOTAL:</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>${viewInvoice.amount.toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>

              {/* Notes */}
              {viewInvoice.notes && (
                <div className="invoice-notes">
                  <h3>Notes:</h3>
                  <p>{viewInvoice.notes}</p>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="invoice-terms">
                <p>All materials must be inside the trailer. Please do not fill up the trailer over the top of the trailer. By law we are required to tarp each load for transport. All materials that exceed the top of the trailer must be removed. We can not haul trailers that are too full. You will be responsible for removing excess and a $50.00 return trip fee will be charged to return and pick up trailer. ***Rate is for up to 7 days of use, $25 per day after 7 days or $135 per week.***</p>
                <p><strong>Note:</strong></p>
                <p>BATTERIES WILL ONLY BE ACCEPTED IF THEY ARE STACKED OUTSIDE OF THE TRAILER ON THE GROUND ITEMS NOT ACCEPTED:</p>
                <p><strong>ITEMS NOT ACCEPTED:</strong></p>
                <p>Animals • Flammable Liquids • Antifreeze • Hazardous Waste • Asbestos containing materials • Herbicides/Pesticides • Medical Waste • Bricks • Oil Filters • Oil of any kind • Cement • Paint • Gravel • Propane and Propane Tanks • Retaining Blocks • Railroad Ties • Compost • Solvents • Dirt • Radioactive Materials • Explosives • Stones/Rocks • Lead Containing materials</p>
                <p><strong>PLEASE DO NOT MOVE OR ATTEMPT TO MOVE THE TRAILER OR A $100.00 FEE WILL BE ASSESSED PLUS THE COST OF REPAIR OF ANY DAMAGES CAUSED.</strong></p>
                <div className="signature-line">
                  <p>Signature: ______________________________________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Line Items Catalog Modal */}
      {showAddLineItemModal && (
        <div className="modal-overlay" onClick={() => setShowAddLineItemModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Manage Line Items Catalog</h2>
            
            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Current Items:</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', padding: '0.5rem' }}>
                {lineItemsCatalog.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                    <span>{item.description}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold' }}>${item.rate}</span>
                      <button
                        onClick={() => setLineItemsCatalog(lineItemsCatalog.filter((_, i) => i !== index))}
                        className="btn-danger btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Add New Item:</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Description"
                  value={newCatalogItem.description}
                  onChange={(e) => setNewCatalogItem({ ...newCatalogItem, description: e.target.value })}
                  style={{ flex: 2, padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
                <input
                  type="number"
                  placeholder="Rate"
                  value={newCatalogItem.rate || ''}
                  onChange={(e) => setNewCatalogItem({ ...newCatalogItem, rate: parseFloat(e.target.value) || 0 })}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
                <button onClick={handleAddToCatalog} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                  Add
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowAddLineItemModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
