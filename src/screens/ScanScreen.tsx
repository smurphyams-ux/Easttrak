import React from 'react';
import { useNavigate } from 'react-router-dom';
import './DataPanel.css';

export default function ScanScreen() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">← Back</button>
        <h1>Scan</h1>
      </header>
      
      <div className="dashboard-content">
        <div className="scanner-placeholder">
          <div className="scanner-box">
            <p>📷</p>
            <p>Barcode/QR Scanner</p>
            <p className="note">Use camera to scan codes</p>
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
