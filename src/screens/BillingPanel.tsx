import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DataPanel.css';

interface Container {
  id: string;
  type: string;
  customerId: string;
  customerName: string;
  assignedDate: string;
  status: 'active' | 'suspended' | 'returned';
}

interface Contract {
  id: string;
  customerId: string;
  customerName: string;
  containerId: string;
  containerType: string;
  monthlyRate: number;
  dailyOverageRate: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'suspended' | 'completed';
  autoCharge: boolean;
}

interface BillingCharge {
  id: string;
  contractId: string;
  customerId: string;
  customerName: string;
  type: 'monthly_rental' | 'daily_overage' | 'damage_fee' | 'missed_pickup';
  amount: number;
  date: string;
  description: string;
  invoiced: boolean;
}

export default function BillingPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'contracts' | 'charges' | 'containers'>('contracts');
  const [showContractModal, setShowContractModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  
  // Load data from localStorage
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const saved = localStorage.getItem('contracts');
    return saved ? JSON.parse(saved) : [];
  });

  const [charges, setCharges] = useState<BillingCharge[]>(() => {
    const saved = localStorage.getItem('billingCharges');
    return saved ? JSON.parse(saved) : [];
  });

  const [containers, setContainers] = useState<Container[]>(() => {
    const saved = localStorage.getItem('assignedContainers');
    return saved ? JSON.parse(saved) : [];
  });

  const [newContract, setNewContract] = useState({
    customerId: '',
    customerName: '',
    containerId: '',
    containerType: '',
    monthlyRate: 0,
    dailyOverageRate: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    autoCharge: true
  });

  const [newCharge, setNewCharge] = useState({
    contractId: '',
    type: 'damage_fee' as 'monthly_rental' | 'daily_overage' | 'damage_fee' | 'missed_pickup',
    amount: 0,
    description: ''
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('contracts', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem('billingCharges', JSON.stringify(charges));
  }, [charges]);

  useEffect(() => {
    localStorage.setItem('assignedContainers', JSON.stringify(containers));
  }, [containers]);

  // Billing automation - runs daily
  useEffect(() => {
    const runBillingEngine = () => {
      const today = new Date().toISOString().split('T')[0];
      const newCharges: BillingCharge[] = [];

      contracts.forEach(contract => {
        if (contract.status !== 'active') return;

        // Check if it's the 1st of the month for monthly rental
        const todayDate = new Date();
        if (todayDate.getDate() === 1) {
          // Check if already charged this month
          const alreadyCharged = charges.some(
            c => c.contractId === contract.id && 
            c.type === 'monthly_rental' && 
            c.date.startsWith(today.slice(0, 7)) // Same year-month
          );

          if (!alreadyCharged) {
            newCharges.push({
              id: `CHG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              contractId: contract.id,
              customerId: contract.customerId,
              customerName: contract.customerName,
              type: 'monthly_rental',
              amount: contract.monthlyRate,
              date: today,
              description: `Monthly rental for ${contract.containerType}`,
              invoiced: false
            });
          }
        }
      });

      if (newCharges.length > 0) {
        setCharges(prev => [...prev, ...newCharges]);
      }
    };

    // Run immediately and then daily
    runBillingEngine();
    const interval = setInterval(runBillingEngine, 24 * 60 * 60 * 1000); // Daily

    return () => clearInterval(interval);
  }, [contracts, charges]);

  const handleAddContract = () => {
    if (!newContract.customerId || !newContract.containerId || !newContract.monthlyRate) {
      alert('Please fill in all required fields');
      return;
    }

    const contract: Contract = {
      id: `CNT-${String(contracts.length + 1).padStart(4, '0')}`,
      customerId: newContract.customerId,
      customerName: newContract.customerName,
      containerId: newContract.containerId,
      containerType: newContract.containerType,
      monthlyRate: newContract.monthlyRate,
      dailyOverageRate: newContract.dailyOverageRate,
      startDate: newContract.startDate,
      endDate: newContract.endDate,
      status: 'active',
      autoCharge: newContract.autoCharge
    };

    setContracts([...contracts, contract]);
    
    // Update container status
    const container: Container = {
      id: newContract.containerId,
      type: newContract.containerType,
      customerId: newContract.customerId,
      customerName: newContract.customerName,
      assignedDate: newContract.startDate,
      status: 'active'
    };
    setContainers(prev => [...prev, container]);

    setShowContractModal(false);
    resetContractForm();
  };

  const handleSaveEdit = () => {
    if (!newContract.customerId || !newContract.containerId || !newContract.monthlyRate) {
      alert('Please fill in all required fields');
      return;
    }

    const updatedContracts = contracts.map(c =>
      c.id === editingContract?.id
        ? {
            ...c,
            customerId: newContract.customerId,
            customerName: newContract.customerName,
            containerId: newContract.containerId,
            containerType: newContract.containerType,
            monthlyRate: newContract.monthlyRate,
            dailyOverageRate: newContract.dailyOverageRate,
            startDate: newContract.startDate,
            endDate: newContract.endDate,
            autoCharge: newContract.autoCharge
          }
        : c
    );

    setContracts(updatedContracts);
    setShowContractModal(false);
    setEditingContract(null);
    resetContractForm();
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setNewContract({
      customerId: contract.customerId,
      customerName: contract.customerName,
      containerId: contract.containerId,
      containerType: contract.containerType,
      monthlyRate: contract.monthlyRate,
      dailyOverageRate: contract.dailyOverageRate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      autoCharge: contract.autoCharge
    });
    setShowContractModal(true);
  };

  const handleSuspendContract = (contractId: string) => {
    if (window.confirm('Are you sure you want to suspend this contract?')) {
      setContracts(contracts.map(c =>
        c.id === contractId ? { ...c, status: 'suspended' } : c
      ));
      
      // Flag container
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
        setContainers(containers.map(cont =>
          cont.id === contract.containerId ? { ...cont, status: 'suspended' } : cont
        ));
      }
    }
  };

  const handleActivateContract = (contractId: string) => {
    setContracts(contracts.map(c =>
      c.id === contractId ? { ...c, status: 'active' } : c
    ));
    
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      setContainers(containers.map(cont =>
        cont.id === contract.containerId ? { ...cont, status: 'active' } : cont
      ));
    }
  };

  const handleAddCharge = () => {
    if (!newCharge.contractId || !newCharge.amount) {
      alert('Please fill in all required fields');
      return;
    }

    const contract = contracts.find(c => c.id === newCharge.contractId);
    if (!contract) {
      alert('Contract not found');
      return;
    }

    const charge: BillingCharge = {
      id: `CHG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId: newCharge.contractId,
      customerId: contract.customerId,
      customerName: contract.customerName,
      type: newCharge.type,
      amount: newCharge.amount,
      date: new Date().toISOString().split('T')[0],
      description: newCharge.description || `${newCharge.type.replace(/_/g, ' ')}`,
      invoiced: false
    };

    setCharges([...charges, charge]);
    setShowChargeModal(false);
    setNewCharge({
      contractId: '',
      type: 'damage_fee',
      amount: 0,
      description: ''
    });
  };

  const handleGenerateInvoices = () => {
    const uninvoicedCharges = charges.filter(c => !c.invoiced);
    
    if (uninvoicedCharges.length === 0) {
      alert('No uninvoiced charges to process');
      return;
    }

    // Group charges by customer
    const chargesByCustomer = uninvoicedCharges.reduce((acc, charge) => {
      if (!acc[charge.customerId]) {
        acc[charge.customerId] = [];
      }
      acc[charge.customerId].push(charge);
      return acc;
    }, {} as Record<string, BillingCharge[]>);

    // Load existing invoices
    const existingInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const newInvoices: any[] = [];

    Object.entries(chargesByCustomer).forEach(([customerId, customerCharges]) => {
      const totalAmount = customerCharges.reduce((sum, c) => sum + c.amount, 0);
      const customer = customerCharges[0];

      const invoice = {
        id: `INV-${String(existingInvoices.length + newInvoices.length + 1).padStart(3, '0')}`,
        customerName: customer.customerName,
        serviceAddress: 'Auto-generated from billing',
        amount: totalAmount,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: customerCharges.map(c => ({
          description: c.description,
          quantity: 1,
          rate: c.amount,
          amount: c.amount
        })),
        notes: 'Auto-generated from billing automation'
      };

      newInvoices.push(invoice);
    });

    // Save invoices
    localStorage.setItem('invoices', JSON.stringify([...existingInvoices, ...newInvoices]));

    // Mark charges as invoiced
    setCharges(charges.map(c =>
      uninvoicedCharges.find(uc => uc.id === c.id) ? { ...c, invoiced: true } : c
    ));

    alert(`Generated ${newInvoices.length} invoices successfully!`);
  };

  const handleAutoCharge = () => {
    const pendingInvoices = JSON.parse(localStorage.getItem('invoices') || '[]')
      .filter((inv: any) => inv.status === 'pending');

    if (pendingInvoices.length === 0) {
      alert('No pending invoices to process');
      return;
    }

    // Simulate payment processing
    const processedCount = pendingInvoices.filter((inv: any) => {
      const contract = contracts.find(c => c.customerName === inv.customerName && c.autoCharge);
      return contract !== null;
    }).length;

    // Update invoices to paid
    const allInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const updatedInvoices = allInvoices.map((inv: any) => {
      const contract = contracts.find(c => c.customerName === inv.customerName && c.autoCharge);
      if (inv.status === 'pending' && contract) {
        return { ...inv, status: 'paid' };
      }
      return inv;
    });

    localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
    alert(`Auto-charged ${processedCount} invoices successfully!`);
  };

  const resetContractForm = () => {
    setNewContract({
      customerId: '',
      customerName: '',
      containerId: '',
      containerType: '',
      monthlyRate: 0,
      dailyOverageRate: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      autoCharge: true
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="data-panel">
      <header className="panel-header">
        <div className="header-left">
          <img src="/EZTrakLogo-fancy.svg" alt="EZTrak Logo" style={{ width: 140, height: 35, marginBottom: 8 }} />
          <button onClick={() => navigate('/dashboard')} className="back-btn">← Back</button>
          <h1>💰 Billing Automation</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleGenerateInvoices} className="btn-success">Generate Invoices</button>
          <button onClick={handleAutoCharge} className="btn-primary">Auto-Charge Pending</button>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Active Contracts</div>
          <div className="stat-value text-success">{contracts.filter(c => c.status === 'active').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Suspended</div>
          <div className="stat-value text-danger">{contracts.filter(c => c.status === 'suspended').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Uninvoiced Charges</div>
          <div className="stat-value text-warning">{charges.filter(c => !c.invoiced).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Pending</div>
          <div className="stat-value">{formatCurrency(charges.filter(c => !c.invoiced).reduce((sum, c) => sum + c.amount, 0))}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--gray-200)' }}>
        <button
          onClick={() => setActiveTab('contracts')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'contracts' ? '3px solid var(--primary)' : 'none',
            color: activeTab === 'contracts' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: activeTab === 'contracts' ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          Contracts ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('charges')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'charges' ? '3px solid var(--primary)' : 'none',
            color: activeTab === 'charges' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: activeTab === 'charges' ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          Billing Charges ({charges.length})
        </button>
        <button
          onClick={() => setActiveTab('containers')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'containers' ? '3px solid var(--primary)' : 'none',
            color: activeTab === 'containers' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: activeTab === 'containers' ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          Assigned Containers ({containers.length})
        </button>
      </div>

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={() => setShowContractModal(true)} className="btn-primary">+ New Contract</button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract ID</th>
                  <th>Customer</th>
                  <th>Container</th>
                  <th>Monthly Rate</th>
                  <th>Overage Rate</th>
                  <th>Start Date</th>
                  <th>Status</th>
                  <th>Auto-Charge</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(contract => (
                  <tr key={contract.id}>
                    <td className="fw-bold">{contract.id}</td>
                    <td>{contract.customerName}</td>
                    <td>{contract.containerType}</td>
                    <td>{formatCurrency(contract.monthlyRate)}</td>
                    <td>{formatCurrency(contract.dailyOverageRate)}/day</td>
                    <td>{contract.startDate}</td>
                    <td>
                      <span className={`badge badge-${
                        contract.status === 'active' ? 'success' :
                        contract.status === 'suspended' ? 'danger' : 'secondary'
                      }`}>
                        {contract.status}
                      </span>
                    </td>
                    <td>{contract.autoCharge ? '✓ Yes' : '✗ No'}</td>
                    <td>
                      <button
                        className="btn-sm btn-primary"
                        onClick={() => handleEditContract(contract)}
                        style={{ marginRight: '0.5rem' }}
                      >
                        Edit
                      </button>
                      {contract.status === 'active' ? (
                        <button
                          className="btn-sm btn-warning"
                          onClick={() => handleSuspendContract(contract.id)}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          className="btn-sm btn-success"
                          onClick={() => handleActivateContract(contract.id)}
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Charges Tab */}
      {activeTab === 'charges' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={() => setShowChargeModal(true)} className="btn-primary">+ Add Charge</button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Invoiced</th>
                </tr>
              </thead>
              <tbody>
                {charges.map(charge => (
                  <tr key={charge.id}>
                    <td>{charge.date}</td>
                    <td>{charge.customerName}</td>
                    <td>
                      <span className={`badge badge-${
                        charge.type === 'monthly_rental' ? 'primary' :
                        charge.type === 'daily_overage' ? 'warning' :
                        charge.type === 'damage_fee' ? 'danger' : 'info'
                      }`}>
                        {charge.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{charge.description}</td>
                    <td className="fw-bold">{formatCurrency(charge.amount)}</td>
                    <td>
                      {charge.invoiced ? (
                        <span className="text-success">✓ Invoiced</span>
                      ) : (
                        <span className="text-warning">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Containers Tab */}
      {activeTab === 'containers' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Container ID</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Assigned Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {containers.map(container => (
                <tr key={container.id}>
                  <td className="fw-bold">{container.id}</td>
                  <td>{container.type}</td>
                  <td>{container.customerName}</td>
                  <td>{container.assignedDate}</td>
                  <td>
                    <span className={`badge badge-${
                      container.status === 'active' ? 'success' :
                      container.status === 'suspended' ? 'danger' : 'secondary'
                    }`}>
                      {container.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contract Modal */}
      {showContractModal && (
        <div className="modal-overlay" onClick={() => { setShowContractModal(false); setEditingContract(null); resetContractForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingContract ? 'Edit Contract' : 'New Contract'}</h2>
              <button className="modal-close" onClick={() => { setShowContractModal(false); setEditingContract(null); resetContractForm(); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Customer ID *</label>
                  <input
                    type="text"
                    value={newContract.customerId}
                    onChange={(e) => setNewContract({ ...newContract, customerId: e.target.value })}
                    placeholder="CUST-001"
                  />
                </div>
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    value={newContract.customerName}
                    onChange={(e) => setNewContract({ ...newContract, customerName: e.target.value })}
                    placeholder="ABC Company"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Container ID *</label>
                  <input
                    type="text"
                    value={newContract.containerId}
                    onChange={(e) => setNewContract({ ...newContract, containerId: e.target.value })}
                    placeholder="CNT-001"
                  />
                </div>
                <div className="form-group">
                  <label>Container Type *</label>
                  <select
                    value={newContract.containerType}
                    onChange={(e) => setNewContract({ ...newContract, containerType: e.target.value })}
                  >
                    <option value="">Select type</option>
                    <option value="DUMP 10 CYD">DUMP 10 CYD</option>
                    <option value="DUMP 20 CYD">DUMP 20 CYD</option>
                    <option value="DUMP 30 CYD">DUMP 30 CYD</option>
                    <option value="PULL-OUT 10 CYD">PULL-OUT 10 CYD</option>
                    <option value="PULL-OUT 20 CYD">PULL-OUT 20 CYD</option>
                    <option value="PULL-OUT-30 CYD">PULL-OUT-30 CYD</option>
                    <option value="ROLL-OFF 16 CYD">ROLL-OFF 16 CYD</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Monthly Rate *</label>
                  <input
                    type="number"
                    value={newContract.monthlyRate}
                    onChange={(e) => setNewContract({ ...newContract, monthlyRate: parseFloat(e.target.value) || 0 })}
                    placeholder="250.00"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Daily Overage Rate</label>
                  <input
                    type="number"
                    value={newContract.dailyOverageRate}
                    onChange={(e) => setNewContract({ ...newContract, dailyOverageRate: parseFloat(e.target.value) || 0 })}
                    placeholder="15.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={newContract.startDate}
                    onChange={(e) => setNewContract({ ...newContract, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date (optional)</label>
                  <input
                    type="date"
                    value={newContract.endDate}
                    onChange={(e) => setNewContract({ ...newContract, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newContract.autoCharge}
                    onChange={(e) => setNewContract({ ...newContract, autoCharge: e.target.checked })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Enable Auto-Charge
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => { setShowContractModal(false); setEditingContract(null); resetContractForm(); }} className="btn-secondary">
                Cancel
              </button>
              <button onClick={editingContract ? handleSaveEdit : handleAddContract} className="btn-primary">
                {editingContract ? 'Save Changes' : 'Create Contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charge Modal */}
      {showChargeModal && (
        <div className="modal-overlay" onClick={() => setShowChargeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Billing Charge</h2>
              <button className="modal-close" onClick={() => setShowChargeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Contract *</label>
                <select
                  value={newCharge.contractId}
                  onChange={(e) => setNewCharge({ ...newCharge, contractId: e.target.value })}
                >
                  <option value="">Select contract</option>
                  {contracts.filter(c => c.status === 'active').map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {contract.id} - {contract.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Charge Type *</label>
                <select
                  value={newCharge.type}
                  onChange={(e) => setNewCharge({ ...newCharge, type: e.target.value as any })}
                >
                  <option value="damage_fee">Damage Fee</option>
                  <option value="missed_pickup">Missed Pickup Fee</option>
                  <option value="daily_overage">Daily Overage</option>
                  <option value="monthly_rental">Monthly Rental (Manual)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  value={newCharge.amount}
                  onChange={(e) => setNewCharge({ ...newCharge, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newCharge.description}
                  onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
                  placeholder="Enter charge description"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowChargeModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddCharge} className="btn-primary">Add Charge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
