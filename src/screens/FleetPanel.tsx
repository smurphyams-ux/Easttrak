import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DataPanel.css';

interface Vehicle {
  id: string;
  type: string;
  driver: string;
  status: 'active' | 'maintenance' | 'inactive';
  licensePlate: string;
  year: number;
}

export default function FleetPanel() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  // Load vehicles from localStorage or use default data
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('vehicles');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: 'TRUCK-001', type: 'Garbage Truck', driver: 'John Doe', status: 'active', licensePlate: 'ABC-1234', year: 2020 },
      { id: 'TRUCK-002', type: 'Garbage Truck', driver: 'Jane Smith', status: 'active', licensePlate: 'XYZ-5678', year: 2021 },
      { id: 'TRUCK-003', type: 'Roll-Off Truck', driver: 'Mike Johnson', status: 'maintenance', licensePlate: 'DEF-9012', year: 2019 },
    ];
  });

  // Save vehicles to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  const [newVehicle, setNewVehicle] = useState({
    type: '',
    driver: '',
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    licensePlate: '',
    year: new Date().getFullYear()
  });

  const handleAddVehicle = () => {
    if (!newVehicle.type || !newVehicle.driver || !newVehicle.licensePlate) {
      alert('Please fill in all required fields');
      return;
    }

    const vehicle: Vehicle = {
      id: `TRUCK-${String(vehicles.length + 1).padStart(3, '0')}`,
      type: newVehicle.type,
      driver: newVehicle.driver,
      status: newVehicle.status,
      licensePlate: newVehicle.licensePlate,
      year: newVehicle.year
    };

    setVehicles([...vehicles, vehicle]);
    setShowModal(false);
    setNewVehicle({
      type: '',
      driver: '',
      status: 'active',
      licensePlate: '',
      year: new Date().getFullYear()
    });
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setNewVehicle({
      type: vehicle.type,
      driver: vehicle.driver,
      status: vehicle.status,
      licensePlate: vehicle.licensePlate,
      year: vehicle.year
    });
    setShowModal(true);
  };

  const handleSaveEdit = () => {
    if (!newVehicle.type || !newVehicle.driver || !newVehicle.licensePlate) {
      alert('Please fill in all required fields');
      return;
    }

    const updatedVehicles = vehicles.map(v =>
      v.id === editingVehicle?.id
        ? {
            ...v,
            type: newVehicle.type,
            driver: newVehicle.driver,
            status: newVehicle.status,
            licensePlate: newVehicle.licensePlate,
            year: newVehicle.year
          }
        : v
    );

    setVehicles(updatedVehicles);
    setShowModal(false);
    setEditingVehicle(null);
    setNewVehicle({
      type: '',
      driver: '',
      status: 'active',
      licensePlate: '',
      year: new Date().getFullYear()
    });
  };

  const handleStatusChange = (vehicleId: string, newStatus: 'active' | 'maintenance' | 'inactive') => {
    const updatedVehicles = vehicles.map(v => 
      v.id === vehicleId ? { ...v, status: newStatus } : v
    );
    setVehicles(updatedVehicles);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
    setNewVehicle({
      type: '',
      driver: '',
      status: 'active',
      licensePlate: '',
      year: new Date().getFullYear()
    });
  };

  return (
    <div className="data-panel">
      <header className="panel-header">
        <div className="header-left">
          <img src="/EZTrakLogo-fancy.svg" alt="EZTrak Logo" style={{ width: 140, height: 35, marginBottom: 8 }} />
          <button onClick={() => navigate('/dashboard')} className="back-btn">← Back</button>
          <h1>Fleet Management</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Vehicle</button>
      </header>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Total Vehicles</div>
          <div className="stat-value">{vehicles.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value text-success">{vehicles.filter(v => v.status === 'active').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Maintenance</div>
          <div className="stat-value text-warning">{vehicles.filter(v => v.status === 'maintenance').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inactive</div>
          <div className="stat-value text-danger">{vehicles.filter(v => v.status === 'inactive').length}</div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Type</th>
              <th>Driver</th>
              <th>License Plate</th>
              <th>Year</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(vehicle => (
              <tr key={vehicle.id}>
                <td className="fw-bold">{vehicle.id}</td>
                <td>{vehicle.type}</td>
                <td>{vehicle.driver}</td>
                <td>{vehicle.licensePlate}</td>
                <td>{vehicle.year}</td>
                <td>
                  <select
                    value={vehicle.status}
                    onChange={(e) => handleStatusChange(vehicle.id, e.target.value as any)}
                    className={`badge badge-${
                      vehicle.status === 'active' ? 'success' : 
                      vehicle.status === 'maintenance' ? 'warning' : 
                      'danger'
                    }`}
                    style={{
                      padding: '0.4rem 0.6rem',
                      border: 'none',
                      borderRadius: 'var(--border-radius)',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </td>
                <td>
                  <button 
                    className="btn-sm btn-primary" 
                    onClick={() => handleEditVehicle(vehicle)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-sm btn-danger" 
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Vehicle Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Trailer Type *</label>
                <select
                  value={newVehicle.type}
                  onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })}
                >
                  <option value="">Select trailer type</option>
                  <option value="DUMP 10 CYD">DUMP 10 CYD</option>
                  <option value="DUMP 20 CYD">DUMP 20 CYD</option>
                  <option value="DUMP 30 CYD">DUMP 30 CYD</option>
                  <option value="PULL-OUT 10 CYD">PULL-OUT 10 CYD</option>
                  <option value="PULL-OUT 20 CYD">PULL-OUT 20 CYD</option>
                  <option value="PULL-OUT-30 CYD">PULL-OUT-30 CYD</option>
                  <option value="ROLL-OFF 16 CYD">ROLL-OFF 16 CYD</option>
                </select>
              </div>

              <div className="form-group">
                <label>Driver Name *</label>
                <input
                  type="text"
                  value={newVehicle.driver}
                  onChange={(e) => setNewVehicle({ ...newVehicle, driver: e.target.value })}
                  placeholder="Enter driver name"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>License Plate *</label>
                  <input
                    type="text"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })}
                    placeholder="ABC-1234"
                  />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    min="1990"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={newVehicle.status}
                  onChange={(e) => setNewVehicle({ ...newVehicle, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleCloseModal} className="btn-secondary">Cancel</button>
              <button 
                onClick={editingVehicle ? handleSaveEdit : handleAddVehicle} 
                className="btn-primary"
              >
                {editingVehicle ? 'Save Changes' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
