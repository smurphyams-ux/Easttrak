import React from 'react';
import { useNavigate } from 'react-router-dom';
import './DataPanel.css';

export default function QRScanScreen() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <button onClick={() => navigate('/stop-details')} className="back-btn">← Back</button>
        <h1>QR Scanner</h1>
      </header>
      
      <div className="dashboard-content">
        <div className="scanner-placeholder">
          <div className="scanner-box">
            <p>📷</p>
            <p>QR Scanner (Web Camera Integration)</p>
            <p className="note">Requires camera permission</p>
            <input 
              type="text" 
              placeholder="Or enter code manually" 
              className="manual-input"
            />
            <button className="action-btn">Submit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
