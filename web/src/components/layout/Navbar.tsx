import React from 'react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex space-x-4">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/containers" className="nav-link">Containers</Link>
            <Link to="/routes" className="nav-link">Routes</Link>
            <Link to="/customers" className="nav-link">Customers</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};