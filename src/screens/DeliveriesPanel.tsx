import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DataPanel.css';

const API_URL = 'http://localhost:3001/api';

interface Delivery {
  id?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryDate: string;
  deliveryTime?: string;
  dumpsterSize: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
  createdAt?: string;
}

export default function DeliveriesPanel() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'tomorrow'>('upcoming');
  const [newDelivery, setNewDelivery] = useState<Delivery>({
    customerName: '',
    customerPhone: '',
    address: '',
    deliveryDate: '',
    deliveryTime: '',
    dumpsterSize: '10 yard',
    status: 'scheduled',
    notes: ''
  });

  useEffect(() => {
    loadDeliveries();
    loadCustomers();
  }, []);

  const loadDeliveries = async () => {
    try {
      const response = await fetch(`${API_URL}/deliveries`);
      const data = await response.json();
      setDeliveries(data.deliveries || []);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      // Fallback to localStorage if server not available
      const localDeliveries = localStorage.getItem('deliveries');
      if (localDeliveries) {
        setDeliveries(JSON.parse(localDeliveries));
      }
    }
  };

  const loadCustomers = () => {
    const customersData = localStorage.getItem('customers');
    if (customersData) {
      setCustomers(JSON.parse(customersData));
    }
  };

  const handleAddDelivery = async () => {
    console.log('handleAddDelivery called', newDelivery);
    
    if (!newDelivery.customerName || !newDelivery.customerPhone || !newDelivery.address || !newDelivery.deliveryDate) {
      alert('Please fill in all required fields (Name, Phone, Address, Date)');
      console.log('Validation failed:', {
        customerName: newDelivery.customerName,
        customerPhone: newDelivery.customerPhone,
        address: newDelivery.address,
        deliveryDate: newDelivery.deliveryDate
      });
      return;
    }

    console.log('Validation passed, sending to API...');
    try {
      const response = await fetch(`${API_URL}/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery: newDelivery }),
      });
      const data = await response.json();

      if (data.success) {
        // Also create a route stop for this delivery
        const routeStops = JSON.parse(localStorage.getItem('routeStops') || '[]');
        const newRouteStop = {
          id: data.delivery.id,
          name: newDelivery.customerName,
          address: newDelivery.address,
          status: 'Scheduled',
          deliveryDate: newDelivery.deliveryDate,
          deliveryTime: newDelivery.deliveryTime,
          dumpsterSize: newDelivery.dumpsterSize,
          phone: newDelivery.customerPhone,
          notes: newDelivery.notes,
          lat: 42.2417, // Jackson, MI default - will be updated when geocoding is added
          lng: -84.4013
        };
        routeStops.push(newRouteStop);
        localStorage.setItem('routeStops', JSON.stringify(routeStops));

        await loadDeliveries();
        setShowModal(false);
        setNewDelivery({
          customerName: '',
          customerPhone: '',
          address: '',
          deliveryDate: '',
          deliveryTime: '',
          dumpsterSize: '10 yard',
          status: 'scheduled',
          notes: ''
        });
        alert('✅ Delivery scheduled and added to route!');
      }
    } catch (error) {
      console.error('Error adding delivery:', error);
      alert('Failed to add delivery. Make sure backend server is running.');
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this delivery?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/deliveries/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        // Also remove from route stops
        const routeStops = JSON.parse(localStorage.getItem('routeStops') || '[]');
        const updatedStops = routeStops.filter((stop: any) => stop.id !== id);
        localStorage.setItem('routeStops', JSON.stringify(updatedStops));

        await loadDeliveries();
      }
    } catch (error) {
      console.error('Error deleting delivery:', error);
      alert('Failed to delete delivery');
    }
  };

  const handleSendReminders = async () => {
    if (!window.confirm('Send reminder SMS to all customers with deliveries scheduled for tomorrow?')) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/reminders/send-tomorrow`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        alert(`✅ Reminders sent!\n\nSent: ${data.sent}\nFailed: ${data.failed}\nTotal: ${data.total}`);
        await loadDeliveries();
      } else {
        alert(`⚠️ ${data.error || 'Failed to send reminders'}`);
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('Failed to send reminders. Make sure:\n1. Backend server is running\n2. Twilio credentials are configured in server/.env');
    } finally {
      setSending(false);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setNewDelivery({
        ...newDelivery,
        customerName: customer.name,
        customerPhone: customer.phone,
        address: customer.address
      });
    }
  };

  const getFilteredDeliveries = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        return deliveries.filter(d => d.deliveryDate === today);
      case 'tomorrow':
        return deliveries.filter(d => d.deliveryDate === tomorrow);
      case 'upcoming':
        return deliveries.filter(d => d.deliveryDate >= today && d.status !== 'completed' && d.status !== 'cancelled');
      default:
        return deliveries;
    }
  };

  const filteredDeliveries = getFilteredDeliveries();
  const sortedDeliveries = [...filteredDeliveries].sort((a, b) => 
    new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime()
  );

  return (
    <div className="data-panel">
      <div className="panel-header">
        <button onClick={() => navigate('/dashboard')} className="btn-secondary btn-sm" style={{ marginRight: '1rem' }}>
          ← Back
        </button>
        <h2>Delivery Schedule</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleSendReminders} className="btn-primary btn-sm" disabled={sending}>
            {sending ? 'Sending...' : '📱 Send Tomorrow\'s Reminders'}
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            + Schedule Delivery
          </button>
        </div>
      </div>

      <div className="panel-content">
        {/* Filters */}
        <div className="filters-bar" style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setFilter('upcoming')}
            className={filter === 'upcoming' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('today')}
            className={filter === 'today' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            Today
          </button>
          <button
            onClick={() => setFilter('tomorrow')}
            className={filter === 'tomorrow' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            Tomorrow
          </button>
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            All
          </button>
        </div>

        {/* Info Box */}
        <div style={{ 
          background: '#e7f3ff', 
          border: '1px solid #007bff',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <p style={{ margin: 0, color: '#004085' }}>
            <strong>🤖 Automatic Reminders:</strong> SMS reminders automatically send every morning at 8:00 AM 
            for next day's deliveries. You can also manually send reminders using the button above.
          </p>
        </div>

        {/* Deliveries Table */}
        {sortedDeliveries.length === 0 ? (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚚</div>
            <h3>No Deliveries Scheduled</h3>
            <p style={{ color: '#6c757d', marginBottom: '2rem' }}>
              Schedule your first delivery to start sending automatic reminders
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Schedule Delivery
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Size</th>
                <th>Status</th>
                <th>Reminder</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDeliveries.map(delivery => (
                <tr key={delivery.id}>
                  <td>
                    <strong>{new Date(delivery.deliveryDate).toLocaleDateString()}</strong>
                  </td>
                  <td>{delivery.deliveryTime || '8AM-5PM'}</td>
                  <td>{delivery.customerName}</td>
                  <td>{delivery.customerPhone}</td>
                  <td style={{ maxWidth: '200px', fontSize: '0.9rem' }}>
                    {delivery.address}
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {delivery.dumpsterSize}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${
                      delivery.status === 'completed' ? 'success' :
                      delivery.status === 'confirmed' ? 'info' :
                      delivery.status === 'cancelled' ? 'danger' : 'warning'
                    }`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td>
                    {delivery.reminderSent ? (
                      <span style={{ color: '#28a745', fontSize: '0.85rem' }}>
                        ✓ Sent {new Date(delivery.reminderSentAt!).toLocaleString()}
                      </span>
                    ) : (
                      <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>Not sent</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => navigate('/route')}
                        className="btn-secondary btn-sm"
                        title="View on map"
                      >
                        🗺️ Map
                      </button>
                      <button
                        onClick={() => handleDeleteDelivery(delivery.id!)}
                        className="btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Delivery Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Schedule Delivery</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleAddDelivery(); }} style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Select Customer (Optional)
                  </label>
                  <select
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">-- Or enter manually below --</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newDelivery.customerName}
                    onChange={(e) => setNewDelivery({ ...newDelivery, customerName: e.target.value })}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Phone Number * (for SMS reminder)
                  </label>
                  <input
                    type="tel"
                    value={newDelivery.customerPhone}
                    onChange={(e) => setNewDelivery({ ...newDelivery, customerPhone: e.target.value })}
                    placeholder="(248) 555-1234"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    value={newDelivery.address}
                    onChange={(e) => setNewDelivery({ ...newDelivery, address: e.target.value })}
                    placeholder="123 Main St, City, MI"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Delivery Date *
                    </label>
                    <input
                      type="date"
                      value={newDelivery.deliveryDate}
                      onChange={(e) => setNewDelivery({ ...newDelivery, deliveryDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={newDelivery.deliveryTime}
                      onChange={(e) => setNewDelivery({ ...newDelivery, deliveryTime: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Dumpster Size *
                  </label>
                  <select
                    value={newDelivery.dumpsterSize}
                    onChange={(e) => setNewDelivery({ ...newDelivery, dumpsterSize: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="10 yard">10 yard</option>
                    <option value="15 yard">15 yard</option>
                    <option value="20 yard">20 yard</option>
                    <option value="30 yard">30 yard</option>
                    <option value="40 yard">40 yard</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={newDelivery.notes}
                    onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
                    placeholder="Special instructions..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn-primary" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      console.log('Button clicked!');
                      handleAddDelivery();
                    }}
                  >
                    Schedule Delivery
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
