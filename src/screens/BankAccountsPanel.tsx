import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import './DataPanel.css';

const API_URL = 'http://localhost:3001/api';

interface BankAccount {
  account_id: string;
  name: string;
  official_name: string;
  type: string;
  subtype: string;
  balances: {
    available: number;
    current: number;
  };
}

interface Transaction {
  transaction_id: string;
  date: string;
  name: string;
  merchant_name: string;
  amount: number;
  category: string[];
  pending: boolean;
  account_id: string;
}

export default function BankAccountsPanel() {
  const navigate = useNavigate();
  const [linkToken, setLinkToken] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Check if backend server is running
  useEffect(() => {
    checkServerStatus();
    checkConnectionStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/plaid/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default-user' }),
      });
      const data = await response.json();
      
      if (data.connected) {
        setConnected(true);
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const createLinkToken = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/plaid/create_link_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default-user' }),
      });
      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (error) {
      console.error('Error creating link token:', error);
      alert('Failed to connect to backend server. Make sure it\'s running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  const onSuccess = async (public_token: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/plaid/exchange_public_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token, userId: 'default-user' }),
      });
      const data = await response.json();
      
      if (data.success) {
        setConnected(true);
        setAccounts(data.accounts);
        alert('Bank account connected successfully!');
      }
    } catch (error) {
      console.error('Error exchanging token:', error);
      alert('Failed to connect bank account');
    } finally {
      setLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const handleConnectBank = async () => {
    await createLinkToken();
    // Wait a moment for link token to be set
    setTimeout(() => {
      if (ready) {
        open();
      }
    }, 500);
  };

  const syncTransactions = async () => {
    setSyncing(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await fetch(`${API_URL}/plaid/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default-user',
          startDate,
          endDate,
        }),
      });
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      setLastSyncTime(new Date());
      
      // Auto-categorize and save transactions
      await categorizeTransactions(data.transactions);
      
      alert(`Synced ${data.transactions?.length || 0} transactions`);
    } catch (error) {
      console.error('Error syncing transactions:', error);
      alert('Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
  };

  const categorizeTransactions = async (transactions: Transaction[]) => {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    
    let newExpenses = [...expenses];
    let updatedInvoices = [...invoices];
    
    transactions.forEach(transaction => {
      // Negative amounts are expenses (money out)
      if (transaction.amount > 0) {
        // Check if it's a duplicate
        const isDuplicate = expenses.some((e: any) => 
          e.plaidId === transaction.transaction_id
        );
        
        if (!isDuplicate) {
          // Categorize based on merchant/category
          let category = 'other';
          const categories = transaction.category || [];
          
          if (categories.includes('Travel') || transaction.name.toLowerCase().includes('fuel')) {
            category = 'fuel';
          } else if (categories.includes('Service') || transaction.name.toLowerCase().includes('repair')) {
            category = 'maintenance';
          } else if (categories.includes('Shops')) {
            category = 'supplies';
          }
          
          newExpenses.push({
            id: `plaid_${transaction.transaction_id}`,
            plaidId: transaction.transaction_id,
            description: transaction.merchant_name || transaction.name,
            category,
            amount: transaction.amount,
            date: transaction.date,
            autoImported: true,
          });
        }
      } else {
        // Positive amounts are income (money in)
        // Try to match with existing invoices
        const matchingInvoice = invoices.find((inv: any) => 
          Math.abs(inv.amount - Math.abs(transaction.amount)) < 1 && // Within $1
          inv.status === 'pending'
        );
        
        if (matchingInvoice) {
          matchingInvoice.status = 'paid';
          matchingInvoice.paidDate = transaction.date;
          matchingInvoice.paymentMethod = 'bank_transfer';
        }
      }
    });
    
    localStorage.setItem('expenses', JSON.stringify(newExpenses));
    localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your bank account?')) {
      return;
    }
    
    setLoading(true);
    try {
      await fetch(`${API_URL}/plaid/remove_item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default-user' }),
      });
      
      setConnected(false);
      setAccounts([]);
      setTransactions([]);
      alert('Bank account disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect bank account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  if (serverStatus === 'checking') {
    return (
      <div className="data-panel">
        <div className="panel-header">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary btn-sm" style={{ marginRight: '1rem' }}>
            ← Back
          </button>
          <h2>Bank Accounts</h2>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Checking server status...</p>
        </div>
      </div>
    );
  }

  if (serverStatus === 'offline') {
    return (
      <div className="data-panel">
        <div className="panel-header">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary btn-sm" style={{ marginRight: '1rem' }}>
            ← Back
          </button>
          <h2>Bank Accounts</h2>
        </div>
        <div style={{ padding: '2rem' }}>
          <div style={{ 
            background: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{ color: '#856404', marginTop: 0 }}>⚠️ Backend Server Not Running</h3>
            <p style={{ color: '#856404', marginBottom: '1rem' }}>
              The backend server is required for bank integration. Please start it:
            </p>
            <pre style={{ 
              background: '#333', 
              color: '#0f0',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
{`cd ~/Documents/DumpsterTracker/server
npm start`}
            </pre>
            <p style={{ color: '#856404', fontSize: '0.9rem', marginTop: '1rem', marginBottom: 0 }}>
              <strong>First time setup:</strong> Create a <code>.env</code> file with your Plaid credentials (copy from <code>.env.example</code>)
            </p>
          </div>
          <button 
            onClick={checkServerStatus}
            className="btn-primary"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="data-panel">
      <div className="panel-header">
        <button onClick={() => navigate('/dashboard')} className="btn-secondary btn-sm" style={{ marginRight: '1rem' }}>
          ← Back
        </button>
        <h2>Bank Accounts</h2>
        {!connected && (
          <button
            onClick={handleConnectBank}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Connecting...' : '🏦 Connect Bank Account'}
          </button>
        )}
      </div>

      <div className="panel-content">
        {!connected ? (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏦</div>
            <h3>No Bank Account Connected</h3>
            <p style={{ color: '#6c757d', marginBottom: '2rem' }}>
              Connect your bank account to automatically sync transactions,<br />
              track expenses, and match payments to invoices.
            </p>
            <button
              onClick={handleConnectBank}
              className="btn-primary"
              disabled={loading}
              style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            >
              {loading ? 'Connecting...' : 'Connect Bank Account'}
            </button>
            <p style={{ fontSize: '0.85rem', color: '#adb5bd', marginTop: '1rem' }}>
              🔒 Secured by Plaid - used by millions of apps
            </p>
          </div>
        ) : (
          <>
            {/* Connected Accounts */}
            <div className="section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Connected Accounts</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={syncTransactions}
                    className="btn-primary btn-sm"
                    disabled={syncing}
                  >
                    {syncing ? 'Syncing...' : '🔄 Sync Transactions'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="btn-danger btn-sm"
                    disabled={loading}
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {lastSyncTime && (
                <p style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '1rem' }}>
                  Last synced: {lastSyncTime.toLocaleString()}
                </p>
              )}

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account Name</th>
                    <th>Type</th>
                    <th>Available Balance</th>
                    <th>Current Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(account => (
                    <tr key={account.account_id}>
                      <td>
                        <strong>{account.official_name || account.name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-primary">
                          {account.subtype}
                        </span>
                      </td>
                      <td className="fw-bold">
                        ${account.balances.available?.toFixed(2) || '—'}
                      </td>
                      <td className="fw-bold">
                        ${account.balances.current?.toFixed(2) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recent Transactions */}
            {transactions.length > 0 && (
              <div className="section" style={{ marginTop: '2rem' }}>
                <h3>Recent Transactions (Last 30 Days)</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 50).map(transaction => (
                      <tr key={transaction.transaction_id}>
                        <td>{transaction.date}</td>
                        <td>
                          <strong>{transaction.merchant_name || transaction.name}</strong>
                        </td>
                        <td>
                          <span className="badge badge-secondary">
                            {transaction.category?.[0] || 'Other'}
                          </span>
                        </td>
                        <td 
                          className="fw-bold"
                          style={{ 
                            color: transaction.amount > 0 ? '#dc3545' : '#28a745' 
                          }}
                        >
                          {transaction.amount > 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                        </td>
                        <td>
                          {transaction.pending ? (
                            <span className="badge badge-warning">Pending</span>
                          ) : (
                            <span className="badge badge-success">Posted</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {transactions.length === 0 && (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginTop: '1rem'
              }}>
                <p style={{ color: '#6c757d' }}>
                  No transactions yet. Click "Sync Transactions" to fetch data.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
