import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './DataPanel.css';

export default function StopDetailsScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get stop details from URL parameters or use defaults
  const stopName = searchParams.get('name') || 'ABC Company';
  const stopAddress = searchParams.get('address') || '123 Main St';
  const stopId = searchParams.get('id') || '#12345';
  const stopStatus = searchParams.get('status') || 'Scheduled';

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <button onClick={() => navigate('/route')} className="back-btn">← Back</button>
        <h1>Stop Details</h1>
      </header>
      
      <div className="dashboard-content">
        <div className="details-card">
          <h2>{stopName}</h2>
          <p><strong>Address:</strong> {stopAddress}</p>
          <p><strong>Dumpster ID:</strong> {stopId}</p>
          <p><strong>Status:</strong> {stopStatus}</p>
          <p><strong>Notes:</strong> Regular pickup - weekly schedule</p>
          
          <div className="action-buttons">
            <button className="action-btn" onClick={() => navigate('/qr-scan')}>
              Scan QR Code
            </button>
            <button className="action-btn secondary">
              Mark Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
