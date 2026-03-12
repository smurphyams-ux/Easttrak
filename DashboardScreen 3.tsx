import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './DashboardScreen.css';

interface StatCard {
  title: string;
  value: number;
  change: number;
  icon: string;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'pickup' | 'delivery' | 'maintenance' | 'invoice';
  description: string;
  time: string;
  status: 'completed' | 'pending' | 'in-progress';
}

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setStats([
        { title: 'Active Routes', value: 12, change: 8.2, icon: '🚚', color: '#007bff' },
        { title: 'Total Customers', value: 248, change: 12.5, icon: '👥', color: '#28a745' },
        { title: 'Fleet Vehicles', value: 18, change: 0, icon: '🚛', color: '#ffc107' },
        { title: 'Revenue (MTD)', value: 45280, change: 15.3, icon: '💰', color: '#17a2b8' },
      ]);

      setActivities([
        { id: '1', type: 'pickup', description: 'Pickup completed at ABC Company', time: '10 mins ago', status: 'completed' },
        { id: '2', type: 'delivery', description: 'New dumpster delivered to XYZ Corp', time: '25 mins ago', status: 'completed' },
        { id: '3', type: 'maintenance', description: 'Truck #12 scheduled for maintenance', time: '1 hour ago', status: 'pending' },
        { id: '4', type: 'invoice', description: 'Invoice #INV-1234 sent to customer', time: '2 hours ago', status: 'in-progress' },
        { id: '5', type: 'pickup', description: 'Route optimization completed', time: '3 hours ago', status: 'completed' },
      ]);

      setLoading(false);
    }, 100);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🗑️ Dumpster Tracker</h1>
          <p className="text-muted">Welcome back, {user?.name}!</p>
        </div>
        <div className="header-right">
          <button className="btn-icon" title="Notifications">
            <span className="notification-badge">3</span>
            🔔
          </button>
          <div className="user-menu">
            <button className="user-avatar" onClick={handleLogout}>
              {user?.name.charAt(0)}
            </button>
            <span className="user-role badge badge-primary">{user?.role}</span>
          </div>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Stats Grid */}
        <div className="stats-grid fade-in">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
              <div className="stat-icon" style={{ backgroundColor: stat.color + '20', color: stat.color }}>
                {stat.icon}
              </div>
              <div className="stat-content">
                <p className="stat-title">{stat.title}</p>
                <h2 className="stat-value">
                  {stat.title.includes('Revenue') ? formatCurrency(stat.value) : stat.value.toLocaleString()}
                </h2>
                <p className="stat-change">
                  <span className={stat.change > 0 ? 'text-success' : stat.change < 0 ? 'text-danger' : 'text-muted'}>
                    {stat.change > 0 ? '↑' : stat.change < 0 ? '↓' : '→'} {Math.abs(stat.change)}%
                  </span>
                  <span className="text-muted"> vs last month</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Quick Actions */}
          <section className="quick-actions card fade-in">
            <h3 className="section-title">Quick Actions</h3>
            <div className="action-grid">
              <button className="action-btn" onClick={() => navigate('/customers')}>
                <span className="action-icon">👥</span>
                <span className="action-label">Customers</span>
                <span className="action-count">248</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/fleet')}>
                <span className="action-icon">🚚</span>
                <span className="action-label">Fleet</span>
                <span className="action-count">18</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/invoices')}>
                <span className="action-icon">📄</span>
                <span className="action-label">Invoices</span>
                <span className="action-count">52</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/route')}>
                <span className="action-icon">🗺️</span>
                <span className="action-label">Routes</span>
                <span className="action-count">12</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/scan')}>
                <span className="action-icon">📷</span>
                <span className="action-label">Scan QR</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/reports')}>
                <span className="action-icon">📊</span>
                <span className="action-label">Reports</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/bank')}>
                <span className="action-icon">🏦</span>
                <span className="action-label">Bank Accounts</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/deliveries')}>
                <span className="action-icon">📅</span>
                <span className="action-label">Deliveries</span>
              </button>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="recent-activity card fade-in">
            <h3 className="section-title">Recent Activity</h3>
            <div className="activity-list">
              {activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon" style={{
                    backgroundColor: activity.type === 'pickup' ? '#28a74520' :
                                    activity.type === 'delivery' ? '#007bff20' :
                                    activity.type === 'maintenance' ? '#ffc10720' : '#17a2b820',
                    color: activity.type === 'pickup' ? '#28a745' :
                          activity.type === 'delivery' ? '#007bff' :
                          activity.type === 'maintenance' ? '#ffc107' : '#17a2b8'
                  }}>
                    {activity.type === 'pickup' ? '📦' :
                     activity.type === 'delivery' ? '🚚' :
                     activity.type === 'maintenance' ? '🔧' : '💰'}
                  </div>
                  <div className="activity-content">
                    <p className="activity-description">{activity.description}</p>
                    <p className="activity-time text-muted">{activity.time}</p>
                  </div>
                  <span className={`badge badge-${
                    activity.status === 'completed' ? 'success' :
                    activity.status === 'pending' ? 'warning' : 'info'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
