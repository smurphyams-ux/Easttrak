import React from 'react';

const DashboardScreen: React.FC = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', color: '#2563eb', marginBottom: '1rem' }}>Welcome to EasyTrak Dashboard</h1>
      <p style={{ fontSize: '1.25rem', color: '#555' }}>
        This is your main dashboard. Add widgets, stats, and navigation here.
      </p>
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
        <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '1rem', minWidth: '200px' }}>
          <h2 style={{ color: '#16a34a', fontSize: '1.5rem' }}>Active Routes</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>5</p>
        </div>
        <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '1rem', minWidth: '200px' }}>
          <h2 style={{ color: '#0ea5e9', fontSize: '1.5rem' }}>Customers</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>12</p>
        </div>
        <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '1rem', minWidth: '200px' }}>
          <h2 style={{ color: '#f59e42', fontSize: '1.5rem' }}>Fleet</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>3</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
