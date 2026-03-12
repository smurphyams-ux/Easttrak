import React from 'react';
import { useNavigate } from 'react-router-dom';
import './DataPanel.css';

export default function RouteScreen() {
  const navigate = useNavigate();

  const stops = [
    { id: '12345', name: 'ABC Company', address: '123 Main St', status: 'Scheduled' },
    { id: '12346', name: 'XYZ Corp', address: '456 Oak Ave', status: 'Scheduled' },
    { id: '12347', name: '123 Industries', address: '789 Elm Blvd', status: 'In Progress' },
  ];

  const handleStopClick = (stop: typeof stops[0]) => {
    navigate(`/stop-details?name=${encodeURIComponent(stop.name)}&address=${encodeURIComponent(stop.address)}&id=${stop.id}&status=${stop.status}`);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">← Back</button>
        <h1>Route</h1>
      </header>
      
      <div className="dashboard-content">
        <div className="route-list">
          {stops.map((stop, index) => (
            <div 
              key={stop.id} 
              className="route-item" 
              onClick={() => handleStopClick(stop)}
            >
              <h3>Stop {index + 1}: {stop.name}</h3>
              <p>{stop.address}</p>
              <span className={`status ${stop.status.toLowerCase().replace(' ', '-')}`}>
                {stop.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
