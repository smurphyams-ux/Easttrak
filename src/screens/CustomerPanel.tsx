import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './DataPanel.css';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  accountType: 'commercial' | 'residential';
  monthlyRevenue: number;
  dumpsters: number;
}

export default function CustomerPanel() {
    // Removed clearing of localStorage customers to allow persistence
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'revenue'>('name');
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    accountType: 'commercial' as 'commercial' | 'residential',
    dumpsters: 0
  });

  useEffect(() => {
    // Only load customers from localStorage if present, otherwise start empty
    const savedCustomers = localStorage.getItem('customers');
    if (savedCustomers) {
      const parsedCustomers = JSON.parse(savedCustomers);
      setCustomers(parsedCustomers);
      setFilteredCustomers(parsedCustomers);
    } else {
      setCustomers([]);
      setFilteredCustomers([]);
    }
  }, []);

  // Save customers to localStorage whenever they change
  useEffect(() => {
    if (customers.length > 0) {
      localStorage.setItem('customers', JSON.stringify(customers));
    }
  }, [customers]);

  useEffect(() => {
    let filtered = customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      const matchesType = typeFilter === 'all' || customer.accountType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return b.monthlyRevenue - a.monthlyRevenue;
      }
    });

    setFilteredCustomers(filtered);
  }, [searchTerm, statusFilter, typeFilter, sortBy, customers]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert('Please fill in all required fields (except email)');
      return;
    }

    const customer: Customer = {
      id: Date.now().toString(),
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email,
      status: 'active',
      accountType: newCustomer.accountType,
      monthlyRevenue: 0,
      dumpsters: newCustomer.dumpsters
    };

    setCustomers([...customers, customer]);
    setNewCustomer({
      name: '',
      phone: '',
      email: '',
      accountType: 'commercial',
      dumpsters: 0
    });
    setShowModal(false);
  };

  return (
    <div className="data-panel">
      <header className="panel-header">
        <div className="header-left">
          <img src="/EZTrakLogo-fancy.svg" alt="EZTrak Logo" style={{ width: 140, height: 35, marginBottom: 8 }} />
          <button onClick={() => navigate('/dashboard')} className="back-btn">← Dashboard</button>
          <h1>Customer Management</h1>
        </div>
        <button onClick={handleLogout} className="btn-secondary">Logout</button>
      </header>

      <div className="panel-container">
        {/* Filters Bar */}
        <div className="filters-bar card fade-in">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
            <option value="all">All Types</option>
            <option value="commercial">Commercial</option>
            <option value="residential">Residential</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'revenue')} className="filter-select">
            <option value="name">Sort by Name</option>
            <option value="revenue">Sort by Revenue</option>
          </select>

          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Add Customer
          </button>
        </div>

        {/* Stats Summary */}
        <div className="summary-stats fade-in">
          <div className="summary-card">
            <h3>{filteredCustomers.length}</h3>
            <p>Total Customers</p>
          </div>
          <div className="summary-card">
            <h3>{filteredCustomers.filter(c => c.status === 'active').length}</h3>
            <p>Active</p>
          </div>
          <div className="summary-card">
            <h3>${filteredCustomers.reduce((sum, c) => sum + c.monthlyRevenue, 0).toLocaleString()}</h3>
            <p>Monthly Revenue</p>
          </div>
          <div className="summary-card">
            <h3>{filteredCustomers.reduce((sum, c) => sum + c.dumpsters, 0)}</h3>
            <p>Total Dumpsters</p>
          </div>
        </div>

        {/* Customer Table */}
        <div className="data-table-container card fade-in">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Dumpsters</th>
                <th>Monthly Revenue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.id}>
                  <td>
                    <div className="customer-info">
                      <strong>{customer.name}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <span>{customer.phone}</span>
                      <span className="text-muted">{customer.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${customer.accountType === 'commercial' ? 'primary' : 'secondary'}`}>
                      {customer.accountType}
                    </span>
                  </td>
                  <td>{customer.dumpsters}</td>
                  <td className="fw-bold">${customer.monthlyRevenue.toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${
                      customer.status === 'active' ? 'success' : 
                      customer.status === 'inactive' ? 'danger' : 'warning'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem' }}>View</button>
                      <button className="btn-primary" style={{ padding: '0.25rem 0.75rem' }}>Edit</button>
                      <button className="btn-danger" style={{ padding: '0.25rem 0.75rem' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="empty-state">
              <p>No customers found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Adding Customer */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Customer</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleAddCustomer(); }} style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Enter customer name"
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="(555) 123-4567"
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
                      Email
                    </label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      placeholder="email@example.com"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Account Type
                    </label>
                    <select
                      value={newCustomer.accountType}
                      onChange={(e) => setNewCustomer({ ...newCustomer, accountType: e.target.value as 'commercial' | 'residential' })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="commercial">Commercial</option>
                      <option value="residential">Residential</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Number of Dumpsters
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newCustomer.dumpsters}
                      onChange={(e) => setNewCustomer({ ...newCustomer, dumpsters: parseInt(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    Add Customer
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setShowModal(false)}
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
  );
}
